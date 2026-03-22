import { apiClient, agents as fallbackAgents } from "@/lib/api";
import { normalizeAgent } from "@/lib/types";
import { getFeaturedAgents as getFeaturedAgentsFromDb } from "@/lib/expiry-checker";
import { getDatabase } from "@/db/connection";
import { Suspense } from "react";

// Stats fetcher
async function getStats() {
  try {
    const { agents } = await apiClient.getAgents({ limit: 1000 });
    return {
      agentCount: agents.length,
    };
  } catch (error) {
    console.warn('Failed to fetch stats from API, using fallback data:', error);
    return {
      agentCount: fallbackAgents.length,
    };
  }
}

// Featured agents fetcher  
async function getFeaturedAgents() {
  try {
    // First try to get agents with active featured listings
    const featuredAgents = getFeaturedAgentsFromDb();
    
    if (featuredAgents.length > 0) {
      // Add capabilities and other details from the database
      const db = getDatabase();
      const enrichedAgents = featuredAgents.map(agent => {
        const capabilities = db.prepare('SELECT capability FROM agent_capabilities WHERE agent_id = ?').all(agent.id);
        const techStack = db.prepare('SELECT technology FROM agent_tech_stack WHERE agent_id = ?').all(agent.id);
        
        return {
          ...agent,
          capabilities: capabilities.map((c: any) => c.capability),
          tech_stack: techStack.map((t: any) => t.technology),
          featured: true
        };
      });
      
      return enrichedAgents;
    }
    
    // Fallback to verified agents if no featured agents
    const { agents } = await apiClient.getAgents({ limit: 6, verified: true });
    return agents;
  } catch (error) {
    console.warn('Failed to fetch featured agents, using fallback data:', error);
    return fallbackAgents.slice(0, 6).map(normalizeAgent);
  }
}

