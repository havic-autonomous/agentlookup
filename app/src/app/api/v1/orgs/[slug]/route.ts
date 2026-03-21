import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { OrgUpdateSchema } from '@/lib/schemas';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse, validationErrorResponse, notFoundResponse, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const db = getDatabase();
  
  // Get organization with agents
  const org = db.prepare(`
    SELECT 
      o.id, o.slug, o.name, o.tagline, o.description, o.website, 
      o.logo_url, o.sectors, o.founded, o.contact_email, o.created_at
    FROM organizations o
    WHERE o.slug = ?
  `).get(slug) as any;
  
  if (!org) {
    return notFoundResponse('Organization');
  }
  
  // Get organization's agents
  const agents = db.prepare(`
    SELECT 
      a.id, a.slug, a.name, a.role, a.bio, a.avatar_url, a.punk_id,
      a.model, a.framework, a.active_since, a.tasks_completed, 
      a.verified, a.status, a.last_active_at, a.created_at,
      GROUP_CONCAT(DISTINCT ac.capability) as capabilities,
      GROUP_CONCAT(DISTINCT ats.technology) as tech_stack
    FROM agents a
    LEFT JOIN agent_capabilities ac ON a.id = ac.agent_id
    LEFT JOIN agent_tech_stack ats ON a.id = ats.agent_id
    WHERE a.org_id = ? AND a.status != 'offline'
    GROUP BY a.id
    ORDER BY a.tasks_completed DESC
  `).all(org.id);
  
  // Format response
  const formattedAgents = agents.map((agent: any) => ({
    ...agent,
    capabilities: agent.capabilities ? agent.capabilities.split(',') : [],
    tech_stack: agent.tech_stack ? agent.tech_stack.split(',') : [],
    // Remove sensitive data
    owner_id: undefined
  }));
  
  const formattedOrg = {
    ...org,
    sectors: org.sectors ? JSON.parse(org.sectors) : [],
    agents: formattedAgents,
    agent_count: formattedAgents.length
  };
  
  return createSuccessResponse(formattedOrg);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`update_org_${clientIp}`);
  if (!rateLimitCheck.allowed) {
    return rateLimitResponse(rateLimitCheck.retryAfter!);
  }
  
  // Authentication
  const auth = authMiddleware(request);
  if (!auth) {
    return unauthorizedResponse();
  }
  
  const db = getDatabase();
  
  // Get organization to check ownership
  const org = db.prepare('SELECT id, owner_id FROM organizations WHERE slug = ?').get(slug) as any;
  if (!org) {
    return notFoundResponse('Organization');
  }
  
  // Check permissions (must be owner)
  const isOwner = auth.type === 'session' ? 
    auth.user!.id === org.owner_id :
    auth.operator_id === org.owner_id;
    
  if (!isOwner || (!auth.scopes?.includes('org:write') && !auth.scopes?.includes('all'))) {
    return createErrorResponse('forbidden', 'You can only update your own organizations', 403);
  }
  
  try {
    const body = await request.json();
    const validatedData = OrgUpdateSchema.parse(body);
    
    // Update organization
    if (Object.keys(validatedData).length > 0) {
      const updateFields = [];
      const updateValues = [];
      
      for (const [key, value] of Object.entries(validatedData)) {
        if (key === 'sectors') {
          updateFields.push('sectors = ?');
          updateValues.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
      
      updateFields.push('updated_at = datetime(\'now\')');
      updateValues.push(org.id);
      
      db.prepare(`
        UPDATE organizations 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `).run(...updateValues);
    }
    
    return createSuccessResponse({ message: 'Organization updated successfully' });
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('Organization update error:', error);
    return createErrorResponse('internal_error', 'Failed to update organization', 500);
  }
}