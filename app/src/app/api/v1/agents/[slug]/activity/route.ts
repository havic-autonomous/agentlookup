import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { ActivityCreateSchema } from '@/lib/schemas';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse, validationErrorResponse, notFoundResponse, createPagination, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const db = getDatabase();
  
  // Check if agent exists
  const agent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug) as any;
  if (!agent) {
    return notFoundResponse('Agent');
  }
  
  // Parse query parameters
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
  const type = url.searchParams.get('type');
  
  // Build query
  let query = `
    SELECT id, type, title, description, metadata, created_at
    FROM agent_activity 
    WHERE agent_id = ?
  `;
  const params_array = [agent.id];
  
  if (type) {
    query += ' AND type = ?';
    params_array.push(type);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params_array.push(limit, offset);
  
  const activities = db.prepare(query).all(...params_array);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM agent_activity WHERE agent_id = ?';
  const countParams = [agent.id];
  
  if (type) {
    countQuery += ' AND type = ?';
    countParams.push(type);
  }
  
  const { count } = db.prepare(countQuery).get(...countParams) as { count: number };
  
  // Parse metadata JSON
  const formattedActivities = activities.map((activity: any) => ({
    ...activity,
    metadata: activity.metadata ? JSON.parse(activity.metadata) : null
  }));
  
  return createSuccessResponse(formattedActivities, createPagination(count, limit, offset));
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`create_activity_${clientIp}`);
  if (!rateLimitCheck.allowed) {
    return rateLimitResponse(rateLimitCheck.retryAfter!);
  }
  
  // Authentication
  const auth = authMiddleware(request);
  if (!auth) {
    return unauthorizedResponse();
  }
  
  const db = getDatabase();
  
  // Get agent to check ownership
  const agent = db.prepare('SELECT id, owner_id FROM agents WHERE slug = ?').get(slug) as any;
  if (!agent) {
    return notFoundResponse('Agent');
  }
  
  // Check permissions (must be owner or have agent:write scope for this specific agent)
  const isOwner = auth.type === 'session' ? 
    auth.user!.id === agent.owner_id :
    auth.operator_id === agent.owner_id;
    
  const hasAgentAccess = auth.agent_id === null || auth.agent_id === agent.id;
  
  if (!isOwner || !hasAgentAccess || (!auth.scopes?.includes('agent:write') && !auth.scopes?.includes('all'))) {
    return createErrorResponse('forbidden', 'You can only add activity to your own agents', 403);
  }
  
  try {
    const body = await request.json();
    const validatedData = ActivityCreateSchema.parse(body);
    
    // Insert activity
    const result = db.prepare(`
      INSERT INTO agent_activity (agent_id, type, title, description, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      agent.id,
      validatedData.type,
      validatedData.title,
      validatedData.description || null,
      validatedData.metadata ? JSON.stringify(validatedData.metadata) : null
    );
    
    // Update agent's last_active_at and tasks_completed if applicable
    if (validatedData.type === 'task_completed') {
      db.prepare(`
        UPDATE agents 
        SET tasks_completed = tasks_completed + 1, last_active_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(agent.id);
    } else {
      db.prepare(`
        UPDATE agents 
        SET last_active_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(agent.id);
    }
    
    // Get the created activity
    const createdActivity = db.prepare(`
      SELECT id, type, title, description, metadata, created_at
      FROM agent_activity 
      WHERE id = ?
    `).get(result.lastInsertRowid) as any;
    
    const formattedActivity = {
      ...createdActivity,
      metadata: createdActivity.metadata ? JSON.parse(createdActivity.metadata) : null
    };
    
    return createSuccessResponse(formattedActivity);
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('Activity creation error:', error);
    return createErrorResponse('internal_error', 'Failed to create activity', 500);
  }
}