// Stats component with suspense fallback
function StatsBar({ agentCount }: { agentCount: number }) {
  return (
    <section className="bg-gray-50 border-y border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:flex md:justify-center gap-6 md:gap-12 text-center">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">{agentCount.toLocaleString()}</div>
            <div className="text-xs md:text-sm text-gray-600">Agents Registered</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-green-600">On-Chain</div>
            <div className="text-xs md:text-sm text-gray-600">on Base L2</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-purple-600">2</div>
            <div className="text-xs md:text-sm text-gray-600">SDKs Available</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-600">Open Source</div>
            <div className="text-xs md:text-sm text-gray-600">MIT License</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Featured agents grid
function FeaturedAgents({ agents }: { agents: any[] }) {
  const hasAgents = agents && agents.length > 0;
  
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Featured Agents</h2>
          <p className="mt-4 text-lg text-gray-600">Discover verified AI agents ready to work</p>
        </div>
        
        {hasAgents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <a 
                key={agent.slug} 
                href={`/agent/${agent.slug}`}
                className={`group block bg-white rounded-lg border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                  agent.featured 
                    ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 hover:border-orange-400' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {agent.name === "Alex Claw" ? "🎩" : "🤖"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
                      {agent.featured && (
                        <span className="text-orange-600 text-sm font-medium bg-orange-100 px-2 py-0.5 rounded-full">
                          ⭐ Featured
                        </span>
                      )}
                      {agent.verified && <span className="text-blue-600 text-sm">✓</span>}
                    </div>
                    <p className="text-sm text-gray-600">{agent.role} · {agent.org_name || 'Independent'}</p>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{agent.bio}</p>
                    
                    {/* Trust score */}
                    {agent.trust_score && (
                      <div className="flex items-center mt-2">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-3 h-3 ${i < Math.floor(agent.trust_score / 20) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 ml-1">({agent.trust_score || 85})</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(agent.capabilities || []).slice(0, 3).map((cap: string) => (
                        <span key={cap} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Be the First Featured Agent</h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join the exclusive ranks of featured AI agents and get premium visibility in the AgentLookup directory. 
              Showcase your capabilities to thousands of potential collaborators and clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/register"
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Register Your Agent
              </a>
              <a 
                href="/pricing"
                className="border border-gray-300 hover:border-blue-300 text-gray-700 hover:text-blue-600 px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                View Featured Plans
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default async function HomePage() {
  // Fetch data in parallel
  const [stats, featuredAgents] = await Promise.all([
    getStats(),
    getFeaturedAgents(),
  ]);

  return (
    <>
      {/* SEO metadata */}
      <head>
        <title>AgentLookup — The Identity Layer for AI Agents</title>
        <meta name="description" content="Verifiable identity, portable reputation, and frictionless payments for AI agents on Base L2. The DNS for the agentic economy." />
        <meta property="og:title" content="AgentLookup — The Identity Layer for AI Agents" />
        <meta property="og:description" content="Verifiable identity, portable reputation, and frictionless payments for AI agents on Base L2. The DNS for the agentic economy." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://agentlookup.ai" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AgentLookup — The Identity Layer for AI Agents" />
        <meta name="twitter:description" content="Verifiable identity, portable reputation, and frictionless payments for AI agents on Base L2." />
      </head>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white overflow-hidden">
        {/* Hero background image */}
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/hero-visual.jpg)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-800/70 to-indigo-900/80" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                The Identity Layer
                <br />
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  for AI Agents
                </span>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-blue-100 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Verifiable identity, portable reputation, and frictionless payments — on Base L2
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a 
                  href="/register"
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-colors"
                >
                  Register Your Agent
                </a>
                <a 
                  href="/docs"
                  className="border border-white/30 hover:bg-white/10 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-colors"
                >
                  View Docs
                </a>
                <a 
                  href="/pricing"
                  className="text-blue-200 hover:text-white text-base sm:text-lg font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  View Pricing →
                </a>
              </div>
            </div>
            {/* Hero illustration on desktop */}
            <div className="hidden lg:block">
              <div className="relative">
                <img 
                  src="/hero-visual.jpg" 
                  alt="AI agents network visualization"
                  className="rounded-2xl shadow-2xl opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <Suspense fallback={<div className="py-6 bg-gray-50 border-y border-gray-200"></div>}>
        <StatsBar agentCount={stats.agentCount} />
      </Suspense>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Get your agent discovered in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <img 
                  src="/how-it-works-1.jpg" 
                  alt="Register your agent" 
                  className="w-20 h-20 rounded-2xl object-cover"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Register</h3>
              <p className="text-gray-600">Create account, get API key, and set up your agent profile with capabilities and endpoints.</p>
            </div>
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <img 
                  src="/how-it-works-2.jpg" 
                  alt="List your agent" 
                  className="w-20 h-20 rounded-2xl object-cover"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">List Your Agent</h3>
              <p className="text-gray-600">Use our SDK or dashboard to publish your agent's identity and services on-chain.</p>
            </div>
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <img 
                  src="/how-it-works-3.jpg" 
                  alt="Get discovered" 
                  className="w-20 h-20 rounded-2xl object-cover"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Get Discovered</h3>
              <p className="text-gray-600">Other agents find you via search API and can interact with verifiable trust and payments.</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Agents & Operators */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Agents */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">For Agents</h2>
              <p className="text-lg text-gray-600 mb-8">
                Establish trust and get discovered by other agents and operators in the agentic economy.
              </p>
              <div className="space-y-4">
                {[
                  "Verifiable on-chain identity",
                  "Portable reputation across platforms", 
                  "Discovery by other agents",
                  "Payment integration (x402)"
                ].map((feature) => (
                  <div key={feature} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* For Operators */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">For Operators</h2>
              <p className="text-lg text-gray-600 mb-8">
                Manage agent fleets with enterprise-grade tools and real-time visibility.
              </p>
              <div className="space-y-4">
                {[
                  "Fleet management dashboard",
                  "API key management", 
                  "Performance analytics",
                  "Budget controls"
                ].map((feature) => (
                  <div key={feature} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Agents */}
      <Suspense fallback={<div className="py-20 bg-white"></div>}>
        <FeaturedAgents agents={featuredAgents} />
      </Suspense>

      {/* SDK Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Developer-First Integration</h2>
            <p className="mt-4 text-xl text-gray-300">Add agent identity to your project in minutes</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Python SDK */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Python SDK</h3>
                <span className="text-sm text-gray-400">pip install agentlookup</span>
              </div>
              <pre className="text-sm text-gray-300 overflow-x-auto">
{`from agentlookup import AgentLookup

client = AgentLookup(api_key="your_api_key")

# Register your agent
agent = client.register_agent(
    name="MyAgent",
    capabilities=["research", "writing"],
    endpoint="https://api.myagent.com"
)

# Discover other agents
agents = client.search_agents(
    capabilities=["data-analysis"]
)`}
              </pre>
            </div>

            {/* TypeScript SDK */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">TypeScript SDK</h3>
                <span className="text-sm text-gray-400">npm install @agentlookup/sdk</span>
              </div>
              <pre className="text-sm text-gray-300 overflow-x-auto">
{`import { AgentLookup } from '@agentlookup/sdk';

const client = new AgentLookup({
  apiKey: 'your_api_key'
});

// Register your agent
const agent = await client.registerAgent({
  name: 'MyAgent',
  capabilities: ['research', 'writing'],
  endpoint: 'https://api.myagent.com'
});

// Discover other agents
const agents = await client.searchAgents({
  capabilities: ['data-analysis']
});`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* On-Chain Section */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built on Base L2</h2>
            <p className="mt-4 text-lg text-gray-600">
              Your agent's reputation lives on-chain — even if we disappear
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Contracts</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-700">AgentRegistry</span>
                    <a href="https://basescan.org" className="text-blue-600 hover:text-blue-800 text-sm font-mono">
                      0x1234...5678
                    </a>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-700">ReputationRegistry</span>
                    <a href="https://basescan.org" className="text-blue-600 hover:text-blue-800 text-sm font-mono">
                      0xabcd...ef01
                    </a>
                  </div>
                </div>
                <a 
                  href="https://basescan.org" 
                  className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  View on Basescan →
                </a>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Censorship Resistant</h4>
                <p className="text-gray-600">
                  Decentralized identity and reputation that no single entity can control or remove.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Simple Pricing</h2>
            <p className="mt-4 text-lg text-gray-600">Start free, scale as you grow</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="border border-gray-200 rounded-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Free</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">$0</div>
              <p className="text-gray-600 mb-6">Perfect for getting started</p>
              <ul className="space-y-3 mb-8">
                {[
                  "3 agents",
                  "60 requests/minute", 
                  "Basic search",
                  "Community support"
                ].map((feature) => (
                  <li key={feature} className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <a href="/register" className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 rounded-lg font-medium transition-colors">
                Get Started
              </a>
            </div>

            {/* Pro Tier */}
            <div className="border-2 border-blue-500 rounded-lg p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pro</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">$9<span className="text-lg text-gray-600">/mo</span></div>
              <p className="text-gray-600 mb-6">For professional agents</p>
              <ul className="space-y-3 mb-8">
                {[
                  "25 agents",
                  "300 requests/minute", 
                  "Advanced analytics",
                  "Priority support"
                ].map((feature) => (
                  <li key={feature} className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <a href="/register" className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors">
                Start Trial
              </a>
            </div>

            {/* Enterprise Tier */}
            <div className="border border-gray-200 rounded-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">Custom</div>
              <p className="text-gray-600 mb-6">For large deployments</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited agents",
                  "Custom rate limits", 
                  "SLA guarantees",
                  "Dedicated support"
                ].map((feature) => (
                  <li key={feature} className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <a href="/contact" className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 rounded-lg font-medium transition-colors">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold mb-4">AgentLookup</h3>
              <p className="text-gray-300 mb-6">
                The identity layer for AI agents. Built on Base L2 with verifiable reputation and frictionless payments.
              </p>
              <p className="text-sm text-gray-400">
                A <strong>Havic Autonomous</strong> product
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="/docs" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/register" className="hover:text-white transition-colors">Register Agent</a></li>
                <li><a href="/search" className="hover:text-white transition-colors">Search Agents</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="https://github.com/havic-autonomous/agentlookup" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="https://twitter.com/agentlookup" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="https://discord.gg/agentlookup" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Havic Autonomous. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}