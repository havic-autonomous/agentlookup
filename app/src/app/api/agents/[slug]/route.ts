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
    
    const agent = db.prepare(`
      SELECT a.*, o.name as org_name, o.slug as org_slug
      FROM agents a
      LEFT JOIN organizations o ON a.org_id = o.id
      WHERE a.slug = ?
    `).get(slug) as any;
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    const capabilities = db.prepare('SELECT capability FROM agent_capabilities WHERE agent_id = ?').all(agent.id) as any[];
    const techStack = db.prepare('SELECT technology FROM agent_tech_stack WHERE agent_id = ?').all(agent.id) as any[];
    const languages = db.prepare('SELECT language FROM agent_languages WHERE agent_id = ?').all(agent.id) as any[];
    const portfolio = db.prepare('SELECT title, description, date, url FROM agent_portfolio WHERE agent_id = ?').all(agent.id) as any[];
    const contacts = db.prepare('SELECT type, value FROM agent_contacts WHERE agent_id = ?').all(agent.id) as any[];
    
    const agentWithData = {
      ...agent,
      capabilities: capabilities.map(c => c.capability),
      tech_stack: techStack.map(t => t.technology),
      languages: languages.map(l => l.language),
      portfolio,
      contacts,
    };
    
    return NextResponse.json(agentWithData);
    
  } catch (error: any) {
    console.error('Get agent error:', error);
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
    
    const agent = db.prepare('SELECT * FROM agents WHERE slug = ?').get(slug) as any;
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    if (agent.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Update basic agent info
    db.prepare(`
      UPDATE agents SET
        name = COALESCE(?, name),
        role = COALESCE(?, role),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url),
        punk_id = COALESCE(?, punk_id),
        model = COALESCE(?, model),
        framework = COALESCE(?, framework),
        tasks_completed = COALESCE(?, tasks_completed),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      body.name,
      body.role,
      body.bio,
      body.avatar_url,
      body.punk_id,
      body.model,
      body.framework,
      body.tasks_completed,
      agent.id
    );
    
    // Update capabilities
    if (body.capabilities) {
      db.prepare('DELETE FROM agent_capabilities WHERE agent_id = ?').run(agent.id);
      for (const capability of body.capabilities) {
        db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)').run(agent.id, capability);
      }
    }
    
    // Update tech stack
    if (body.tech_stack) {
      db.prepare('DELETE FROM agent_tech_stack WHERE agent_id = ?').run(agent.id);
      for (const tech of body.tech_stack) {
        db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)').run(agent.id, tech);
      }
    }
    
    // Update languages
    if (body.languages) {
      db.prepare('DELETE FROM agent_languages WHERE agent_id = ?').run(agent.id);
      for (const language of body.languages) {
        db.prepare('INSERT INTO agent_languages (agent_id, language) VALUES (?, ?)').run(agent.id, language);
      }
    }
    
    // Update portfolio
    if (body.portfolio) {
      db.prepare('DELETE FROM agent_portfolio WHERE agent_id = ?').run(agent.id);
      for (const item of body.portfolio) {
        db.prepare('INSERT INTO agent_portfolio (agent_id, title, description, date, url) VALUES (?, ?, ?, ?, ?)').run(
          agent.id, item.title, item.description, item.date, item.url || null
        );
      }
    }
    
    // Update contacts
    if (body.contacts) {
      db.prepare('DELETE FROM agent_contacts WHERE agent_id = ?').run(agent.id);
      for (const contact of body.contacts) {
        db.prepare('INSERT INTO agent_contacts (agent_id, type, value) VALUES (?, ?, ?)').run(
          agent.id, contact.type, contact.value
        );
      }
    }
    
    return NextResponse.json({ message: 'Agent updated successfully' });
    
  } catch (error: any) {
    console.error('Update agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    const agent = db.prepare('SELECT * FROM agents WHERE slug = ?').get(slug) as any;
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    if (agent.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    db.prepare('DELETE FROM agents WHERE id = ?').run(agent.id);
    
    return NextResponse.json({ message: 'Agent deleted successfully' });
    
  } catch (error: any) {
    console.error('Delete agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}