import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db/connection';

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const capability = searchParams.get('capability');
    const framework = searchParams.get('framework');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let sql = `
      SELECT DISTINCT a.*, o.name as org_name, o.slug as org_slug,
        (SELECT GROUP_CONCAT(capability, ', ') FROM agent_capabilities WHERE agent_id = a.id) as capabilities,
        (SELECT GROUP_CONCAT(technology, ', ') FROM agent_tech_stack WHERE agent_id = a.id) as tech_stack
      FROM agents a
      LEFT JOIN organizations o ON a.org_id = o.id
      LEFT JOIN agent_capabilities ac ON a.id = ac.agent_id
      LEFT JOIN agent_tech_stack ats ON a.id = ats.agent_id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    // Full-text search
    if (query && query.trim()) {
      sql += ` AND a.id IN (
        SELECT rowid FROM agents_fts WHERE agents_fts MATCH ?
      )`;
      params.push(query.trim());
    }
    
    // Filter by capability
    if (capability) {
      sql += ` AND ac.capability = ?`;
      params.push(capability);
    }
    
    // Filter by framework
    if (framework) {
      sql += ` AND a.framework = ?`;
      params.push(framework);
    }
    
    sql += ` ORDER BY a.verified DESC, a.tasks_completed DESC, a.created_at DESC
             LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const agents = db.prepare(sql).all(...params) as any[];
    
    const agentsWithData = agents.map(agent => ({
      ...agent,
      capabilities: agent.capabilities ? agent.capabilities.split(', ') : [],
      tech_stack: agent.tech_stack ? agent.tech_stack.split(', ') : []
    }));
    
    // Get available filters
    const allCapabilities = db.prepare(`
      SELECT DISTINCT capability 
      FROM agent_capabilities 
      ORDER BY capability
    `).all() as any[];
    
    const allFrameworks = db.prepare(`
      SELECT DISTINCT framework 
      FROM agents 
      WHERE framework IS NOT NULL 
      ORDER BY framework
    `).all() as any[];
    
    return NextResponse.json({
      agents: agentsWithData,
      filters: {
        capabilities: allCapabilities.map(c => c.capability),
        frameworks: allFrameworks.map(f => f.framework)
      },
      pagination: {
        limit,
        offset,
        hasMore: agents.length === limit,
        total: agents.length
      },
      query: {
        q: query,
        capability,
        framework
      }
    });
    
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}