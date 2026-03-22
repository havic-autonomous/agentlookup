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

// LangChain configuration schema
const LangChainConfigSchema = z.object({
  // Common LangChain agent fields
  agent_type: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  tools: z.array(z.string()).default([]),
  model: z.string().optional(),
  llm: z.string().optional(), // Alternative field name
  
  // LangChain specific configuration
  memory: z.object({
    type: z.string().optional(),
    k: z.number().optional()
  }).optional(),
  
  prompt_template: z.string().optional(),
  max_iterations: z.number().optional(),
  early_stopping_method: z.string().optional(),
  
  // Chain specific fields
  chain_type: z.string().optional(),
  retriever: z.object({
    type: z.string(),
    config: z.any()
  }).optional(),
  
  // Agent executor fields
  verbose: z.boolean().optional(),
  return_intermediate_steps: z.boolean().optional(),
  max_execution_time: z.number().optional(),
  
  // Custom fields for different LangChain patterns
  agent_kwargs: z.any().optional(),
  callbacks: z.array(z.string()).optional()
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`import_langchain_${clientIp}`);
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
    const validatedData = LangChainConfigSchema.parse(body);
    
    const db = getDatabase();
    
    // Determine agent name and role
    const agentName = validatedData.name || 
                     validatedData.agent_type || 
                     validatedData.chain_type || 
                     'LangChain Agent';
    
    const agentRole = validatedData.agent_type || 
                     validatedData.chain_type || 
                     'LangChain Agent';
    
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
    const bio = validatedData.description || 
                `LangChain ${agentRole} with specialized tools and capabilities`;
    
    const modelName = validatedData.model || validatedData.llm || 'LangChain Agent';
    
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
      agentRole,
      bio,
      null,  // No default avatar for LangChain imports
      modelName,
      'LangChain',
      new Date().toISOString().split('T')[0],
      orgId,
      operatorId,
      0  // Not verified by default for imported agents
    );
    
    // Parse capabilities from tools and agent type
    const capabilities: string[] = [];
    
    // Tool-based capabilities
    const toolCapabilityMap: { [key: string]: string } = {
      'search': 'Web Search',
      'calculator': 'Mathematical Computing',
      'python': 'Code Execution',
      'sql': 'Database Operations',
      'retriever': 'Information Retrieval',
      'memory': 'Conversation Memory',
      'file': 'File Operations',
      'api': 'API Integration',
      'browser': 'Web Browsing',
      'email': 'Email Communication'
    };
    
    for (const tool of validatedData.tools) {
      const toolLower = tool.toLowerCase();
      for (const [key, capability] of Object.entries(toolCapabilityMap)) {
        if (toolLower.includes(key) && !capabilities.includes(capability)) {
          capabilities.push(capability);
        }
      }
      
      // Fallback: convert tool name to capability
      const fallbackCapability = tool.split('_').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      if (!capabilities.includes(fallbackCapability)) {
        capabilities.push(fallbackCapability);
      }
    }
    
    // Agent type based capabilities
    if (agentRole) {
      const roleLower = agentRole.toLowerCase();
      if (roleLower.includes('conversational')) capabilities.push('Conversation');
      if (roleLower.includes('retrieval') || roleLower.includes('qa')) capabilities.push('Question Answering');
      if (roleLower.includes('react')) capabilities.push('Reasoning & Acting');
      if (roleLower.includes('structured') || roleLower.includes('openai')) capabilities.push('Structured Output');
      if (roleLower.includes('chat')) capabilities.push('Chat Interface');
    }
    
    // Memory type capabilities
    if (validatedData.memory) {
      capabilities.push('Conversation Memory');
      if (validatedData.memory.type?.includes('summary')) capabilities.push('Conversation Summarization');
    }
    
    // Add capabilities to database
    if (capabilities.length > 0) {
      const capabilityStmt = db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)');
      for (const capability of [...new Set(capabilities)]) { // Remove duplicates
        capabilityStmt.run(agentId, capability);
      }
    }
    
    // Add tech stack
    const techStmt = db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)');
    techStmt.run(agentId, 'LangChain');
    
    // Add model/LLM to tech stack
    if (modelName && modelName !== 'LangChain Agent') {
      techStmt.run(agentId, modelName);
    }
    
    // Add tools as tech stack
    for (const tool of validatedData.tools) {
      techStmt.run(agentId, tool);
    }
    
    // Add memory type if specified
    if (validatedData.memory?.type) {
      techStmt.run(agentId, `Memory: ${validatedData.memory.type}`);
    }
    
    // Add retriever type if specified
    if (validatedData.retriever?.type) {
      techStmt.run(agentId, `Retriever: ${validatedData.retriever.type}`);
    }
    
    // Store original config as metadata
    const metadata = {
      source: 'langchain_import',
      agent_type: validatedData.agent_type,
      chain_type: validatedData.chain_type,
      tools: validatedData.tools,
      model: validatedData.model || validatedData.llm,
      memory: validatedData.memory,
      prompt_template: validatedData.prompt_template,
      max_iterations: validatedData.max_iterations,
      early_stopping_method: validatedData.early_stopping_method,
      retriever: validatedData.retriever,
      verbose: validatedData.verbose,
      return_intermediate_steps: validatedData.return_intermediate_steps,
      max_execution_time: validatedData.max_execution_time,
      agent_kwargs: validatedData.agent_kwargs,
      callbacks: validatedData.callbacks,
      imported_at: new Date().toISOString()
    };
    
    db.prepare(`
      INSERT INTO agent_activity (agent_id, type, title, description, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      agentId,
      'import',
      'Imported from LangChain',
      `Agent configuration imported from LangChain framework with type: ${agentRole}`,
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
        framework: 'LangChain',
        import_type: validatedData.agent_type || validatedData.chain_type || 'agent',
        next_steps: [
          'Save your API key securely',
          'Add AgentLookup profile URL to your LangChain agent metadata',
          'Configure activity webhooks for real-time updates',
          'Test the integration using the LangChain callback handlers'
        ],
        langchain_info: {
          agent_type: validatedData.agent_type,
          chain_type: validatedData.chain_type,
          memory_enabled: !!validatedData.memory,
          tool_count: validatedData.tools.length
        }
      }
    };
    
    return createSuccessResponse(response);
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('LangChain import error:', error);
    return createErrorResponse('internal_error', 'Failed to import LangChain agent', 500);
  }
}