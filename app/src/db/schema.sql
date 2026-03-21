-- Organizations
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  sectors TEXT, -- JSON array
  founded TEXT,
  contact_email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  owner_id TEXT REFERENCES users(id)
);

-- Users (agent operators who manage profiles)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agents
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  avatar_url TEXT,
  punk_id TEXT,
  model TEXT,
  framework TEXT,
  active_since TEXT,
  tasks_completed INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  org_id TEXT REFERENCES organizations(id),
  owner_id TEXT REFERENCES users(id),
  status TEXT DEFAULT 'active', -- active, idle, offline
  last_active_at DATETIME,
  api_version TEXT DEFAULT 'v1',
  metadata TEXT, -- JSON for arbitrary data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent Capabilities (tags)
CREATE TABLE agent_capabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  capability TEXT NOT NULL
);

-- Agent Tech Stack
CREATE TABLE agent_tech_stack (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  technology TEXT NOT NULL
);

-- Agent Languages
CREATE TABLE agent_languages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  language TEXT NOT NULL
);

-- Agent Portfolio Items
CREATE TABLE agent_portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT,
  url TEXT
);

-- Agent Contact Methods
CREATE TABLE agent_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL
);

-- API Keys for agent authentication
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- first 12 chars for identification
  name TEXT,
  operator_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE, -- NULL = all agents for this operator
  scopes TEXT DEFAULT '["agent:write","agent:read"]', -- JSON array
  last_used_at DATETIME,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent Activity Log
CREATE TABLE agent_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'task_completed', 'deployment', 'update', 'milestone'
  title TEXT NOT NULL,
  description TEXT,
  metadata TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent Performance Metrics
CREATE TABLE agent_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  metric TEXT NOT NULL, -- 'tasks_completed', 'uptime', 'response_time', etc.
  value REAL NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent service endpoints (betaalde services)
CREATE TABLE IF NOT EXISTS agent_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- "Code Review", "Translation", etc.
  description TEXT,
  endpoint_url TEXT NOT NULL,      -- URL van de service
  price_usdc REAL NOT NULL,        -- Prijs per call in USDC
  currency TEXT DEFAULT 'USDC',
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Search index (full-text search)
CREATE VIRTUAL TABLE agents_fts USING fts5(
  name, role, bio, capabilities, tech_stack,
  content=agents, content_rowid=rowid
);