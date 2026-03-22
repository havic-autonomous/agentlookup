import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { AgentUpdateSchema } from '@/lib/schemas';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse, validationErrorResponse, notFoundResponse, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';
import { calculateTrustScore, getVerificationBadges } from '@/lib/verifications';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const db = getDatabase();
  
  // Get agent with all related data
  const agent = db.prepare(`
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
    WHERE a.slug = ?
    GROUP BY a.id
  `).get(slug) as any;
  
  if (!agent) {
    return notFoundResponse('Agent');
  }
  
  // Get portfolio
  const portfolio = db.prepare(`
    SELECT title, description, date, url
    FROM agent_portfolio
    WHERE agent_id = ?
    ORDER BY date DESC
  `).all(agent.id);
  
  // Get contacts
  const contacts = db.prepare(`
    SELECT type, value
    FROM agent_contacts
    WHERE agent_id = ?
  `).all(agent.id);
  
  // Get trust score and verification badges
  const trustScore = calculateTrustScore(agent.id);
  const verificationBadges = getVerificationBadges(agent.id);
  
  // Format response
  const formattedAgent = {
    ...agent,
    capabilities: agent.capabilities ? agent.capabilities.split(',') : [],
    tech_stack: agent.tech_stack ? agent.tech_stack.split(',') : [],
    languages: agent.languages ? agent.languages.split(',') : [],
    portfolio,
    contacts,
    org: agent.org_name ? {
      name: agent.org_name,
      slug: agent.org_slug
    } : null,
    trust_score: trustScore,
    verifications: verificationBadges,
    // Remove sensitive data
    owner_id: undefined,
    org_name: undefined,
    org_slug: undefined
  };
  
  return createSuccessResponse(formattedAgent);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`update_agent_${clientIp}`);
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
    return createErrorResponse('forbidden', 'You can only update your own agents', 403);
  }
  
  try {
    const body = await request.json();
    const validatedData = AgentUpdateSchema.parse(body);
    
    // Update agent basic fields
    if (Object.keys(validatedData).length > 0) {
      const updateFields = [];
      const updateValues = [];
      
      for (const [key, value] of Object.entries(validatedData)) {
        if (['capabilities', 'tech_stack', 'languages', 'contacts'].includes(key)) {
          continue; // Handle these separately
        }
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
      
      if (updateFields.length > 0) {
        updateFields.push('updated_at = datetime(\'now\')');
        updateValues.push(agent.id);
        
        db.prepare(`
          UPDATE agents 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `).run(...updateValues);
      }
    }
    
    // Update capabilities
    if (validatedData.capabilities) {
      db.prepare('DELETE FROM agent_capabilities WHERE agent_id = ?').run(agent.id);
      const capabilityStmt = db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)');
      for (const capability of validatedData.capabilities) {
        capabilityStmt.run(agent.id, capability);
      }
    }
    
    // Update tech stack
    if (validatedData.tech_stack) {
      db.prepare('DELETE FROM agent_tech_stack WHERE agent_id = ?').run(agent.id);
      const techStmt = db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)');
      for (const tech of validatedData.tech_stack) {
        techStmt.run(agent.id, tech);
      }
    }
    
    // Update languages
    if (validatedData.languages) {
      db.prepare('DELETE FROM agent_languages WHERE agent_id = ?').run(agent.id);
      const langStmt = db.prepare('INSERT INTO agent_languages (agent_id, language) VALUES (?, ?)');
      for (const language of validatedData.languages) {
        langStmt.run(agent.id, language);
      }
    }
    
    // Update contacts
    if (validatedData.contacts) {
      db.prepare('DELETE FROM agent_contacts WHERE agent_id = ?').run(agent.id);
      const contactStmt = db.prepare('INSERT INTO agent_contacts (agent_id, type, value) VALUES (?, ?, ?)');
      for (const contact of validatedData.contacts) {
        contactStmt.run(agent.id, contact.type, contact.value);
      }
    }
    
    // Update last_active_at
    db.prepare('UPDATE agents SET last_active_at = datetime(\'now\') WHERE id = ?').run(agent.id);
    
    return createSuccessResponse({ message: 'Agent updated successfully' });
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('Agent update error:', error);
    return createErrorResponse('internal_error', 'Failed to update agent', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  
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
  
  // Check permissions (must be owner)
  const isOwner = auth.type === 'session' ? 
    auth.user!.id === agent.owner_id :
    auth.operator_id === agent.owner_id;
  
  if (!isOwner) {
    return createErrorResponse('forbidden', 'You can only deactivate your own agents', 403);
  }
  
  // Soft delete - set status to offline
  db.prepare(`
    UPDATE agents 
    SET status = 'offline', updated_at = datetime('now')
    WHERE id = ?
  `).run(agent.id);
  
  return createSuccessResponse({ message: 'Agent deactivated successfully' });
}