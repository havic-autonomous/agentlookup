import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const createOrgSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  tagline: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  logo_url: z.string().optional(),
  sectors: z.array(z.string()).optional(),
  founded: z.string().optional(),
  contact_email: z.string().email().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const orgs = db.prepare(`
      SELECT *,
        (SELECT COUNT(*) FROM agents WHERE org_id = organizations.id) as agent_count
      FROM organizations
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[];
    
    const orgsWithSectors = orgs.map(org => ({
      ...org,
      sectors: org.sectors ? JSON.parse(org.sectors) : []
    }));
    
    return NextResponse.json({
      organizations: orgsWithSectors,
      pagination: {
        limit,
        offset,
        hasMore: orgs.length === limit
      }
    });
    
  } catch (error: any) {
    console.error('Get orgs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const data = createOrgSchema.parse(body);
    
    const db = getDatabase();
    
    // Check slug uniqueness
    const existing = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(data.slug);
    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 409 }
      );
    }
    
    const orgId = uuidv4();
    
    db.prepare(`
      INSERT INTO organizations (
        id, slug, name, tagline, description, website, logo_url,
        sectors, founded, contact_email, created_at, updated_at, owner_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
    `).run(
      orgId,
      data.slug,
      data.name,
      data.tagline || null,
      data.description || null,
      data.website || null,
      data.logo_url || null,
      data.sectors ? JSON.stringify(data.sectors) : null,
      data.founded || null,
      data.contact_email || null,
      user.id
    );
    
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId) as any;
    
    return NextResponse.json({
      ...org,
      sectors: org.sectors ? JSON.parse(org.sectors) : []
    }, { status: 201 });
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Create org error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}