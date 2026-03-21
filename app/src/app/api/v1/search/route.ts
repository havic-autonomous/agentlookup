import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { SearchSchema } from '@/lib/schemas';
import { createSuccessResponse, createErrorResponse, validationErrorResponse, createPagination } from '@/lib/api-response';
import { withCors } from '@/lib/cors';

async function searchHandler(request: NextRequest) {
  const db = getDatabase();
  const url = new URL(request.url);
  
  try {
    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedParams = SearchSchema.parse(queryParams);
    
    let query = `
      SELECT DISTINCT
        a.id, a.slug, a.name, a.role, a.bio, a.avatar_url, a.punk_id, 
        a.model, a.framework, a.active_since, a.tasks_completed, 
        a.verified, a.status, a.last_active_at, a.created_at,
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
    `;
    
    const conditions = [];
    const params: any[] = [];
    
    // Text search using FTS
    if (validatedParams.q) {
      query += `
        JOIN agents_fts ON agents_fts.rowid = a.rowid
      `;
      conditions.push('agents_fts MATCH ?');
      params.push(validatedParams.q);
    }
    
    // Filter by capability
    if (validatedParams.capability) {
      conditions.push('EXISTS (SELECT 1 FROM agent_capabilities ac2 WHERE ac2.agent_id = a.id AND ac2.capability LIKE ?)');
      params.push(`%${validatedParams.capability}%`);
    }
    
    // Filter by framework
    if (validatedParams.framework) {
      conditions.push('a.framework LIKE ?');
      params.push(`%${validatedParams.framework}%`);
    }
    
    // Filter by model
    if (validatedParams.model) {
      conditions.push('a.model LIKE ?');
      params.push(`%${validatedParams.model}%`);
    }
    
    // Filter by minimum tasks completed
    if (validatedParams.min_tasks !== undefined) {
      conditions.push('a.tasks_completed >= ?');
      params.push(validatedParams.min_tasks);
    }
    
    // Filter by status
    if (validatedParams.status) {
      conditions.push('a.status = ?');
      params.push(validatedParams.status);
    }
    
    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Group by agent ID
    query += ' GROUP BY a.id';
    
    // Add sorting
    const sortMapping = {
      name: 'a.name ASC',
      tasks_completed: 'a.tasks_completed DESC',
      created_at: 'a.created_at DESC', 
      last_active_at: 'a.last_active_at DESC'
    };
    
    query += ` ORDER BY ${sortMapping[validatedParams.sort] || sortMapping.tasks_completed}`;
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(validatedParams.limit, validatedParams.offset);
    
    const agents = db.prepare(query).all(...params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT a.id) as count
      FROM agents a
      LEFT JOIN agent_capabilities ac ON a.id = ac.agent_id
      LEFT JOIN agent_tech_stack ats ON a.id = ats.agent_id
      LEFT JOIN agent_languages al ON a.id = al.agent_id
    `;
    
    if (validatedParams.q) {
      countQuery += `
        JOIN agents_fts ON agents_fts.rowid = a.rowid
      `;
    }
    
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Remove LIMIT/OFFSET params for count query
    const countParams = params.slice(0, -2);
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
    
    return createSuccessResponse(
      formattedAgents, 
      createPagination(count, validatedParams.limit, validatedParams.offset)
    );
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('Search error:', error);
    return createErrorResponse('internal_error', 'Search failed', 500);
  }
}

export const GET = withCors(searchHandler);