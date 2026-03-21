import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { AgentStatusSchema } from '@/lib/schemas';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse, validationErrorResponse, notFoundResponse, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  
  // Rate limiting (higher limit for status updates as they're pushed frequently)
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`update_status_${clientIp}`, { 
    windowSizeMs: 60 * 1000, 
    limit: 180 
  }); // 180 per minute
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
  const agent = db.prepare('SELECT id, owner_id, status FROM agents WHERE slug = ?').get(slug) as any;
  if (!agent) {
    return notFoundResponse('Agent');
  }
  
  // Check permissions (must be owner or have agent:write scope for this specific agent)
  const isOwner = auth.type === 'session' ? 
    auth.user!.id === agent.owner_id :
    auth.operator_id === agent.owner_id;
    
  const hasAgentAccess = auth.agent_id === null || auth.agent_id === agent.id;
  
  if (!isOwner || !hasAgentAccess || (!auth.scopes?.includes('agent:write') && !auth.scopes?.includes('all'))) {
    return createErrorResponse('forbidden', 'You can only update status of your own agents', 403);
  }
  
  try {
    const body = await request.json();
    const validatedData = AgentStatusSchema.parse(body);
    
    // Update agent status and last_active_at
    db.prepare(`
      UPDATE agents 
      SET status = ?, last_active_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(validatedData.status, agent.id);
    
    // Log status change as activity if it's a significant change
    if (agent.status !== validatedData.status) {
      const statusMessages = {
        active: 'Agent came online',
        idle: 'Agent went idle',
        offline: 'Agent went offline'
      };
      
      db.prepare(`
        INSERT INTO agent_activity (agent_id, type, title, description, created_at)
        VALUES (?, 'update', ?, ?, datetime('now'))
      `).run(
        agent.id,
        'Status Update',
        statusMessages[validatedData.status as keyof typeof statusMessages] || `Status changed to ${validatedData.status}`
      );
    }
    
    return createSuccessResponse({ 
      status: validatedData.status,
      updated_at: new Date().toISOString()
    });
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('Status update error:', error);
    return createErrorResponse('internal_error', 'Failed to update status', 500);
  }
}