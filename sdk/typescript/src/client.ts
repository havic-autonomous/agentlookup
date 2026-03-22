import {
  Agent,
  Activity,
  AgentCard,
  AgentLookupConfig,
  AgentStatus,
  CreateActivityRequest,
  CreateAgentRequest,
  CreateMetricRequest,
  ListAgentsParams,
  Organization,
  SearchParams,
  SearchResult,
  StatusUpdateRequest,
  UpdateAgentRequest,
  OpenClawConfig,
  CrewAIConfig,
  LangChainConfig,
  GenericConfig,
  ImportResponse,
  VerificationProof
} from './types.js';
import {
  APIError,
  AuthError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ValidationError
} from './errors.js';

export class AgentLookup {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly userAgent = '@agentlookup/sdk/0.1.0';

  constructor(config: AgentLookupConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://agentlookup.ai';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': this.userAgent,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    const config: RequestInit = {
      ...options,
      headers
    };

    let attempt = 0;
    const maxRetries = 3;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new APIError('Invalid response format', response.status);
        }

        const data = await response.json() as any;
        
        if (!data.success && data.error) {
          throw new APIError(data.error, response.status, data);
        }

        return data.data || data;
      } catch (error) {
        if (error instanceof RateLimitError && attempt < maxRetries) {
          const delay = error.retryAfter ? error.retryAfter * 1000 : Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }
        
        if (error instanceof TypeError || error instanceof Error && error.message.includes('fetch')) {
          throw new NetworkError(`Network request failed: ${error.message}`);
        }
        
        throw error;
      }
    }

    throw new RateLimitError('Max retries exceeded');
  }

  private async handleErrorResponse(response: Response): Promise<void> {
    const contentType = response.headers.get('content-type');
    let errorData: any = {};
    
    try {
      if (contentType?.includes('application/json')) {
        errorData = await response.json();
      }
    } catch {
      // Ignore parsing errors for error responses
    }

    const message = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

    switch (response.status) {
      case 401:
        throw new AuthError(message, errorData);
      case 404:
        throw new NotFoundError(message, errorData);
      case 400:
        throw new ValidationError(message, errorData.errors || {}, errorData);
      case 429:
        const retryAfter = response.headers.get('retry-after');
        throw new RateLimitError(message, retryAfter ? parseInt(retryAfter, 10) : undefined, errorData);
      default:
        throw new APIError(message, response.status, errorData);
    }
  }

  // Agent CRUD Operations
  async createAgent(data: CreateAgentRequest): Promise<Agent> {
    return this.request<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getAgent(slug: string): Promise<Agent> {
    return this.request<Agent>(`/agents/${slug}`);
  }

  async getAgentCard(slug: string): Promise<AgentCard> {
    return this.request<AgentCard>(`/agents/${slug}/agent-card`);
  }

  async updateAgent(slug: string, data: UpdateAgentRequest): Promise<Agent> {
    return this.request<Agent>(`/agents/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteAgent(slug: string): Promise<void> {
    await this.request<void>(`/agents/${slug}`, {
      method: 'DELETE'
    });
  }

  async listAgents(params: ListAgentsParams = {}): Promise<SearchResult> {
    const searchParams = new URLSearchParams();
    
    if (params.org) searchParams.append('org', params.org);
    if (params.verified !== undefined) searchParams.append('verified', params.verified.toString());
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/agents?${queryString}` : '/agents';
    
    return this.request<SearchResult>(endpoint);
  }

  // Status Management
  async setStatus(slug: string, status: AgentStatus): Promise<void> {
    await this.request<void>(`/agents/${slug}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status } as StatusUpdateRequest)
    });
  }

  // Activity Logging
  async logActivity(slug: string, activity: CreateActivityRequest): Promise<Activity> {
    return this.request<Activity>(`/agents/${slug}/activity`, {
      method: 'POST',
      body: JSON.stringify(activity)
    });
  }

  async getActivities(slug: string): Promise<Activity[]> {
    return this.request<Activity[]>(`/agents/${slug}/activities`);
  }

  // Metrics
  async pushMetric(slug: string, metric: CreateMetricRequest): Promise<void> {
    await this.request<void>(`/agents/${slug}/metrics`, {
      method: 'POST',
      body: JSON.stringify(metric)
    });
  }

  // Discovery and Search
  async search(params: SearchParams = {}): Promise<SearchResult> {
    const searchParams = new URLSearchParams();
    
    if (params.q) searchParams.append('q', params.q);
    if (params.capability) searchParams.append('capability', params.capability);
    if (params.framework) searchParams.append('framework', params.framework);
    if (params.model) searchParams.append('model', params.model);
    if (params.min_tasks) searchParams.append('min_tasks', params.min_tasks.toString());
    if (params.verified !== undefined) searchParams.append('verified', params.verified.toString());
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/search?${queryString}` : '/search';
    
    return this.request<SearchResult>(endpoint);
  }

  async listCapabilities(): Promise<string[]> {
    return this.request<string[]>('/capabilities');
  }

  async listFrameworks(): Promise<string[]> {
    return this.request<string[]>('/frameworks');
  }

  // Organizations
  async getOrg(slug: string): Promise<Organization> {
    return this.request<Organization>(`/orgs/${slug}`);
  }

  // Services management
  async listServices(slug: string): Promise<Service[]> {
    return this.request<Service[]>(`/agents/${slug}/services`);
  }

  async getService(slug: string, serviceId: number): Promise<ServiceDetail> {
    return this.request<ServiceDetail>(`/agents/${slug}/services/${serviceId}`);
  }

  async registerService(slug: string, service: CreateServiceInput): Promise<Service> {
    return this.request<Service>(`/agents/${slug}/services`, {
      method: 'POST',
      body: JSON.stringify(service)
    });
  }

  // Verification methods

  async startVerification(slug: string, type: string, proof?: VerificationProof): Promise<any> {
    const data: any = { type };
    if (proof) {
      data.proof = proof;
    }
    return this.request(`/agents/${slug}/verify`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async checkVerification(slug: string, type: string): Promise<any> {
    return this.request(`/agents/${slug}/verify/${type}`);
  }

  async submitDomainVerification(slug: string, domain: string): Promise<any> {
    return this.request(`/agents/${slug}/verify/domain`, {
      method: 'POST',
      body: JSON.stringify({ domain })
    });
  }

  async submitGithubVerification(slug: string, repo: string): Promise<any> {
    return this.request(`/agents/${slug}/verify/github`, {
      method: 'POST',
      body: JSON.stringify({ repo })
    });
  }

  async submitTwitterVerification(slug: string, handle: string, tweet_url?: string): Promise<any> {
    const data: any = { handle };
    if (tweet_url) {
      data.tweet_url = tweet_url;
    }
    return this.request(`/agents/${slug}/verify/twitter`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async checkOnchainVerification(slug: string): Promise<any> {
    return this.request(`/agents/${slug}/verify/onchain`);
  }

  async getTrustScore(slug: string): Promise<number> {
    const agent = await this.getAgent(slug);
    return agent.trust_score || 0;
  }

  async listVerifications(slug: string): Promise<any> {
    return this.request(`/agents/${slug}/verify`);
  }

  // Framework Import Methods

  /**
   * Import an agent from OpenClaw configuration.
   * 
   * @param config OpenClaw agent configuration
   * @returns Promise resolving to created Agent with API key
   * 
   * @example
   * ```typescript
   * const config = {
   *   name: "My Research Assistant",
   *   model: "anthropic/claude-sonnet-4",
   *   workspace: "/path/to/workspace", 
   *   capabilities: ["research", "web_search", "analysis"],
   *   description: "AI research assistant for market analysis"
   * };
   * const result = await client.importFromOpenClaw(config);
   * console.log(`Created agent: ${result.agent.name}`);
   * console.log(`API Key: ${result.api_key}`);
   * ```
   */
  async importFromOpenClaw(config: OpenClawConfig): Promise<ImportResponse> {
    return this.request<ImportResponse>('/import/openclaw', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Import an agent from CrewAI configuration.
   * 
   * @param config CrewAI agent configuration
   * @returns Promise resolving to created Agent with API key
   * 
   * @example
   * ```typescript
   * const config = {
   *   role: "Senior Data Analyst",
   *   goal: "Analyze complex datasets and provide insights", 
   *   backstory: "Expert analyst with years of experience",
   *   tools: ["web_search", "file_reader", "calculator"],
   *   llm: "gpt-4"
   * };
   * const result = await client.importFromCrewAI(config);
   * console.log(`Created agent: ${result.agent.name}`);
   * console.log(`API Key: ${result.api_key}`);
   * ```
   */
  async importFromCrewAI(config: CrewAIConfig): Promise<ImportResponse> {
    return this.request<ImportResponse>('/import/crewai', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Import an agent from LangChain configuration.
   * 
   * @param config LangChain agent configuration
   * @returns Promise resolving to created Agent with API key
   * 
   * @example
   * ```typescript
   * const config = {
   *   agent_type: "conversational-react-description",
   *   name: "Customer Support Agent",
   *   tools: ["search", "email", "calculator"],
   *   model: "gpt-3.5-turbo",
   *   memory: { type: "conversation_buffer", k: 5 }
   * };
   * const result = await client.importFromLangChain(config);
   * console.log(`Created agent: ${result.agent.name}`);
   * console.log(`API Key: ${result.api_key}`);
   * ```
   */
  async importFromLangChain(config: LangChainConfig): Promise<ImportResponse> {
    return this.request<ImportResponse>('/import/langchain', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Generic agent import for any framework or custom configuration.
   * 
   * @param config Generic agent configuration
   * @returns Promise resolving to created Agent with API key
   * 
   * @example
   * ```typescript
   * const config = {
   *   name: "Content Creator Bot",
   *   description: "AI agent for social media content creation",
   *   role: "Content Creator",
   *   framework: "Custom",
   *   capabilities: ["writing", "social_media", "seo"],
   *   tools: ["image_generation", "text_analysis"],
   *   website: "https://myagent.com"
   * };
   * const result = await client.importAgent(config);
   * console.log(`Created agent: ${result.agent.name}`);
   * console.log(`API Key: ${result.api_key}`);
   * ```
   */
  async importAgent(config: GenericConfig): Promise<ImportResponse> {
    return this.request<ImportResponse>('/import/generic', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }
}

// Services types
export interface Service {
  id: number;
  name: string;
  description?: string;
  endpoint_url: string;
  price_usdc: number;
  currency: string;
  active: boolean;
  created_at: string;
}

export interface ServiceDetail {
  data: {
    service: Service & {
      agent: {
        slug: string;
        name: string;
      };
    };
    payment: {
      protocol: string;
      chain: string;
      chainId: number;
      currency: string;
      amount: string;
      recipient: string;
      network: string;
      maxAmountRequired: string;
      resource: string;
      description: string;
      payTo: string;
      asset: string;
      network_eip155: string;
    };
  };
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  endpoint_url: string;
  price_usdc: number;
  currency?: string;
  active?: boolean;
}