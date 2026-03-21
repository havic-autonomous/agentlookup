// TypeScript interfaces for AgentLookup API

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