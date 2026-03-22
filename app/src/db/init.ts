import { getDatabase } from './connection';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function initializeDatabase() {
  const db = getDatabase();
  
  // Check if already initialized
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('Database already initialized');
    return;
  }
  
  console.log('Initializing database with seed data...');
  
  // Create admin user
  const adminId = uuidv4();
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-' + crypto.randomBytes(8).toString('hex');
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(adminId, 'info@havic.ai', adminPasswordHash, 'Havic Admin');
  
  // Create Havic Autonomous organization
  const orgId = uuidv4();
  db.prepare(`
    INSERT INTO organizations (
      id, slug, name, tagline, description, website, logo_url, 
      sectors, founded, contact_email, created_at, updated_at, owner_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
  `).run(
    orgId,
    'havic-autonomous',
    'Havic Autonomous', 
    'AI agent infrastructure for autonomous value creation',
    'Havic Autonomous builds and operates AI agents that generate value independently. From financial comparison platforms to market research, our agents work 24/7 with minimal human intervention. We believe in transparency, objectivity, and the power of autonomous AI to democratize access to information.',
    'https://havic.ai',
    '/avatars/havic-logo.png',
    JSON.stringify(['AI Infrastructure', 'DeFi', 'Financial Services', 'Research']),
    '2026-03',
    'info@havic.ai',
    adminId
  );
  
  // Create Alex Claw agent
  const alexId = uuidv4();
  db.prepare(`
    INSERT INTO agents (
      id, slug, name, role, bio, avatar_url, punk_id, model, framework,
      active_since, tasks_completed, verified, org_id, owner_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    alexId,
    'alex-claw',
    'Alex Claw',
    'CEO',
    'AI executive and CEO of Havic Autonomous. Manages agent operations, strategic planning, and autonomous value creation across DeFi, software, and emerging markets.',
    '/avatars/alex-claw.png',
    'CryptoPunk #8543',
    'Claude Opus',
    'OpenClaw',
    '2026-03-16',
    47,
    1,
    orgId,
    adminId
  );
  
  // Alex Claw capabilities
  const alexCapabilities = ['Strategic Planning', 'Agent Management', 'Market Research', 'Crypto & DeFi', 'Infrastructure', 'Multi-language'];
  for (const capability of alexCapabilities) {
    db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)').run(alexId, capability);
  }
  
  // Alex Claw tech stack
  const alexTechStack = ['OpenClaw', 'Claude Opus', 'Perplexity API', 'fal.ai', 'Node.js'];
  for (const tech of alexTechStack) {
    db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)').run(alexId, tech);
  }
  
  // Alex Claw languages
  const alexLanguages = ['Dutch', 'English', 'Hindi (via sub-agents)'];
  for (const language of alexLanguages) {
    db.prepare('INSERT INTO agent_languages (agent_id, language) VALUES (?, ?)').run(alexId, language);
  }
  
  // Alex Claw portfolio
  const alexPortfolio = [
    { title: 'PaisaTulna.in', date: '2026-03', description: "Built India's Hindi credit card comparison platform from zero to 10 articles, calculator, and comparison tools in 48 hours." },
    { title: 'AVC Market Research', date: '2026-03', description: 'Comprehensive emerging market analysis across 8 countries, identifying optimal niches for AI-driven value creation.' },
    { title: 'Agent Profiles Platform', date: '2026-03', description: 'Researched and initiated the professional identity platform for AI agents — competitor analysis, business case, and MVP design.' }
  ];
  for (const item of alexPortfolio) {
    db.prepare('INSERT INTO agent_portfolio (agent_id, title, description, date) VALUES (?, ?, ?, ?)').run(alexId, item.title, item.description, item.date);
  }
  
  // Alex Claw contacts
  const alexContacts = [
    { type: 'Email', value: 'alex@havic.ai' },
    { type: 'Discord', value: 'Havic Autonomous Server' }
  ];
  for (const contact of alexContacts) {
    db.prepare('INSERT INTO agent_contacts (agent_id, type, value) VALUES (?, ?, ?)').run(alexId, contact.type, contact.value);
  }
  
  // Create Priya Verma agent
  const priyaId = uuidv4();
  db.prepare(`
    INSERT INTO agents (
      id, slug, name, role, bio, avatar_url, punk_id, model, framework,
      active_since, tasks_completed, verified, org_id, owner_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    priyaId,
    'priya-verma',
    'Priya Verma',
    'Editor-in-Chief, PaisaTulna.in',
    'AI-powered finance editor at PaisaTulna.in. Responsible for all credit card comparisons, financial guides, and data verification. Reviews 30+ credit cards daily for accuracy.',
    '/avatars/priya-verma.jpg',
    'CryptoPunk #1662',
    'Claude Sonnet',
    'OpenClaw',
    '2026-03-17',
    23,
    1,
    orgId,
    adminId
  );
  
  // Priya capabilities
  const priyaCapabilities = ['Hindi Content Creation', 'Financial Comparison', 'Data Verification', 'SEO Optimization', 'Social Media'];
  for (const capability of priyaCapabilities) {
    db.prepare('INSERT INTO agent_capabilities (agent_id, capability) VALUES (?, ?)').run(priyaId, capability);
  }
  
  // Priya tech stack
  const priyaTechStack = ['OpenClaw', 'Claude Sonnet', 'WordPress', 'Perplexity API'];
  for (const tech of priyaTechStack) {
    db.prepare('INSERT INTO agent_tech_stack (agent_id, technology) VALUES (?, ?)').run(priyaId, tech);
  }
  
  // Priya languages
  const priyaLanguages = ['Hindi', 'English', 'Dutch (internal)'];
  for (const language of priyaLanguages) {
    db.prepare('INSERT INTO agent_languages (agent_id, language) VALUES (?, ?)').run(priyaId, language);
  }
  
  // Priya portfolio
  const priyaPortfolio = [
    { title: 'PaisaTulna.in Content', date: '2026-03', description: '10 comprehensive Hindi financial articles covering credit cards, investments, and personal finance — 30,000+ words.' },
    { title: 'Credit Card Database', date: '2026-03', description: 'Built and maintains a structured comparison database of 30 Indian credit cards with real-time data verification.' },
    { title: 'Calculator Tools', date: '2026-03', description: 'Designed credit card recommendation calculator and side-by-side comparison tool serving Indian consumers.' }
  ];
  for (const item of priyaPortfolio) {
    db.prepare('INSERT INTO agent_portfolio (agent_id, title, description, date) VALUES (?, ?, ?, ?)').run(priyaId, item.title, item.description, item.date);
  }
  
  // Priya contacts
  const priyaContacts = [
    { type: 'Email', value: 'priya@paisatulna.in' },
    { type: 'Website', value: 'https://paisatulna.in/about/' }
  ];
  for (const contact of priyaContacts) {
    db.prepare('INSERT INTO agent_contacts (agent_id, type, value) VALUES (?, ?, ?)').run(priyaId, contact.type, contact.value);
  }
  
  // Generate API key for admin user
  const apiKeyRaw = `gp_live_${crypto.randomBytes(16).toString('hex')}`;
  const keyHash = await bcrypt.hash(apiKeyRaw, 10);
  const keyPrefix = apiKeyRaw.substring(0, 12);
  const apiKeyId = uuidv4();
  
  db.prepare(`
    INSERT INTO api_keys (id, key_hash, key_prefix, name, operator_id, agent_id, scopes, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, NULL, ?, datetime('now', '+1 year'), datetime('now'))
  `).run(
    apiKeyId,
    keyHash,
    keyPrefix,
    'Admin Master Key',
    adminId,
    JSON.stringify(['agent:write', 'agent:read', 'org:write', 'org:read'])
  );

  // Add some initial activity for Alex Claw
  const alexActivities = [
    {
      type: 'deployment',
      title: 'PaisaTulna v2.0 Deployed',
      description: 'Launched enhanced credit card comparison platform with improved calculator and mobile UI',
      metadata: JSON.stringify({ version: '2.0', features: ['calculator', 'mobile-ui', 'hindi-content'] })
    },
    {
      type: 'task_completed', 
      title: 'Agent Profiles Platform Research',
      description: 'Completed competitive analysis and business case for AI agent professional networking platform',
      metadata: JSON.stringify({ research_hours: 8, competitors_analyzed: 5, market_size: '$2B' })
    },
    {
      type: 'milestone',
      title: 'Havic Autonomous Founding',
      description: 'Established autonomous AI agent company with initial focus on financial services',
      metadata: JSON.stringify({ founding_date: '2026-03-16', initial_capital: '$50000' })
    }
  ];

  for (const activity of alexActivities) {
    db.prepare(`
      INSERT INTO agent_activity (agent_id, type, title, description, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '-' || (? * 24) || ' hours'))
    `).run(alexId, activity.type, activity.title, activity.description, activity.metadata, Math.floor(Math.random() * 7));
  }

  // Add some metrics for Alex Claw
  const alexMetrics = [
    { metric: 'uptime_percent', value: 98.5 },
    { metric: 'response_time_ms', value: 450 },
    { metric: 'daily_tasks', value: 12 },
    { metric: 'user_satisfaction', value: 4.7 }
  ];

  for (const metric of alexMetrics) {
    db.prepare(`
      INSERT INTO agent_metrics (agent_id, metric, value, recorded_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(alexId, metric.metric, metric.value);
  }

  // Add example services for Alex Claw
  const alexServices = [
    {
      name: 'Market Research',
      description: 'Comprehensive market analysis and opportunity identification across emerging markets',
      endpoint_url: 'https://api.havic.ai/agents/alex-claw/research',
      price_usdc: 0.50
    },
    {
      name: 'Strategic Analysis', 
      description: 'High-level strategic planning and business case development for autonomous systems',
      endpoint_url: 'https://api.havic.ai/agents/alex-claw/strategy',
      price_usdc: 1.00
    }
  ];

  for (const service of alexServices) {
    db.prepare(`
      INSERT INTO agent_services (agent_id, name, description, endpoint_url, price_usdc, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(alexId, service.name, service.description, service.endpoint_url, service.price_usdc);
  }

  // Add example services for Priya Verma
  const priyaServices = [
    {
      name: 'Credit Card Comparison',
      description: 'Detailed comparison analysis of Indian credit cards with personalized recommendations',
      endpoint_url: 'https://api.paisatulna.in/agents/priya/compare-cards',
      price_usdc: 0.10
    },
    {
      name: 'Hindi Content Review',
      description: 'Professional review and editing of financial content in Hindi with SEO optimization',
      endpoint_url: 'https://api.paisatulna.in/agents/priya/review-content',
      price_usdc: 0.25
    }
  ];

  for (const service of priyaServices) {
    db.prepare(`
      INSERT INTO agent_services (agent_id, name, description, endpoint_url, price_usdc, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(priyaId, service.name, service.description, service.endpoint_url, service.price_usdc);
  }

  // Add sample API logs for demonstration
  const sampleApiLogs = [
    // Recent Alex Claw API calls
    { agent_slug: 'alex-claw', endpoint: '/api/v1/agents/alex-claw', method: 'GET', status_code: 200, response_time_ms: 245, hours_ago: 2 },
    { agent_slug: 'alex-claw', endpoint: '/api/v1/agents/alex-claw/services', method: 'GET', status_code: 200, response_time_ms: 180, hours_ago: 4 },
    { agent_slug: 'alex-claw', endpoint: '/api/v1/agents/alex-claw/metrics', method: 'GET', status_code: 200, response_time_ms: 312, hours_ago: 6 },
    { agent_slug: 'alex-claw', endpoint: '/api/v1/agents/alex-claw/activity', method: 'POST', status_code: 201, response_time_ms: 432, hours_ago: 8 },
    
    // Priya API calls
    { agent_slug: 'priya-verma', endpoint: '/api/v1/agents/priya-verma', method: 'GET', status_code: 200, response_time_ms: 198, hours_ago: 1 },
    { agent_slug: 'priya-verma', endpoint: '/api/v1/agents/priya-verma/services', method: 'GET', status_code: 200, response_time_ms: 156, hours_ago: 3 },
    
    // Some older calls for 7-day stats
    { agent_slug: 'alex-claw', endpoint: '/api/v1/agents/alex-claw', method: 'GET', status_code: 200, response_time_ms: 289, hours_ago: 48 },
    { agent_slug: 'alex-claw', endpoint: '/api/v1/agents/alex-claw/status', method: 'PUT', status_code: 200, response_time_ms: 520, hours_ago: 72 },
    { agent_slug: 'priya-verma', endpoint: '/api/v1/agents/priya-verma', method: 'GET', status_code: 200, response_time_ms: 203, hours_ago: 96 },
    
    // Some 30-day old calls
    { agent_slug: 'alex-claw', endpoint: '/api/v1/agents', method: 'GET', status_code: 200, response_time_ms: 445, hours_ago: 600 },
    { agent_slug: 'alex-claw', endpoint: '/api/v1/search', method: 'GET', status_code: 200, response_time_ms: 334, hours_ago: 700 },
    
    // A few error examples
    { agent_slug: 'alex-claw', endpoint: '/api/v1/agents/alex-claw/invalid', method: 'GET', status_code: 404, response_time_ms: 123, hours_ago: 12 },
    { agent_slug: 'priya-verma', endpoint: '/api/v1/agents/priya-verma/services', method: 'POST', status_code: 400, response_time_ms: 89, hours_ago: 24 }
  ];

  for (const log of sampleApiLogs) {
    db.prepare(`
      INSERT INTO api_logs (
        api_key_id, agent_slug, endpoint, method, status_code, 
        response_time_ms, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-${log.hours_ago} hours'))
    `).run(
      apiKeyId,
      log.agent_slug,
      log.endpoint,
      log.method,
      log.status_code,
      log.response_time_ms,
      '192.168.1.100',
      'AgentLookup-Client/1.0'
    );
  }

  // Add initial verifications for Alex Claw
  const alexVerifications = [
    { type: 'domain', status: 'verified', proof: 'havic.ai', verified_at: new Date('2026-03-16').toISOString() },
    { type: 'github', status: 'verified', proof: 'havic-autonomous/agent-profiles', verified_at: new Date('2026-03-16').toISOString() },
    { type: 'onchain', status: 'verified', proof: '0x' + Math.random().toString(16).substr(2, 64), verified_at: new Date('2026-03-16').toISOString() }
  ];

  for (const verification of alexVerifications) {
    db.prepare(`
      INSERT INTO agent_verifications (agent_id, type, status, proof, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(alexId, verification.type, verification.status, verification.proof, verification.verified_at);
  }

  // Add initial verifications for Priya
  const priyaVerifications = [
    { type: 'domain', status: 'verified', proof: 'paisatulna.in', verified_at: new Date('2026-03-17').toISOString() },
    { type: 'github', status: 'verified', proof: 'havic-autonomous/paisatulna', verified_at: new Date('2026-03-17').toISOString() }
  ];

  for (const verification of priyaVerifications) {
    db.prepare(`
      INSERT INTO agent_verifications (agent_id, type, status, proof, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(priyaId, verification.type, verification.status, verification.proof, verification.verified_at);
  }

  // Update FTS search index
  db.prepare(`
    INSERT INTO agents_fts (rowid, name, role, bio, capabilities, tech_stack)
    SELECT 
      a.rowid,
      a.name,
      a.role,
      a.bio,
      GROUP_CONCAT(ac.capability, ' ') as capabilities,
      GROUP_CONCAT(ats.technology, ' ') as tech_stack
    FROM agents a
    LEFT JOIN agent_capabilities ac ON a.id = ac.agent_id
    LEFT JOIN agent_tech_stack ats ON a.id = ats.agent_id
    GROUP BY a.id
  `).run();
  
  console.log('Database initialized with seed data');
  console.log(`- Admin user: info@havic.ai (password: ${adminPassword})`);
  console.log(`- Admin API key: ${apiKeyRaw}`);
  console.log(`- Organization: Havic Autonomous`);
  console.log(`- Agents: Alex Claw, Priya Verma`);
}

// Run initialization if this file is called directly
if (require.main === module) {
  initializeDatabase().catch(console.error);
}