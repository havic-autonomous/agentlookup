import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse, validationErrorResponse, notFoundResponse, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

const CreateServiceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  endpoint_url: z.string().url('Invalid URL format'),
  price_usdc: z.number().min(0.001, 'Minimum price is $0.001').max(100, 'Maximum price is $100'),
  currency: z.string().default('USDC'),
  active: z.boolean().default(true)
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const db = getDatabase();
  
  // Get agent ID first
  const agent = db.prepare('SELECT id FROM agents WHERE slug = ?').get(slug) as any;
  if (!agent) {
    return notFoundResponse('Agent');
  }
  
  // Get all active services for this agent
  const services = db.prepare(`
    SELECT 
      id,
      name,
      description,
      endpoint_url,
      price_usdc,
      currency,
      active,
      created_at
    FROM agent_services 
    WHERE agent_id = ? AND active = 1
    ORDER BY created_at DESC
  `).all(agent.id);
  
  return createSuccessResponse(services);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`create_service_${clientIp}`);
  if (!rateLimitCheck.allowed) {
    return rateLimitResponse(rateLimitCheck.retryAfter!);
  }
  
  // Authentication - API key required
  const auth = authMiddleware(request);
  if (!auth || auth.type !== 'api_key') {
    return unauthorizedResponse('API key required for service registration');
  }
  
  const db = getDatabase();
  
  // Get agent to check ownership
  const agent = db.prepare('SELECT id, owner_id FROM agents WHERE slug = ?').get(slug) as any;
  if (!agent) {
    return notFoundResponse('Agent');
  }
  
  // Check permissions (must be owner and have agent:write scope)
  const isOwner = auth.operator_id === agent.owner_id;
  const hasAgentAccess = auth.agent_id === null || auth.agent_id === agent.id;
  
  if (!isOwner || !hasAgentAccess || !auth.scopes?.includes('agent:write')) {
    return createErrorResponse('forbidden', 'You can only add services to your own agents', 403);
  }
  
  try {
    const body = await request.json();
    const validatedData = CreateServiceSchema.parse(body);
    
    // Insert new service
    const result = db.prepare(`
      INSERT INTO agent_services (
        agent_id, 
        name, 
        description, 
        endpoint_url, 
        price_usdc, 
        currency,
        active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      agent.id,
      validatedData.name,
      validatedData.description,
      validatedData.endpoint_url,
      validatedData.price_usdc,
      validatedData.currency,
      validatedData.active
    );
    
    // Get the created service
    const newService = db.prepare(`
      SELECT 
        id,
        name,
        description,
        endpoint_url,
        price_usdc,
        currency,
        active,
        created_at
      FROM agent_services 
      WHERE id = ?
    `).get(result.lastInsertRowid);
    
    return createSuccessResponse(newService, 201);
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('Service creation error:', error);
    return createErrorResponse('internal_error', 'Failed to create service', 500);
  }
}