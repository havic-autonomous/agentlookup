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

// CrewAI configuration schema
const CrewAIConfigSchema = z.object({
  role: z.string().min(1, 'Agent role is required'),
  goal: z.string().optional(),
  backstory: z.string().optional(),
  tools: z.array(z.string()).default([]),
  llm: z.string().optional(),
  // Additional fields that might be in CrewAI configs
  name: z.string().optional(),
  max_execution_time: z.number().optional(),
  verbose: z.boolean().optional(),
  allow_delegation: z.boolean().optional(),
  step_callback: z.string().optional(),
  crew: z.object({
    name: z.string(),
    description: z.string().optional(),
    agents: z.array(z.any()).optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`import_crewai_${clientIp}`);
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
    const validatedData = CrewAIConfigSchema.parse(body);
    
    const db = getDatabase();
    
    // Determine agent name - use explicit name or derive from role
    const agentName = validatedData.name || validatedData.role;
    const slug = generateSlug(agentName);
    
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
    const bio = validatedData.backstory || 
                validatedData.goal || 
                `CrewAI agent with role: ${validatedData.role}`;
    
    db.prepare(`
      INSERT INTO agents (
        id, slug, name, role, bio, avatar_url, model, framework,
        active_since, org_id, owner_id, verified, status, api_version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'v1', datetime('now'), datetime('now'))
    `).run(
      agentId,
      slug,
      agentName,
      validatedData.role,
      bio,
      null,  // No default avatar for CrewAI imports
      validatedData.llm || 'CrewAI Agent',
      'CrewAI',
      new Date().toISOString().split('T')[0],
      orgId,
      operatorId,
      0  // Not verified by default for imported agents
    );
    
    // Parse capabilities from tools and role
    const capabilities: string[] = [];
    
    // Add capabilities based on tools
    const toolCapabilityMap: { [key: string]: string } = {
      'web_search': 'Web Search',
      'file_reader': 'File Analysis',
      'code_execution': 'Code Execution', 
      'data_analysis': 'Data Analysis',
      'scraper': 'Web Scraping',
      'database': 'Database Operations',
      'email': 'Email Communication',
      'calculator': 'Mathematical Computing'
    };
    
    for (const tool of validatedData.tools) {
      const capability = toolCapabilityMap[tool.toLowerCase()] || 
                        tool.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!capabilities.includes(capability)) {
        capabilities.push(capability);
      }
    }
    
    // Add role-based capabilities
    const roleCapabilities = validatedData.role.toLowerCase();
    if (roleCapabilities.includes('research')) capabilities.push('Research');
    if (roleCapabilities.includes('analyst')) capabilities.push('Data Analysis');
    if (roleCapabilities.includes('writer')) capabilities.push('Content Creation');
    if (roleCapabilities.includes('developer') || roleCapabilities.includes('coder')) capabilities.push('Software Development');
    if (roleCapabilities.includes('manager')) capabilities.push('Project Management');
    
    // Add capabilities to database
    if (capabilities.length > 0) {
      const capabilityStmt = db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)');
      for (const capability of capabilities) {
        capabilityStmt.run(agentId, capability);
      }
    }
    
    // Add tech stack
    const techStmt = db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)');
    techStmt.run(agentId, 'CrewAI');
    
    // Add LLM to tech stack if specified
    if (validatedData.llm) {
      techStmt.run(agentId, validatedData.llm);
    }
    
    // Add tools as tech stack
    for (const tool of validatedData.tools) {
      techStmt.run(agentId, tool);
    }
    
    // Store original config as metadata
    const metadata = {
      source: 'crewai_import',
      goal: validatedData.goal,
      backstory: validatedData.backstory,
      tools: validatedData.tools,
      llm: validatedData.llm,
      crew: validatedData.crew,
      max_execution_time: validatedData.max_execution_time,
      verbose: validatedData.verbose,
      allow_delegation: validatedData.allow_delegation,
      imported_at: new Date().toISOString()
    };
    
    db.prepare(`
      INSERT INTO agent_activity (agent_id, type, title, description, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      agentId,
      'import',
      'Imported from CrewAI',
      `Agent configuration imported from CrewAI framework with role: ${validatedData.role}`,
      JSON.stringify(metadata)
    );
    
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
      `${agentName} API Key`,
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
        framework: 'CrewAI',
        import_type: 'agent_config',
        next_steps: [
          'Save your API key securely',
          'Add AgentLookup profile URL to your CrewAI agent description',
          'Consider setting up webhooks for activity updates'
        ],
        crew_info: validatedData.crew ? {
          name: validatedData.crew.name,
          description: validatedData.crew.description
        } : null
      }
    };
    
    return createSuccessResponse(response);
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('CrewAI import error:', error);
    return createErrorResponse('internal_error', 'Failed to import CrewAI agent', 500);
  }
}