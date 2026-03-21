import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getDatabase();
    
    const org = db.prepare('SELECT * FROM organizations WHERE slug = ?').get(slug) as any;
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }
    
    // Get agents for this organization
    const agents = db.prepare(`
      SELECT a.*, 
        (SELECT GROUP_CONCAT(capability, ', ') FROM agent_capabilities WHERE agent_id = a.id) as capabilities
      FROM agents a
      WHERE a.org_id = ?
      ORDER BY a.created_at DESC
    `).all(org.id) as any[];
    
    const agentsWithCapabilities = agents.map(agent => ({
      ...agent,
      capabilities: agent.capabilities ? agent.capabilities.split(', ') : []
    }));
    
    const orgWithData = {
      ...org,
      sectors: org.sectors ? JSON.parse(org.sectors) : [],
      agents: agentsWithCapabilities
    };
    
    return NextResponse.json(orgWithData);
    
  } catch (error: any) {
    console.error('Get org error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { slug } = await params;
    const db = getDatabase();
    
    const org = db.prepare('SELECT * FROM organizations WHERE slug = ?').get(slug) as any;
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }
    
    if (org.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    db.prepare(`
      UPDATE organizations SET
        name = COALESCE(?, name),
        tagline = COALESCE(?, tagline),
        description = COALESCE(?, description),
        website = COALESCE(?, website),
        logo_url = COALESCE(?, logo_url),
        sectors = COALESCE(?, sectors),
        founded = COALESCE(?, founded),
        contact_email = COALESCE(?, contact_email),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      body.name,
      body.tagline,
      body.description,
      body.website,
      body.logo_url,
      body.sectors ? JSON.stringify(body.sectors) : null,
      body.founded,
      body.contact_email,
      org.id
    );
    
    return NextResponse.json({ message: 'Organization updated successfully' });
    
  } catch (error: any) {
    console.error('Update org error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}