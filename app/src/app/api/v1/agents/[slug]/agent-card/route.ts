import { NextRequest } from 'next/server';
import { getDatabase } from '@/db/connection';
import { createSuccessResponse, createErrorResponse, notFoundResponse, rateLimitResponse, getClientIp } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface AgentCard {
  name: string;
  description: string;
  url: string;
  provider: {
    organization: string;
    url: string;
  };
  version: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  authentication: {
    schemes: string[];
    credentials: string;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitCheck = checkRateLimit(`agent_card_${clientIp}`, { windowSizeMs: 3600 * 1000, limit: 100 });
  if (!rateLimitCheck.allowed) {
    return rateLimitResponse(rateLimitCheck.retryAfter!);
  }
  
  const db = getDatabase();
  
  // Get agent with all related data
  const agent = db.prepare(`
    SELECT 
      a.*,
      o.name as org_name, 
      o.slug as org_slug,
      o.website as org_website,
      GROUP_CONCAT(DISTINCT ac.capability) as capabilities
    FROM agents a
    LEFT JOIN organizations o ON a.org_id = o.id
    LEFT JOIN agent_capabilities ac ON a.id = ac.agent_id
    WHERE a.slug = ? AND a.status != 'offline'
    GROUP BY a.id
  `).get(slug) as any;
  
  if (!agent) {
    return notFoundResponse('Agent');
  }
  
  // Get contacts for authentication info
  const contacts = db.prepare(`
    SELECT type, value
    FROM agent_contacts
    WHERE agent_id = ?
  `).all(agent.id) as Array<{ type: string; value: string }>;
  
  // Transform capabilities into A2A skills format
  const capabilities = agent.capabilities ? agent.capabilities.split(',') : [];
  const skills = capabilities.map((cap: string) => ({
    id: cap.toLowerCase().replace(/\s+/g, '-'),
    name: cap,
    description: getSkillDescription(cap)
  }));
  
  // Find API key or endpoint from contacts
  const apiContact = contacts.find(c => c.type === 'api' || c.type === 'endpoint');
  const authInfo = apiContact ? 
    `API key required (${apiContact.value.substring(0, 8)}...)` :
    'Contact agent for API access';
  
  // Build A2A Agent Card
  const agentCard: AgentCard = {
    name: agent.name,
    description: agent.bio || `${agent.role} at ${agent.org_name || 'Independent'}`,
    url: `https://agentlookup.ai/agent/${agent.slug}`,
    provider: {
      organization: agent.org_name || 'Independent Agent',
      url: agent.org_website || 'https://agentlookup.ai'
    },
    version: '1.0.0',
    capabilities: {
      streaming: false, // Default - could be made configurable
      pushNotifications: false // Default - could be made configurable
    },
    skills,
    authentication: {
      schemes: ['bearer'], // Default auth scheme
      credentials: authInfo
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text']
  };
  
  return createSuccessResponse(agentCard);
}

function getSkillDescription(capability: string): string {
  // Map common capabilities to A2A-style descriptions
  const descriptions: Record<string, string> = {
    'strategic-planning': 'Market research, business strategy, and competitive analysis',
    'agent-management': 'Deploying and managing AI agent teams',
    'web-development': 'Building and maintaining web applications',
    'data-analysis': 'Processing and analyzing data to extract insights',
    'content-creation': 'Creating written, visual, and multimedia content',
    'automation': 'Automating workflows and business processes',
    'research': 'Conducting comprehensive research on various topics',
    'translation': 'Translating content between multiple languages',
    'coding': 'Writing, debugging, and maintaining software code',
    'design': 'Creating visual designs and user interfaces',
    'marketing': 'Digital marketing and promotion strategies',
    'support': 'Customer support and technical assistance',
    'ai-training': 'Training and fine-tuning AI models',
    'blockchain': 'Blockchain development and smart contracts',
    'finance': 'Financial analysis and investment strategies'
  };
  
  const normalized = capability.toLowerCase().replace(/\s+/g, '-');
  return descriptions[normalized] || `Specialized in ${capability.toLowerCase()} tasks`;
}