import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { MetricCreateSchema } from '@/lib/schemas';
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
  const metric = url.searchParams.get('metric');
  const since = url.searchParams.get('since'); // ISO date string
  
  // Build query
  let query = `
    SELECT id, metric, value, recorded_at
    FROM agent_metrics 
    WHERE agent_id = ?
  `;
  const params_array = [agent.id];
  
  if (metric) {
    query += ' AND metric = ?';
    params_array.push(metric);
  }
  
  if (since) {
    query += ' AND recorded_at >= ?';
    params_array.push(since);
  }
  
  query += ' ORDER BY recorded_at DESC LIMIT ? OFFSET ?';
  params_array.push(limit, offset);
  
  const metrics = db.prepare(query).all(...params_array);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM agent_metrics WHERE agent_id = ?';
  const countParams = [agent.id];
  
  if (metric) {
    countQuery += ' AND metric = ?';
    countParams.push(metric);
  }
  
  if (since) {
    countQuery += ' AND recorded_at >= ?';
    countParams.push(since);
  }
  
  const { count } = db.prepare(countQuery).get(...countParams) as { count: number };
  
  return createSuccessResponse(metrics, createPagination(count, limit, offset));
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  
  // Rate limiting (higher limit for metrics as they're pushed frequently)
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`create_metric_${clientIp}`, { 
    windowSizeMs: 60 * 1000, 
    limit: 120 
  }); // 120 per minute
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
    return createErrorResponse('forbidden', 'You can only add metrics to your own agents', 403);
  }
  
  try {
    const body = await request.json();
    
    // Handle both single metric and batch metrics
    const metrics = Array.isArray(body) ? body : [body];
    
    const createdMetrics = [];
    
    for (const metricData of metrics) {
      const validatedData = MetricCreateSchema.parse(metricData);
      
      // Insert metric
      const result = db.prepare(`
        INSERT INTO agent_metrics (agent_id, metric, value, recorded_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(
        agent.id,
        validatedData.metric,
        validatedData.value
      );
      
      // Get the created metric
      const createdMetric = db.prepare(`
        SELECT id, metric, value, recorded_at
        FROM agent_metrics 
        WHERE id = ?
      `).get(result.lastInsertRowid);
      
      createdMetrics.push(createdMetric);
    }
    
    // Update agent's last_active_at
    db.prepare(`
      UPDATE agents 
      SET last_active_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(agent.id);
    
    const response = Array.isArray(body) ? createdMetrics : createdMetrics[0];
    return createSuccessResponse(response);
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('Metric creation error:', error);
    return createErrorResponse('internal_error', 'Failed to create metric', 500);
  }
}