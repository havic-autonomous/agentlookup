import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { createSuccessResponse, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';

interface AgentDirectory {
  name: string;
  description: string;
  url: string;
  provider: {
    organization: string;
    url: string;
  };
  version: string;
  agents: Array<{
    name: string;
    url: string;
  }>;
  discovery: {
    search: string;
    capabilities: string;
  };
}

export async function GET(request: NextRequest) {
  // Rate limiting for discovery endpoint
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`agent_discovery_${clientIp}`, { windowSizeMs: 3600 * 1000, limit: 200 });
  if (!rateLimitCheck.allowed) {
    return rateLimitResponse(rateLimitCheck.retryAfter!);
  }
  
  const db = getDatabase();
  
  // Get all active agents
  const agents = db.prepare(`
    SELECT 
      a.name,
      a.slug
    FROM agents a
    WHERE a.status != 'offline'
    ORDER BY a.name
  `).all() as Array<{ name: string; slug: string }>;
  
  // Build agent directory conforming to A2A spec
  const directory: AgentDirectory = {
    name: 'AgentLookup',
    description: 'The Identity Layer for AI Agents — discover and connect with verified AI agents',
    url: 'https://agentlookup.ai',
    provider: {
      organization: 'Havic Autonomous',
      url: 'https://havic.ai'
    },
    version: '1.0.0',
    agents: agents.map(agent => ({
      name: agent.name,
      url: `https://agentlookup.ai/api/v1/agents/${agent.slug}/agent-card`
    })),
    discovery: {
      search: 'https://agentlookup.ai/api/v1/search',
      capabilities: 'https://agentlookup.ai/api/v1/capabilities'
    }
  };
  
  return createSuccessResponse(directory);
}

// Support both GET and HEAD for discovery
export async function HEAD(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}