import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware, generateApiKey } from '@/lib/auth';
import { generateSlug } from '@/lib/schemas';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  unauthorizedResponse, 
  validationErrorResponse, 
  rateLimitResponse, 
  getClientIp 
} from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// OpenClaw configuration schema
const OpenClawConfigSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  model: z.string().optional(),
  workspace: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  description: z.string().optional(),
  role: z.string().optional(),
  avatar_url: z.string().url().optional(),
  framework: z.string().default('OpenClaw'),
  // Additional OpenClaw specific fields
  config: z.object({
    tools: z.array(z.string()).optional(),
    exec_policy: z.string().optional(),
    session_type: z.string().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`import_openclaw_${clientIp}`);
  if (!rateLimitCheck.allowed) {
    return rateLimitResponse(rateLimitCheck.retryAfter!);
  }
  
  // Authentication
  const auth = authMiddleware(request);
  if (!auth) {
    return unauthorizedResponse();
  }
  
  // Check permissions
  if (!auth.scopes?.includes('agent:write') && !auth.scopes?.includes('all')) {
    return createErrorResponse('forbidden', 'Insufficient permissions for agent import', 403);
  }
  
  try {
    const body = await request.json();
    const validatedData = OpenClawConfigSchema.parse(body);
    
    const db = getDatabase();
    
    // Generate slug from name
    const slug = generateSlug(validatedData.name);
    
    // Check if agent with this slug already exists
    const existingAgent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug);
    if (existingAgent) {
      return createErrorResponse('conflict', `Agent with slug '${slug}' already exists`, 409);
    }
    
    // Get operator info
    const operatorId = auth.type === 'session' ? auth.user!.id : auth.operator_id!;
    
    // Get operator's organization (create default if none)
    let orgId = null;
    if (auth.type === 'session') {
      const userOrg = db.prepare(`
        SELECT id FROM organizations WHERE owner_id = ? LIMIT 1
      `).get(auth.user!.id) as any;
      
      if (!userOrg) {
        // Create a default organization for the user
        orgId = uuidv4();
        db.prepare(`
          INSERT INTO organizations (
            id, slug, name, tagline, description, owner_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          orgId,
          generateSlug(`${auth.user!.name || auth.user!.email.split('@')[0]}-agents`),
          `${auth.user!.name || auth.user!.email.split('@')[0]} Agents`,
          'Personal agent collection',
          'Collection of imported and custom agents',
          auth.user!.id
        );
      } else {
        orgId = userOrg.id;
      }
    }
    
    // Create agent
    const agentId = uuidv4();
    const role = validatedData.role || 'AI Assistant';
    const bio = validatedData.description || `OpenClaw agent specialized in ${validatedData.capabilities.join(', ')}`;
    
    db.prepare(`
      INSERT INTO agents (
        id, slug, name, role, bio, avatar_url, model, framework,
        active_since, org_id, owner_id, verified, status, api_version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'v1', datetime('now'), datetime('now'))
    `).run(
      agentId,
      slug,
      validatedData.name,
      role,
      bio,
      validatedData.avatar_url,
      validatedData.model || 'OpenClaw Agent',
      validatedData.framework,
      new Date().toISOString().split('T')[0],
      orgId,
      operatorId,
      0  // Not verified by default for imported agents
    );
    
    // Add capabilities
    if (validatedData.capabilities.length > 0) {
      const capabilityStmt = db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)');
      for (const capability of validatedData.capabilities) {
        capabilityStmt.run(agentId, capability);
      }
    }
    
    // Add OpenClaw as tech stack
    const techStmt = db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)');
    techStmt.run(agentId, 'OpenClaw');
    
    // Add model to tech stack if specified
    if (validatedData.model) {
      techStmt.run(agentId, validatedData.model);
    }
    
    // Add tools from config as additional tech stack
    if (validatedData.config?.tools) {
      for (const tool of validatedData.config.tools) {
        techStmt.run(agentId, tool);
      }
    }
    
    // Store original config as metadata
    if (validatedData.config || validatedData.workspace) {
      const metadata = {
        source: 'openclaw_import',
        workspace: validatedData.workspace,
        config: validatedData.config,
        imported_at: new Date().toISOString()
      };
      
      db.prepare(`
        INSERT INTO agent_activity (agent_id, type, title, description, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(
        agentId,
        'import',
        'Imported from OpenClaw',
        `Agent configuration imported from OpenClaw framework`,
        JSON.stringify(metadata)
      );
    }
    
    // Generate API key for the new agent
    const { key: apiKey, hash: keyHash, prefix: keyPrefix } = generateApiKey();
    const apiKeyId = uuidv4();
    
    db.prepare(`
      INSERT INTO api_keys (
        id, key_hash, key_prefix, name, operator_id, agent_id, scopes, 
        expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+1 year'), datetime('now'))
    `).run(
      apiKeyId,
      keyHash,
      keyPrefix,
      `${validatedData.name} API Key`,
      operatorId,
      agentId,
      JSON.stringify(['agent:read', 'agent:write'])
    );
    
    // Fetch the created agent with relations
    const createdAgent = db.prepare(`
      SELECT 
        a.*,
        o.name as org_name,
        o.slug as org_slug,
        GROUP_CONCAT(DISTINCT ac.capability) as capabilities,
        GROUP_CONCAT(DISTINCT ats.technology) as tech_stack
      FROM agents a
      LEFT JOIN organizations o ON a.org_id = o.id
      LEFT JOIN agent_capabilities ac ON a.id = ac.agent_id
      LEFT JOIN agent_tech_stack ats ON a.id = ats.agent_id
      WHERE a.id = ?
      GROUP BY a.id
    `).get(agentId) as any;
    
    // Format response
    const response = {
      agent: {
        id: createdAgent.id,
        slug: createdAgent.slug,
        name: createdAgent.name,
        role: createdAgent.role,
        bio: createdAgent.bio,
        avatar_url: createdAgent.avatar_url,
        model: createdAgent.model,
        framework: createdAgent.framework,
        verified: createdAgent.verified === 1,
        capabilities: createdAgent.capabilities ? createdAgent.capabilities.split(',') : [],
        tech_stack: createdAgent.tech_stack ? createdAgent.tech_stack.split(',') : [],
        org: createdAgent.org_name ? {
          name: createdAgent.org_name,
          slug: createdAgent.org_slug
        } : null,
        created_at: createdAgent.created_at
      },
      api_key: apiKey,
      integration: {
        framework: 'OpenClaw',
        import_type: 'config',
        next_steps: [
          'Save your API key securely',
          'Update your agent configuration with the new profile URL',
          'Test the integration using the provided endpoints'
        ]
      }
    };
    
    return createSuccessResponse(response);
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('OpenClaw import error:', error);
    return createErrorResponse('internal_error', 'Failed to import OpenClaw agent', 500);
  }
}