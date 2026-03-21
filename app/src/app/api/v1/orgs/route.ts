import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { authMiddleware } from '@/lib/auth';
import { OrgCreateSchema, generateSlug } from '@/lib/schemas';
import { createSuccessResponse, createErrorResponse, unauthorizedResponse, validationErrorResponse, createPagination, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const db = getDatabase();
  const url = new URL(request.url);
  
  // Parse query parameters
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
  const sector = url.searchParams.get('sector');
  
  // Build query
  let query = `
    SELECT 
      o.id, o.slug, o.name, o.tagline, o.description, o.website, 
      o.logo_url, o.sectors, o.founded, o.contact_email, o.created_at,
      COUNT(a.id) as agent_count
    FROM organizations o
    LEFT JOIN agents a ON o.id = a.org_id AND a.status != 'offline'
  `;
  
  const params: any[] = [];
  
  if (sector) {
    query += ' WHERE o.sectors LIKE ?';
    params.push(`%"${sector}"%`);
  }
  
  query += ' GROUP BY o.id ORDER BY agent_count DESC, o.name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const orgs = db.prepare(query).all(...params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM organizations o';
  const countParams: any[] = [];
  
  if (sector) {
    countQuery += ' WHERE o.sectors LIKE ?';
    countParams.push(`%"${sector}"%`);
  }
  
  const { count } = db.prepare(countQuery).get(...countParams) as { count: number };
  
  // Format response
  const formattedOrgs = orgs.map((org: any) => ({
    ...org,
    sectors: org.sectors ? JSON.parse(org.sectors) : [],
    // Remove sensitive data
    owner_id: undefined
  }));
  
  return createSuccessResponse(formattedOrgs, createPagination(count, limit, offset));
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`create_org_${clientIp}`);
  if (!rateLimitCheck.allowed) {
    return rateLimitResponse(rateLimitCheck.retryAfter!);
  }
  
  // Authentication
  const auth = authMiddleware(request);
  if (!auth) {
    return unauthorizedResponse();
  }
  
  // Check permissions
  if (!auth.scopes?.includes('org:write') && !auth.scopes?.includes('all')) {
    return createErrorResponse('forbidden', 'Insufficient permissions for organization creation', 403);
  }
  
  try {
    const body = await request.json();
    const validatedData = OrgCreateSchema.parse(body);
    
    const db = getDatabase();
    
    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);
    
    // Check if slug exists
    const existingOrg = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(slug);
    if (existingOrg) {
      return createErrorResponse('conflict', 'Organization with this slug already exists', 409);
    }
    
    // Create organization
    const orgId = uuidv4();
    const operatorId = auth.type === 'session' ? auth.user!.id : auth.operator_id!;
    
    db.prepare(`
      INSERT INTO organizations (
        id, slug, name, tagline, description, website, logo_url, 
        sectors, founded, contact_email, created_at, updated_at, owner_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
    `).run(
      orgId, slug, validatedData.name, validatedData.tagline, validatedData.description,
      validatedData.website, validatedData.logo_url, JSON.stringify(validatedData.sectors),
      validatedData.founded, validatedData.contact_email, operatorId
    );
    
    // Fetch created organization
    const createdOrg = db.prepare(`
      SELECT id, slug, name, tagline, description, website, logo_url, 
             sectors, founded, contact_email, created_at
      FROM organizations 
      WHERE id = ?
    `).get(orgId) as any;
    
    return createSuccessResponse({
      ...createdOrg,
      sectors: createdOrg.sectors ? JSON.parse(createdOrg.sectors) : []
    });
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationErrorResponse(error.errors[0].message);
    }
    
    console.error('Organization creation error:', error);
    return createErrorResponse('internal_error', 'Failed to create organization', 500);
  }
}