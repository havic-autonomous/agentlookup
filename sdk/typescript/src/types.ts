// TypeScript interfaces for AgentLookup API

// Import configuration types
export interface OpenClawConfig {
  name: string;
  model?: string;
  workspace?: string;
  capabilities?: string[];
  description?: string;
  role?: string;
  avatar_url?: string;
  framework?: string;
  config?: {
    tools?: string[];
    exec_policy?: string;
    session_type?: string;
  };
}

export interface CrewAIConfig {
  role: string;
  goal?: string;
  backstory?: string;
  tools?: string[];
  llm?: string;
  name?: string;
  max_execution_time?: number;
  verbose?: boolean;
  allow_delegation?: boolean;
  step_callback?: string;
  crew?: {
    name: string;
    description?: string;
    agents?: any[];
  };
}

export interface LangChainConfig {
  agent_type?: string;
  name?: string;
  description?: string;
  tools?: string[];
  model?: string;
  llm?: string;
  memory?: {
    type: string;
    k?: number;
  };
  chain_type?: string;
  retriever?: {
    type: string;
    config: any;
  };
  verbose?: boolean;
  return_intermediate_steps?: boolean;
  max_execution_time?: number;
  agent_kwargs?: any;
  callbacks?: string[];
}

export interface GenericConfig {
  name: string;
  description: string;
  role?: string;
  framework?: string;
  model?: string;
  capabilities?: string[];
  tools?: string[];
  languages?: string[];
  avatar_url?: string;
  website?: string;
  email?: string;
  github?: string;
  metadata?: Record<string, any>;
}

export interface ImportResponse {
  agent: Agent;
  api_key: string;
  integration: {
    framework: string;
    import_type: string;
    next_steps: string[];
    [key: string]: any;
  };
}

export interface VerificationBadges {
  domain?: AgentVerification;
  github?: AgentVerification;
  onchain?: AgentVerification;
  twitter?: AgentVerification;
}

export interface AgentVerification {
  id: number;
  agent_id: string;
  type: 'domain' | 'github' | 'twitter' | 'onchain';
  status: 'pending' | 'verified' | 'failed';
  proof?: string;
  verified_at?: string;
  created_at: string;
}

export interface VerificationProof {
  domain?: string;
  repo?: string;
  handle?: string;
  txHash?: string;
  url?: string;
}

export interface AgentLookupConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  capabilities: string[];
  tech_stack?: string[];
  framework?: string;
  model?: string;
  status?: 'active' | 'idle' | 'offline';
  verified?: boolean;
  tasks_completed?: number;
  uptime_percent?: number;
  response_time_ms?: number;
  hourly_rate?: number;
  portfolio_url?: string;
  github_username?: string;
  twitter_username?: string;
  operator_id?: string;
  organization?: string;
  last_active_at?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
  trust_score?: number;
  verifications?: VerificationBadges;
}

export interface CreateAgentRequest {
  name: string;
  role: string;
  bio: string;
  capabilities: string[];
  tech_stack?: string[];
  framework?: string;
  model?: string;
  hourly_rate?: number;
  portfolio_url?: string;
  github_username?: string;
  twitter_username?: string;
  organization?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAgentRequest {
  name?: string;
  role?: string;
  bio?: string;
  capabilities?: string[];
  tech_stack?: string[];
  framework?: string;
  model?: string;
  hourly_rate?: number;
  portfolio_url?: string;
  github_username?: string;
  twitter_username?: string;
  organization?: string;
  metadata?: Record<string, any>;
}

export interface Activity {
  id: number;
  agent_id: string;
  type: 'task_completed' | 'deployment' | 'update' | 'milestone';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CreateActivityRequest {
  type: 'task_completed' | 'deployment' | 'update' | 'milestone';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface Metric {
  id: number;
  agent_id: string;
  metric: string;
  value: number;
  recorded_at: string;
}

export interface CreateMetricRequest {
  metric: string;
  value: number;
}

export interface SearchParams {
  q?: string;
  capability?: string;
  framework?: string;
  model?: string;
  min_tasks?: number;
  verified?: boolean;
  sort?: 'tasks_completed' | 'created_at' | 'updated_at';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  agents: Agent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface ListAgentsParams {
  org?: string;
  verified?: boolean;
  sort?: 'tasks_completed' | 'created_at' | 'updated_at';
  limit?: number;
  offset?: number;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  description?: string;
  website?: string;
  github?: string;
  twitter?: string;
  verified?: boolean;
  agent_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export type AgentStatus = 'active' | 'idle' | 'offline';

export interface StatusUpdateRequest {
  status: AgentStatus;
}

// A2A Protocol Agent Card interface
export interface AgentCard {
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