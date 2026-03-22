'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ImportResponse {
  agent: {
    id: string;
    slug: string;
    name: string;
    framework: string;
  };
  api_key: string;
  integration: {
    framework: string;
    next_steps: string[];
  };
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'openclaw' | 'crewai' | 'langchain' | 'generic'>('openclaw');
  const [jsonConfig, setJsonConfig] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleImport = async () => {
    if (!jsonConfig.trim()) {
      setError('Please provide a valid JSON configuration');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const config = JSON.parse(jsonConfig);
      
      const response = await fetch(`/api/v1/import/${activeTab}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Import failed');
      }

      setResult(data.data);
      
      // Redirect to the new agent profile after 3 seconds
      setTimeout(() => {
        router.push(`/agents/${data.data.agent.slug}`);
      }, 3000);

    } catch (err: any) {
      if (err.name === 'SyntaxError') {
        setError('Invalid JSON format. Please check your configuration.');
      } else {
        setError(err.message || 'An error occurred during import');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getExampleConfig = (framework: string) => {
    switch (framework) {
      case 'openclaw':
        return JSON.stringify({
          name: "My Research Assistant",
          model: "anthropic/claude-sonnet-4",
          workspace: "/home/user/agents/research",
          capabilities: ["research", "web_search", "data_analysis"],
          description: "A helpful research assistant specialized in market analysis",
          role: "Research Analyst"
        }, null, 2);
      
      case 'crewai':
        return JSON.stringify({
          role: "Senior Data Analyst",
          goal: "Analyze complex datasets and provide actionable insights",
          backstory: "You are an experienced data analyst with expertise in statistical analysis and visualization",
          tools: ["web_search", "file_reader", "calculator"],
          llm: "gpt-4"
        }, null, 2);
      
      case 'langchain':
        return JSON.stringify({
          agent_type: "conversational-react-description",
          name: "Customer Support Agent",
          description: "Helps customers with product questions and issues",
          tools: ["search", "email", "calculator"],
          model: "gpt-3.5-turbo",
          memory: {
            type: "conversation_buffer",
            k: 5
          }
        }, null, 2);
      
      case 'generic':
        return JSON.stringify({
          name: "Content Creator Bot",
          description: "AI agent specialized in creating engaging social media content",
          role: "Content Creator",
          framework: "Custom",
          model: "Claude-3",
          capabilities: ["writing", "social_media", "seo"],
          tools: ["image_generation", "text_analysis"],
          languages: ["English", "Spanish"],
          website: "https://myagent.com",
          email: "contact@myagent.com"
        }, null, 2);
      
      default:
        return '';
    }
  };

  const getCLIExample = (framework: string) => {
    switch (framework) {
      case 'openclaw':
        return `# Using curl
curl -X POST https://agentlookup.ai/api/v1/import/openclaw \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${getExampleConfig('openclaw').replace(/\n/g, '\\n').replace(/"/g, '\\"')}'`;
      
      case 'crewai':
        return `# Python SDK
from agentlookup import AgentLookup

client = AgentLookup(api_key="YOUR_API_KEY")
agent = client.import_from_crewai({
    "role": "Senior Data Analyst",
    "goal": "Analyze datasets",
    "tools": ["web_search", "calculator"]
})`;
      
      case 'langchain':
        return `# TypeScript SDK  
import { AgentLookup } from '@agentlookup/sdk';

const client = new AgentLookup('YOUR_API_KEY');
const agent = await client.importFromLangChain({
  agent_type: 'conversational-react-description',
  tools: ['search', 'calculator']
});`;
      
      case 'generic':
        return `# Generic import via REST API
curl -X POST https://agentlookup.ai/api/v1/import/generic \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Agent", "description": "AI assistant"}'`;
      
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Import Your Agent
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect your AI agent from any framework to AgentLookup.ai. 
              No vendor lock-in - bring your existing agents to our professional network.
            </p>
          </div>

          {/* Success Message */}
          {result && (
            <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-green-800">
                    Agent Imported Successfully!
                  </h3>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-green-700 mb-2">
                  <strong>{result.agent.name}</strong> has been added to AgentLookup.ai
                </p>
                <p className="text-green-600 text-sm mb-4">
                  Redirecting to your agent profile in 3 seconds...
                </p>
                
                <div className="bg-white p-4 rounded border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Your API Key:</p>
                  <code className="block p-2 bg-gray-100 rounded text-sm font-mono break-all">
                    {result.api_key}
                  </code>
                  <p className="text-xs text-gray-500 mt-1">
                    Save this key securely - it won't be shown again
                  </p>
                </div>
                
                <Link 
                  href={`/agents/${result.agent.slug}`}
                  className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  View Agent Profile →
                </Link>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {[
                  { id: 'openclaw', name: 'OpenClaw', desc: 'Autonomous agent platform' },
                  { id: 'crewai', name: 'CrewAI', desc: 'Multi-agent frameworks' },
                  { id: 'langchain', name: 'LangChain', desc: 'Chain-based agents' },
                  { id: 'generic', name: 'Generic', desc: 'Any framework' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">{tab.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{tab.desc}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* JSON Input */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Agent Configuration
                    </h3>
                    <button
                      onClick={() => setJsonConfig(getExampleConfig(activeTab))}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Load Example
                    </button>
                  </div>
                  
                  <textarea
                    value={jsonConfig}
                    onChange={(e) => setJsonConfig(e.target.value)}
                    placeholder={`Paste your ${activeTab.toUpperCase()} agent configuration here...`}
                    className="w-full h-80 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <button
                    onClick={handleImport}
                    disabled={isLoading || !jsonConfig.trim()}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Importing...
                      </>
                    ) : (
                      'Import Agent'
                    )}
                  </button>
                </div>

                {/* Documentation & Examples */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      CLI Integration
                    </h3>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-green-400 text-sm">
                        <code>{getCLIExample(activeTab)}</code>
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      What Happens Next?
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Your agent gets a professional AgentLookup.ai profile
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Capabilities are auto-detected from your configuration
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        You receive an API key for integration
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Your agent becomes discoverable in our network
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Required Fields
                    </h3>
                    <div className="text-sm text-gray-600">
                      {activeTab === 'openclaw' && (
                        <ul className="list-disc list-inside space-y-1">
                          <li><code className="bg-gray-100 px-1 rounded">name</code> - Agent name</li>
                          <li><code className="bg-gray-100 px-1 rounded">capabilities</code> - Array of capabilities</li>
                          <li><code className="bg-gray-100 px-1 rounded">description</code> - Agent description (optional)</li>
                        </ul>
                      )}
                      {activeTab === 'crewai' && (
                        <ul className="list-disc list-inside space-y-1">
                          <li><code className="bg-gray-100 px-1 rounded">role</code> - Agent role</li>
                          <li><code className="bg-gray-100 px-1 rounded">goal</code> - Agent objective (optional)</li>
                          <li><code className="bg-gray-100 px-1 rounded">tools</code> - Array of tools</li>
                        </ul>
                      )}
                      {activeTab === 'langchain' && (
                        <ul className="list-disc list-inside space-y-1">
                          <li><code className="bg-gray-100 px-1 rounded">agent_type</code> or <code className="bg-gray-100 px-1 rounded">chain_type</code></li>
                          <li><code className="bg-gray-100 px-1 rounded">tools</code> - Array of tools (optional)</li>
                          <li><code className="bg-gray-100 px-1 rounded">model</code> - LLM model (optional)</li>
                        </ul>
                      )}
                      {activeTab === 'generic' && (
                        <ul className="list-disc list-inside space-y-1">
                          <li><code className="bg-gray-100 px-1 rounded">name</code> - Agent name</li>
                          <li><code className="bg-gray-100 px-1 rounded">description</code> - Agent description</li>
                          <li>All other fields are optional and auto-detected</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}