'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-client';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/auth-client';

interface Agent {
  id: string;
  name: string;
  slug: string;
  role?: string;
  bio?: string;
  status: string;
  capabilities: string[];
  tech_stack: string[];
  tasks_completed: number;
  created_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string; // This is masked except when first created
  scopes: string[];
  agent?: {
    name: string;
    slug: string;
  } | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

interface DashboardStats {
  analytics_overview: {
    total_api_calls_24h: number;
    total_api_calls_7d: number;
    total_api_calls_30d: number;
    average_response_time: number;
    error_rate_24h: number;
    most_used_endpoints: Array<{ endpoint: string; count: number }>;
  };
  agent_performance: Array<{
    agent_slug: string;
    agent_name: string;
    views_24h: number;
    api_calls_24h: number;
    api_calls_7d: number;
    last_activity: string | null;
    trust_score: number;
  }>;
  api_key_usage: Array<{
    key_id: string;
    key_name: string;
    key_prefix: string;
    total_calls_24h: number;
    total_calls_7d: number;
    last_used: string | null;
    avg_response_time: number;
  }>;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  
  // New agent form state
  const [showNewAgentForm, setShowNewAgentForm] = useState(false);
  const [newAgentData, setNewAgentData] = useState({
    name: '',
    role: '',
    bio: '',
    capabilities: '',
    tech_stack: '',
  });
  const [submittingAgent, setSubmittingAgent] = useState(false);
  
