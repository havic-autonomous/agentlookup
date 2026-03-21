import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const createAgentSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  role: z.string().optional(),
  bio: z.string().optional(),
  avatar_url: z.string().optional(),
  punk_id: z.string().optional(),
  model: z.string().optional(),
  framework: z.string().optional(),
  active_since: z.string().optional(),
  org_id: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  tech_stack: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
});

function buildAgentWithRelations(agentId: string) {
  const db = getDatabase();
  
  const agent = db.prepare(`
    SELECT a.*, o.name as org_name, o.slug as org_slug
    FROM agents a
    LEFT JOIN organizations o ON a.org_id = o.id
    WHERE a.id = ?
  `).get(agentId) as any;
  
  if (!agent) return null;
  
  const capabilities = db.prepare('SELECT capability FROM agent_capabilities WHERE agent_id = ?').all(agentId) as any[];
  const techStack = db.prepare('SELECT technology FROM agent_tech_stack WHERE agent_id = ?').all(agentId) as any[];
  const languages = db.prepare('SELECT language FROM agent_languages WHERE agent_id = ?').all(agentId) as any[];
  const portfolio = db.prepare('SELECT title, description, date, url FROM agent_portfolio WHERE agent_id = ?').all(agentId) as any[];
  const contacts = db.prepare('SELECT type, value FROM agent_contacts WHERE agent_id = ?').all(agentId) as any[];
  
  return {
    ...agent,
    capabilities: capabilities.map(c => c.capability),
    tech_stack: techStack.map(t => t.technology),
    languages: languages.map(l => l.language),
    portfolio,
    contacts,
  };
}

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const framework = searchParams.get('framework');
    const verified = searchParams.get('verified');
    
    let query = `
      SELECT a.*, o.name as org_name, o.slug as org_slug
      FROM agents a
      LEFT JOIN organizations o ON a.org_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (framework) {
      query += ' AND a.framework = ?';
      params.push(framework);
    }
    
    if (verified === 'true') {
      query += ' AND a.verified = 1';
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const agents = db.prepare(query).all(...params) as any[];
    
    // Get capabilities for each agent
    const agentsWithData = agents.map(agent => {
      const capabilities = db.prepare('SELECT capability FROM agent_capabilities WHERE agent_id = ?').all(agent.id) as any[];
      const techStack = db.prepare('SELECT technology FROM agent_tech_stack WHERE agent_id = ?').all(agent.id) as any[];
      const languages = db.prepare('SELECT language FROM agent_languages WHERE agent_id = ?').all(agent.id) as any[];
      
      return {
        ...agent,
        capabilities: capabilities.map(c => c.capability),
        tech_stack: techStack.map(t => t.technology),
        languages: languages.map(l => l.language),
      };
    });
    
    return NextResponse.json({
      agents: agentsWithData,
      pagination: {
        limit,
        offset,
        hasMore: agents.length === limit
      }
    });
    
  } catch (error: any) {
    console.error('Get agents error:', error);
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
    const data = createAgentSchema.parse(body);
    
    const db = getDatabase();
    const agentId = uuidv4();
    
    // Check slug uniqueness
    const existing = db.prepare('SELECT id FROM agents WHERE slug = ?').get(data.slug);
    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 409 }
      );
    }
    
    // Insert agent
    db.prepare(`
      INSERT INTO agents (
        id, slug, name, role, bio, avatar_url, punk_id, model, framework,
        active_since, tasks_completed, verified, org_id, owner_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, datetime('now'), datetime('now'))
    `).run(
      agentId,
      data.slug,
      data.name,
      data.role || null,
      data.bio || null,
      data.avatar_url || null,
      data.punk_id || null,
      data.model || null,
      data.framework || null,
      data.active_since || new Date().toISOString().split('T')[0],
      data.org_id || null,
      user.id
    );
    
    // Insert capabilities
    if (data.capabilities) {
      for (const capability of data.capabilities) {
        db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)').run(agentId, capability);
      }
    }
    
    // Insert tech stack
    if (data.tech_stack) {
      for (const tech of data.tech_stack) {
        db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)').run(agentId, tech);
      }
    }
    
    // Insert languages
    if (data.languages) {
      for (const language of data.languages) {
        db.prepare('INSERT INTO agent_languages (agent_id, language) VALUES (?, ?)').run(agentId, language);
      }
    }
    
    const agent = buildAgentWithRelations(agentId);
    
    return NextResponse.json(agent, { status: 201 });
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Create agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}