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

// Generic import schema - very flexible
const GenericConfigSchema = z.object({
  // Required fields
  name: z.string().min(1, 'Agent name is required'),
  description: z.string().min(1, 'Agent description is required'),
  
  // Optional but recommended fields
  role: z.string().optional(),
  framework: z.string().optional(),
  model: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  
  // Contact and metadata
  avatar_url: z.string().url().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  github: z.string().optional(),
  
  // Any additional metadata
  metadata: z.record(z.string(), z.any()).optional(),
  
  // Allow any additional fields for flexibility
  // The schema will pass through unknown fields
}).passthrough();

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`import_generic_${clientIp}`);
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
    const validatedData = GenericConfigSchema.parse(body);
    
    const db = getDatabase();
    
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
    const role = validatedData.role || 'AI Agent';
    const framework = validatedData.framework || 'Generic';
    const model = validatedData.model || 'Generic Agent';
    
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
      validatedData.description,
      validatedData.avatar_url,
      model,
      framework,
      new Date().toISOString().split('T')[0],
      orgId,
      operatorId,
      0  // Not verified by default for imported agents
    );
    
    // Parse capabilities - best effort from various sources
    const allCapabilities = new Set<string>();
    
    // Add explicit capabilities
    for (const cap of validatedData.capabilities) {
      allCapabilities.add(cap);
    }
    
    // Derive capabilities from tools
    const toolCapabilityMap: { [key: string]: string } = {
      'search': 'Web Search',
      'web': 'Web Search',
      'browser': 'Web Browsing',
      'calculator': 'Mathematical Computing',
      'math': 'Mathematical Computing',
      'code': 'Code Execution',
      'python': 'Python Programming',
      'javascript': 'JavaScript Programming',
      'sql': 'Database Operations',
      'database': 'Database Operations',
      'file': 'File Operations',
      'document': 'Document Processing',
      'image': 'Image Processing',
      'vision': 'Computer Vision',
      'api': 'API Integration',
      'email': 'Email Communication',
      'chat': 'Conversation',
      'translation': 'Language Translation',
      'nlp': 'Natural Language Processing',
      'ml': 'Machine Learning',
      'data': 'Data Analysis'
    };
    
    for (const tool of validatedData.tools) {
      const toolLower = tool.toLowerCase();
      for (const [key, capability] of Object.entries(toolCapabilityMap)) {
        if (toolLower.includes(key)) {
          allCapabilities.add(capability);
        }
      }
      
      // Fallback: convert tool name to capability
      const fallbackCapability = tool.split(/[-_\s]/).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      allCapabilities.add(fallbackCapability);
    }
    
    // Derive capabilities from description and role
    const textToAnalyze = `${validatedData.description} ${role}`.toLowerCase();
    
    const descriptionCapabilities: { [key: string]: string } = {
      'research': 'Research',
      'analysis': 'Data Analysis', 
      'writing': 'Content Creation',
      'content': 'Content Creation',
      'translation': 'Language Translation',
      'customer service': 'Customer Support',
      'support': 'Customer Support',
      'coding': 'Software Development',
      'development': 'Software Development',
      'programming': 'Software Development',
      'design': 'Design',
      'marketing': 'Marketing',
      'sales': 'Sales',
      'management': 'Project Management',
      'planning': 'Strategic Planning',
      'finance': 'Financial Analysis',
      'accounting': 'Financial Analysis',
      'education': 'Education & Training',
      'teaching': 'Education & Training',
      'healthcare': 'Healthcare',
      'legal': 'Legal Research'
    };
    
    for (const [keyword, capability] of Object.entries(descriptionCapabilities)) {
      if (textToAnalyze.includes(keyword)) {
        allCapabilities.add(capability);
      }
    }
    
    // Add capabilities to database
    if (allCapabilities.size > 0) {
      const capabilityStmt = db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)');
      for (const capability of allCapabilities) {
        capabilityStmt.run(agentId, capability);
      }
    }
    
    // Add tech stack
    const techStmt = db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)');
    
    // Add framework
    techStmt.run(agentId, framework);
    
    // Add model if different from framework
    if (model && model !== framework && model !== 'Generic Agent') {
      techStmt.run(agentId, model);
    }
    
    // Add tools as tech stack
    for (const tool of validatedData.tools) {
      techStmt.run(agentId, tool);
    }
    
    // Try to infer additional tech stack from metadata
    if (validatedData.metadata) {
      const metadataStr = JSON.stringify(validatedData.metadata).toLowerCase();
      const techKeywords = ['python', 'javascript', 'nodejs', 'react', 'vue', 'angular', 'docker', 'kubernetes', 'aws', 'gcp', 'azure'];
      
      for (const tech of techKeywords) {
        if (metadataStr.includes(tech)) {
          techStmt.run(agentId, tech.toUpperCase());
        }
      }
    }
    
    // Add languages
    if (validatedData.languages.length > 0) {
      const langStmt = db.prepare('INSERT INTO agent_languages (agent_id, language) VALUES (?, ?)');
      for (const language of validatedData.languages) {
        langStmt.run(agentId, language);
      }
    }
    
    // Add contacts
    const contacts = [];
    if (validatedData.email) contacts.push({ type: 'Email', value: validatedData.email });
    if (validatedData.website) contacts.push({ type: 'Website', value: validatedData.website });
    if (validatedData.github) contacts.push({ type: 'GitHub', value: validatedData.github });
    
    if (contacts.length > 0) {
      const contactStmt = db.prepare('INSERT INTO agent_contacts (agent_id, type, value) VALUES (?, ?, ?)');
      for (const contact of contacts) {
        contactStmt.run(agentId, contact.type, contact.value);
      }
    }
    
    // Store original config as metadata
    const activityMetadata = {
      source: 'generic_import',
      original_config: validatedData,
      imported_at: new Date().toISOString(),
      capabilities_detected: Array.from(allCapabilities),
      tools_processed: validatedData.tools
    };
    
    db.prepare(`
      INSERT INTO agent_activity (agent_id, type, title, description, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      agentId,
      'import',
      'Imported via Generic Import',
      `Agent configuration imported from ${framework} with auto-detected capabilities`,
      JSON.stringify(activityMetadata)
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
        GROUP_CONCAT(DISTINCT ats.technology) as tech_stack,
        GROUP_CONCAT(DISTINCT al.language) as languages
      FROM agents a
      LEFT JOIN organizations o ON a.org_id = o.id
      LEFT JOIN agent_capabilities ac ON a.id = ac.agent_id
      LEFT JOIN agent_tech_stack ats ON a.id = ats.agent_id
      LEFT JOIN agent_languages al ON a.id = al.agent_id
      WHERE a.id = ?
      GROUP BY a.id
    `).get(agentId) as any;
    
    // Get contacts
    const contacts_result = db.prepare(`
      SELECT type, value FROM agent_contacts WHERE agent_id = ?
    `).all(agentId) as any[];
    
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
        languages: createdAgent.languages ? createdAgent.languages.split(',') : [],
        contacts: contacts_result,
        org: createdAgent.org_name ? {
          name: createdAgent.org_name,
          slug: createdAgent.org_slug
        } : null,
        created_at: createdAgent.created_at
      },
      api_key: apiKey,
      integration: {
        framework: 'Generic Import',
        import_type: 'custom',
        next_steps: [
          'Save your API key securely',
          'Review the auto-detected capabilities and update if needed',
          'Add more portfolio items and documentation',
          'Set up activity webhooks for status updates'
        ],
        auto_detection: {
          capabilities_found: Array.from(allCapabilities),
          tech_stack_inferred: framework !== 'Generic',
          contacts_added: contacts.length
        }
      }
    };
    
    return createSuccessResponse(response);
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('Generic import error:', error);
    return createErrorResponse('internal_error', 'Failed to import agent', 500);
  }
}