  // New API key form state
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    agent_id: '',
  });
  const [submittingKey, setSubmittingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load dashboard data
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);
      
      // Load user's agents
      const agentsResponse = await apiCall('/api/v1/agents');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData.data || []);
      }
      
      // Load user's API keys
      const keysResponse = await apiCall('/api/v1/auth/api-keys');
      if (keysResponse.ok) {
        const keysData = await keysResponse.json();
        setApiKeys(keysData.data || []);
      }

      // Load dashboard analytics
      const statsResponse = await apiCall('/api/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setDashboardStats(statsData.data);
      }
      
    } catch (error) {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAgentData.name.trim()) {
      showToast('Agent name is required', 'error');
      return;
    }

    setSubmittingAgent(true);
    
    try {
      const response = await apiCall('/api/v1/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: newAgentData.name.trim(),
          role: newAgentData.role.trim() || undefined,
          bio: newAgentData.bio.trim() || undefined,
          capabilities: newAgentData.capabilities.split(',').map(s => s.trim()).filter(s => s),
          tech_stack: newAgentData.tech_stack.split(',').map(s => s.trim()).filter(s => s),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAgents(prev => [data.data, ...prev]);
        setNewAgentData({ name: '', role: '', bio: '', capabilities: '', tech_stack: '' });
        setShowNewAgentForm(false);
        showToast('Agent created successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create agent', 'error');
      }
    } catch (error) {
      showToast('Network error while creating agent', 'error');
    } finally {
      setSubmittingAgent(false);
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`Are you sure you want to delete "${agentName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiCall(`/api/v1/agents/${agentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
        showToast('Agent deleted successfully', 'success');
      } else {
        showToast('Failed to delete agent', 'error');
      }
    } catch (error) {
      showToast('Network error while deleting agent', 'error');
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newKeyData.name.trim()) {
      showToast('API key name is required', 'error');
      return;
    }

    setSubmittingKey(true);
    
    try {
      const response = await apiCall('/api/v1/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: newKeyData.name.trim(),
          agent_id: newKeyData.agent_id || undefined,
          scopes: ['agent:read', 'agent:write'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedKey(data.data.key);
        setApiKeys(prev => [{ ...data.data, key: data.data.key.substring(0, 12) + '****' + data.data.key.slice(-4) }, ...prev]);
        setNewKeyData({ name: '', agent_id: '' });
        setShowNewKeyForm(false);
        showToast('API key created successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create API key', 'error');
      }
    } catch (error) {
      showToast('Network error while creating API key', 'error');
    } finally {
      setSubmittingKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke "${keyName}"? This will immediately stop all API access using this key.`)) {
      return;
    }

    try {
      const response = await apiCall(`/api/v1/auth/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId));
        showToast('API key revoked successfully', 'success');
      } else {
        showToast('Failed to revoke API key', 'error');
      }
    } catch (error) {
      showToast('Network error while revoking API key', 'error');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-[var(--color-muted)]">Loading dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">
            Dashboard
          </h1>
          <p className="text-[var(--color-muted)]">
            Welcome back, {user.name || user.email}
          </p>
        </div>

        {/* Analytics Overview */}
        {dashboardStats && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-6">
              Analytics Overview
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-[var(--color-card)] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[var(--color-text)]">
                  {dashboardStats.analytics_overview.total_api_calls_24h.toLocaleString()}
                </div>
                <div className="text-sm text-[var(--color-muted)]">API Calls (24h)</div>
              </div>
              
              <div className="bg-[var(--color-card)] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[var(--color-text)]">
                  {dashboardStats.analytics_overview.total_api_calls_7d.toLocaleString()}
                </div>
                <div className="text-sm text-[var(--color-muted)]">API Calls (7d)</div>
              </div>
              
              <div className="bg-[var(--color-card)] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[var(--color-text)]">
                  {dashboardStats.analytics_overview.total_api_calls_30d.toLocaleString()}
                </div>
                <div className="text-sm text-[var(--color-muted)]">API Calls (30d)</div>
              </div>
              
              <div className="bg-[var(--color-card)] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[var(--color-text)]">
                  {dashboardStats.analytics_overview.average_response_time}ms
                </div>
                <div className="text-sm text-[var(--color-muted)]">Avg Response</div>
              </div>
              
              <div className="bg-[var(--color-card)] rounded-lg p-4 text-center">
                <div className={`text-2xl font-bold ${
                  dashboardStats.analytics_overview.error_rate_24h < 5 ? 'text-green-600' : 
                  dashboardStats.analytics_overview.error_rate_24h < 15 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {dashboardStats.analytics_overview.error_rate_24h}%
                </div>
                <div className="text-sm text-[var(--color-muted)]">Error Rate (24h)</div>
              </div>
            </div>

            {/* Most Used Endpoints */}
            <div className="bg-[var(--color-card)] rounded-lg p-6">
              <h3 className="font-semibold text-[var(--color-text)] mb-4">Most Used Endpoints</h3>
              {dashboardStats.analytics_overview.most_used_endpoints.length === 0 ? (
                <p className="text-[var(--color-muted)]">No API usage yet</p>
              ) : (
                <div className="space-y-2">
                  {dashboardStats.analytics_overview.most_used_endpoints.map((endpoint, index) => (
                    <div key={endpoint.endpoint} className="flex items-center justify-between">
                      <span className="text-[var(--color-text)] font-mono text-sm">{endpoint.endpoint}</span>
                      <span className="text-[var(--color-muted)]">{endpoint.count} calls</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Agent Performance */}
        {dashboardStats && dashboardStats.agent_performance.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-6">
              Agent Performance
            </h2>
            
            <div className="bg-[var(--color-card)] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--color-bg)]">
                    <tr>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Agent</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">API Calls (24h)</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">API Calls (7d)</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Last Activity</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Trust Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardStats.agent_performance.map(agent => (
                      <tr key={agent.agent_slug} className="border-t border-[var(--color-border)]">
                        <td className="p-4 font-medium text-[var(--color-text)]">{agent.agent_name}</td>
                        <td className="p-4 text-[var(--color-text)]">{agent.api_calls_24h.toLocaleString()}</td>
                        <td className="p-4 text-[var(--color-text)]">{agent.api_calls_7d.toLocaleString()}</td>
                        <td className="p-4 text-[var(--color-muted)]">
                          {agent.last_activity ? new Date(agent.last_activity).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            agent.trust_score >= 80 ? 'bg-green-100 text-green-700' :
                            agent.trust_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {agent.trust_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* API Key Usage */}
        {dashboardStats && dashboardStats.api_key_usage.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-6">
              API Key Usage
            </h2>
            
            <div className="bg-[var(--color-card)] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--color-bg)]">
                    <tr>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Key Name</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Calls (24h)</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Calls (7d)</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Last Used</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Avg Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardStats.api_key_usage.map(key => (
                      <tr key={key.key_id} className="border-t border-[var(--color-border)]">
                        <td className="p-4 font-medium text-[var(--color-text)]">{key.key_name}</td>
                        <td className="p-4 text-[var(--color-text)]">{key.total_calls_24h.toLocaleString()}</td>
                        <td className="p-4 text-[var(--color-text)]">{key.total_calls_7d.toLocaleString()}</td>
                        <td className="p-4 text-[var(--color-muted)]">
                          {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="p-4 text-[var(--color-muted)]">{key.avg_response_time}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* My Agents Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">
              My Agents
            </h2>
            <button
              onClick={() => setShowNewAgentForm(true)}
              className="bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-accent)]/90 transition-colors"
            >
              Register New Agent
            </button>
          </div>

          {agents.length === 0 ? (
            <div className="bg-[var(--color-card)] rounded-lg p-8 text-center">
              <p className="text-[var(--color-muted)] mb-4">
                You haven't registered any agents yet.
              </p>
              <button
                onClick={() => setShowNewAgentForm(true)}
                className="bg-[var(--color-accent)] text-white px-6 py-3 rounded-lg hover:bg-[var(--color-accent)]/90 transition-colors"
              >
                Register Your First Agent
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map(agent => (
                <div key={agent.id} className="bg-[var(--color-card)] rounded-lg p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[var(--color-text)]">{agent.name}</h3>
                      {agent.role && <p className="text-sm text-[var(--color-muted)]">{agent.role}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button className="text-[var(--color-accent)] hover:text-[var(--color-accent)]/80 text-sm">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAgent(agent.id, agent.name)}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {agent.bio && (
                    <p className="text-sm text-[var(--color-muted)] mb-3 line-clamp-2">
                      {agent.bio}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.status === 'active' ? 'bg-green-100 text-green-700' :
                      agent.status === 'idle' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {agent.status}
                    </span>
                    <span className="text-[var(--color-muted)]">
                      {agent.tasks_completed} tasks
                    </span>
                  </div>
                  
                  {agent.capabilities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {agent.capabilities.slice(0, 3).map(capability => (
                        <span
                          key={capability}
                          className="text-xs bg-[var(--color-bg)] px-2 py-1 rounded"
                        >
                          {capability}
                        </span>
                      ))}
                      {agent.capabilities.length > 3 && (
                        <span className="text-xs text-[var(--color-muted)]">
                          +{agent.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* API Keys Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">
              API Keys
            </h2>
            <button
              onClick={() => setShowNewKeyForm(true)}
              className="bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-accent)]/90 transition-colors"
            >
              Create New Key
            </button>
          </div>

          <div className="bg-[var(--color-card)] rounded-lg overflow-hidden">
            {apiKeys.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[var(--color-muted)] mb-4">
                  No API keys created yet.
                </p>
                <button
                  onClick={() => setShowNewKeyForm(true)}
                  className="bg-[var(--color-accent)] text-white px-6 py-3 rounded-lg hover:bg-[var(--color-accent)]/90 transition-colors"
                >
                  Create Your First API Key
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--color-bg)]">
                    <tr>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Name</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Key</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Agent</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Last Used</th>
                      <th className="text-left p-4 font-medium text-[var(--color-text)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map(key => (
                      <tr key={key.id} className="border-t border-[var(--color-border)]">
                        <td className="p-4 font-medium text-[var(--color-text)]">{key.name}</td>
                        <td className="p-4 font-mono text-sm text-[var(--color-muted)]">{key.key}</td>
                        <td className="p-4 text-[var(--color-muted)]">
                          {key.agent ? key.agent.name : 'All agents'}
                        </td>
                        <td className="p-4 text-[var(--color-muted)]">
                          {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleRevokeApiKey(key.id, key.name)}
                            className="text-red-500 hover:text-red-600 text-sm"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Quick Start Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-6">
            Quick Start
          </h2>
          
          <div className="bg-[var(--color-card)] rounded-lg p-6">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">
              Start using the AgentLookup API
            </h3>
            
            {apiKeys.length === 0 ? (
              <p className="text-[var(--color-muted)] mb-4">
                Create an API key above to see code examples.
              </p>
            ) : (
              <div>
                <p className="text-[var(--color-muted)] mb-4">
                  Use your API key to register and manage agents programmatically:
                </p>
                
                <div className="bg-[var(--color-bg)] rounded p-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-[var(--color-text)]">{`curl -X POST https://agentlookup.ai/api/v1/agents \\
  -H "Authorization: Bearer ${apiKeys[0]?.key || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My AI Assistant",
    "role": "Customer Support Agent",
    "bio": "Specialized in handling customer inquiries",
    "capabilities": ["natural_language", "task_automation"],
    "tech_stack": ["OpenAI", "Python", "FastAPI"]
  }'`}</pre>
                </div>
                
                <p className="text-[var(--color-muted)] mt-4 text-sm">
                  View the full API documentation at{' '}
                  <a href="/docs" className="text-[var(--color-accent)] hover:underline">
                    agentlookup.ai/docs
                  </a>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* New Agent Modal */}
        {showNewAgentForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--color-card)] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                Register New Agent
              </h3>
              
              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAgentData.name}
                    onChange={(e) => setNewAgentData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    placeholder="e.g., Marketing Assistant"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    value={newAgentData.role}
                    onChange={(e) => setNewAgentData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    placeholder="e.g., Content Creator"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Bio
                  </label>
                  <textarea
                    value={newAgentData.bio}
                    onChange={(e) => setNewAgentData(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    rows={3}
                    placeholder="Describe what this agent does..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Capabilities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newAgentData.capabilities}
                    onChange={(e) => setNewAgentData(prev => ({ ...prev, capabilities: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    placeholder="e.g., natural_language, content_creation, social_media"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Tech Stack (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newAgentData.tech_stack}
                    onChange={(e) => setNewAgentData(prev => ({ ...prev, tech_stack: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    placeholder="e.g., OpenAI, Python, LangChain"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submittingAgent}
                    className="flex-1 bg-[var(--color-accent)] text-white py-2 px-4 rounded-md hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
                  >
                    {submittingAgent ? 'Creating...' : 'Create Agent'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewAgentForm(false)}
                    className="px-4 py-2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New API Key Modal */}
        {showNewKeyForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--color-card)] rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                Create New API Key
              </h3>
              
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Key Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newKeyData.name}
                    onChange={(e) => setNewKeyData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    placeholder="e.g., Production API Key"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Restrict to Agent (optional)
                  </label>
                  <select
                    value={newKeyData.agent_id}
                    onChange={(e) => setNewKeyData(prev => ({ ...prev, agent_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  >
                    <option value="">All agents</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    Leave blank to allow access to all your agents
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submittingKey}
                    className="flex-1 bg-[var(--color-accent)] text-white py-2 px-4 rounded-md hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
                  >
                    {submittingKey ? 'Creating...' : 'Create Key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewKeyForm(false)}
                    className="px-4 py-2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Newly Created Key Modal */}
        {newlyCreatedKey && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--color-card)] rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-4">
                API Key Created Successfully!
              </h3>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 text-sm font-medium mb-2">
                  ⚠️ Important: Save this key now!
                </p>
                <p className="text-yellow-700 text-sm">
                  This is the only time the full key will be shown. Store it securely.
                </p>
              </div>
              
              <div className="bg-[var(--color-bg)] rounded p-4 font-mono text-sm break-all">
                {newlyCreatedKey}
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setNewlyCreatedKey(null)}
                  className="bg-[var(--color-accent)] text-white px-6 py-2 rounded-md hover:bg-[var(--color-accent)]/90"
                >
                  I've Saved The Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}