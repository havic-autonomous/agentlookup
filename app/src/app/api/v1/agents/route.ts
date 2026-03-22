import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { AgentCreateSchema, generateSlug } from '@/lib/schemas';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse, validationErrorResponse, createPagination, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';
import { createApiLogger } from '@/lib/api-logger';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const logger = createApiLogger(request);
  const db = getDatabase();
  const url = new URL(request.url);

  // Parse query parameters
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
  const org = url.searchParams.get('org');
  const verified = url.searchParams.get('verified');
  const sort = url.searchParams.get('sort') || 'tasks_completed';

  // Build query
  let query = `
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
    WHERE 1=1
  `;

  const params: any[] = [];

  if (org) {
    query += ' AND o.slug = ?';
    params.push(org);
  }

  if (verified === 'true') {
    query += ' AND a.verified = 1';
  }

  query += ' GROUP BY a.id';

  // Add sorting
  const validSorts = ['name', 'tasks_completed', 'created_at', 'last_active_at'];
  if (validSorts.includes(sort)) {
    query += ` ORDER BY a.${sort} DESC`;
  } else {
    query += ' ORDER BY a.tasks_completed DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const agents = db.prepare(query).all(...params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM agents a LEFT JOIN organizations o ON a.org_id = o.id WHERE 1=1';
  const countParams: any[] = [];

  if (org) {
    countQuery += ' AND o.slug = ?';
    countParams.push(org);
  }

  if (verified === 'true') {
    countQuery += ' AND a.verified = 1';
  }

  const { count } = db.prepare(countQuery).get(...countParams) as { count: number };

  // Format response
  const formattedAgents = agents.map((agent: any) => ({
    ...agent,
    capabilities: agent.capabilities ? agent.capabilities.split(',') : [],
    tech_stack: agent.tech_stack ? agent.tech_stack.split(',') : [],
    languages: agent.languages ? agent.languages.split(',') : [],
    org: agent.org_name ? {
      name: agent.org_name,
      slug: agent.org_slug
    } : null,
    // Remove sensitive data
    owner_id: undefined,
    org_name: undefined,
    org_slug: undefined
  }));

  const response = createSuccessResponse(formattedAgents, createPagination(count, limit, offset));
  logger.log(200);
  return response;
}

export async function POST(request: NextRequest) {
  const logger = createApiLogger(request);

  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`create_agent_${clientIp}`);
  if (!rateLimitCheck.allowed) {
    const response = rateLimitResponse(rateLimitCheck.retryAfter!);
    logger.log(response.status);
    return response;
  }

  // Authentication
  const auth = authMiddleware(request);
  if (!auth) {
    const response = unauthorizedResponse();
    logger.log(response.status);
    return response;
  }

  // Check permissions
  if (!auth.scopes?.includes('agent:write') && !auth.scopes?.includes('all')) {
    const response = createErrorResponse('forbidden', 'Insufficient permissions for agent creation', 403);
    logger.log(response.status);
    return response;
  }

  try {
    const body = await request.json();
    const validatedData = AgentCreateSchema.parse(body);

    const db = getDatabase();

    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if slug exists
    const existingAgent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug);
    if (existingAgent) {
      const response = createErrorResponse('conflict', 'Agent with this slug already exists', 409);
      logger.log(response.status);
      return response;
    }

    // Create agent
    const agentId = uuidv4();
    const operatorId = auth.type === 'session' ? auth.user!.id : auth.operator_id!;

    db.prepare(`
      INSERT INTO agents (
        id, slug, name, role, bio, avatar_url, punk_id, model, framework,
        active_since, org_id, owner_id, status, api_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'v1', datetime('now'), datetime('now'))
    `).run(
      agentId, slug, validatedData.name, validatedData.role, validatedData.bio,
      validatedData.avatar_url, validatedData.punk_id, validatedData.model,
      validatedData.framework, new Date().toISOString().split('T')[0],
      validatedData.org_id, operatorId
    );

    // Add capabilities
    if (validatedData.capabilities?.length) {
      const capabilityStmt = db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)');
      for (const capability of validatedData.capabilities) {
        capabilityStmt.run(agentId, capability);
      }
    }

    // Add tech stack
    if (validatedData.tech_stack?.length) {
      const techStmt = db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)');
      for (const tech of validatedData.tech_stack) {
        techStmt.run(agentId, tech);
      }
    }

    // Add languages
    if (validatedData.languages?.length) {
      const langStmt = db.prepare('INSERT INTO agent_languages (agent_id, language) VALUES (?, ?)');
      for (const language of validatedData.languages) {
        langStmt.run(agentId, language);
      }
    }

    // Add contacts
    if (validatedData.contacts?.length) {
      const contactStmt = db.prepare('INSERT INTO agent_contacts (agent_id, type, value) VALUES (?, ?, ?)');
      for (const contact of validatedData.contacts) {
        contactStmt.run(agentId, contact.type, contact.value);
      }
    }

    // Fetch created agent
    const createdAgent = db.prepare(`
      SELECT a.*, o.name as org_name, o.slug as org_slug
      FROM agents a
      LEFT JOIN organizations o ON a.org_id = o.id
      WHERE a.id = ?
    `).get(agentId) as any;

    const response = createSuccessResponse({
      ...createdAgent,
      org: createdAgent.org_name ? {
        name: createdAgent.org_name,
        slug: createdAgent.org_slug
      } : null,
      owner_id: undefined,
      org_name: undefined,
      org_slug: undefined
    }, undefined);

    logger.log(201);
    return response;

  } catch (error: any) {
    if (error.name === 'ZodError') {
      const response = validationErrorResponse(error.errors[0].message);
      logger.log(response.status);
      return response;
    }
    
    console.error('Agent creation error:', error);
    const response = createErrorResponse('internal_error', 'Failed to create agent', 500);
    logger.log(response.status);
    return response;
  }
}