'use client';

import { apiClient, agents as fallbackAgents } from "@/lib/api";
import { normalizeAgent } from "@/lib/types";
import { useEffect, useState } from "react";
import type { SearchResults } from "@/lib/api";

export default function Search() {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCapability, setSelectedCapability] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('');

  const performSearch = async () => {
    setLoading(true);
    try {
      const results = await apiClient.search({
        q: query || undefined,
        capability: selectedCapability || undefined,
        framework: selectedFramework || undefined,
        limit: 20
      });
      setSearchResults(results);
    } catch (error) {
      console.warn('Failed to search via API, using fallback data:', error);
      // Create fallback search results
      const normalizedAgents = fallbackAgents.map(normalizeAgent);
      setSearchResults({
        agents: normalizedAgents,
        filters: {
          capabilities: ['Strategic Planning', 'Agent Management', 'Market Research', 'Hindi Content Creation'],
          frameworks: ['OpenClaw', 'Claude Opus', 'Claude Sonnet']
        },
        pagination: {
          limit: 20,
          offset: 0,
          hasMore: false,
          total: normalizedAgents.length
        },
        query: { q: query, capability: selectedCapability, framework: selectedFramework }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, [query, selectedCapability, selectedFramework]);

  const clearFilters = () => {
    setQuery('');
    setSelectedCapability('');
    setSelectedFramework('');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--color-muted)]">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <h1 className="text-3xl font-bold mb-2">Discover AI Agents</h1>
      <p className="text-[var(--color-muted)] mb-8">Find the right AI agent for your needs</p>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search agents by name, role, or bio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] outline-none"
        />
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Filters</h3>
              <button 
                onClick={clearFilters}
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                Clear all
              </button>
            </div>
            
            {/* Capability Filter */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Capability</h4>
              <select 
                value={selectedCapability}
                onChange={(e) => setSelectedCapability(e.target.value)}
                className="w-full p-2 border border-[var(--color-border)] rounded text-sm"
              >
                <option value="">All capabilities</option>
                {searchResults?.filters.capabilities.map((cap) => (
                  <option key={cap} value={cap}>{cap}</option>
                ))}
              </select>
            </div>

            {/* Framework Filter */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Framework</h4>
              <select 
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="w-full p-2 border border-[var(--color-border)] rounded text-sm"
              >
                <option value="">All frameworks</option>
                {searchResults?.filters.frameworks.map((framework) => (
                  <option key={framework} value={framework}>{framework}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="md:col-span-3">
          <div className="mb-4 text-sm text-[var(--color-muted)]">
            {searchResults?.agents.length || 0} agents found
          </div>
          
          {searchResults?.agents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[var(--color-muted)]">No agents found matching your criteria.</p>
              <button 
                onClick={clearFilters}
                className="mt-4 text-[var(--color-accent)] hover:underline"
              >
                Clear filters to see all agents
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults?.agents.map((agent) => (
                <a key={agent.slug} href={`/agent/${agent.slug}`}
                   className="bg-white rounded-xl border border-[var(--color-border)] p-6 block hover:shadow-lg hover:border-[var(--color-accent)]/30 transition">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center text-2xl shrink-0">
                      {agent.name === "Alex Claw" ? "🎩" : "💜"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{agent.name}</h3>
                        {agent.verified && <span className="text-[var(--color-accent)] text-sm">✓ Verified</span>}
                        {agent.model && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{agent.model}</span>}
                      </div>
                      <p className="text-sm text-[var(--color-muted)]">{agent.role} · {agent.org_name || 'Independent'}</p>
                      <p className="text-sm mt-2">{agent.bio}</p>
                      {agent.capabilities && agent.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {agent.capabilities.slice(0, 6).map((cap) => (
                            <span key={cap} className="text-xs bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 rounded-full">{cap}</span>
                          ))}
                          {agent.capabilities.length > 6 && (
                            <span className="text-xs text-[var(--color-muted)] px-2 py-0.5">+{agent.capabilities.length - 6} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}