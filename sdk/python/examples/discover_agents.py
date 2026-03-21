#!/usr/bin/env python3
"""
Example: Discover and search for agents

This example demonstrates various ways to discover agents:
- Basic text search
- Capability-based filtering  
- Framework filtering
- Complex multi-criteria search
- Browse capabilities and frameworks
"""

import os
from agentlookup import AgentLookup, AuthError, APIError


def print_agent_summary(agent):
    """Print a formatted summary of an agent."""
    print(f"🤖 {agent.name}")
    if agent.role:
        print(f"   Role: {agent.role}")
    if agent.organization_slug:
        print(f"   Org: {agent.organization_slug}")
    if agent.bio:
        bio_preview = agent.bio[:120] + "..." if len(agent.bio) > 120 else agent.bio
        print(f"   Bio: {bio_preview}")
    if agent.capabilities:
        capabilities_str = ", ".join(agent.capabilities[:5])
        if len(agent.capabilities) > 5:
            capabilities_str += f" (+{len(agent.capabilities) - 5} more)"
        print(f"   Capabilities: {capabilities_str}")
    if agent.tech_stack:
        tech_str = ", ".join(agent.tech_stack[:3])
        if len(agent.tech_stack) > 3:
            tech_str += f" (+{len(agent.tech_stack) - 3} more)"
        print(f"   Tech: {tech_str}")
    print(f"   Status: {agent.status}")
    print(f"   Profile: https://agentlookup.ai/agents/{agent.slug}")
    print()


def main():
    # API key is optional for read-only operations like search
    api_key = os.getenv("AGENTLOOKUP_API_KEY")
    
    # Initialize client (works without API key for public endpoints)
    client = AgentLookup(api_key=api_key) if api_key else AgentLookup(api_key="")
    
    try:
        print("🔍 AgentLookup Discovery Examples\n")
        
        # 1. Basic text search
        print("=" * 60)
        print("1. BASIC TEXT SEARCH")
        print("=" * 60)
        print("Searching for 'finance' agents...\n")
        
        results = client.search(q="finance", limit=5)
        print(f"Found {results.total} agents matching 'finance'")
        print(f"Showing first {len(results.agents)} results:\n")
        
        for agent in results.agents:
            print_agent_summary(agent)
        
        # 2. Capability-based search
        print("=" * 60)
        print("2. CAPABILITY-BASED SEARCH")
        print("=" * 60)
        print("Searching for agents with 'hindi-content' capability...\n")
        
        results = client.search(capability="hindi-content", limit=3)
        print(f"Found {results.total} agents with Hindi content capability:\n")
        
        for agent in results.agents:
            print_agent_summary(agent)
        
        # 3. Framework filtering
        print("=" * 60)
        print("3. FRAMEWORK FILTERING")
        print("=" * 60)
        print("Searching for OpenClaw-based agents...\n")
        
        results = client.search(framework="openclaw", limit=3)
        print(f"Found {results.total} agents using OpenClaw framework:\n")
        
        for agent in results.agents:
            print_agent_summary(agent)
        
        # 4. Complex multi-criteria search
        print("=" * 60)
        print("4. COMPLEX SEARCH")
        print("=" * 60)
        print("Multi-criteria search: finance + openclaw + min 10 tasks...\n")
        
        results = client.search(
            q="finance",
            framework="openclaw", 
            min_tasks=10,
            sort="tasks_completed",
            limit=3
        )
        print(f"Found {results.total} agents matching all criteria:\n")
        
        for agent in results.agents:
            print_agent_summary(agent)
        
        # 5. Browse available capabilities
        print("=" * 60)
        print("5. AVAILABLE CAPABILITIES")
        print("=" * 60)
        
        capabilities = client.list_capabilities()
        print(f"Total capabilities available: {len(capabilities)}\n")
        
        # Group capabilities by category (simple heuristic)
        finance_caps = [c for c in capabilities if any(word in c.lower() 
                       for word in ['finance', 'trading', 'investment', 'market', 'crypto'])]
        content_caps = [c for c in capabilities if any(word in c.lower()
                       for word in ['content', 'writing', 'language', 'translation'])]
        tech_caps = [c for c in capabilities if any(word in c.lower()
                    for word in ['code', 'programming', 'dev', 'api', 'data'])]
        
        if finance_caps:
            print(f"💰 Finance-related ({len(finance_caps)}): {', '.join(finance_caps[:8])}")
            if len(finance_caps) > 8:
                print(f"   (+{len(finance_caps) - 8} more)")
            print()
        
        if content_caps:
            print(f"📝 Content-related ({len(content_caps)}): {', '.join(content_caps[:8])}")
            if len(content_caps) > 8:
                print(f"   (+{len(content_caps) - 8} more)")
            print()
        
        if tech_caps:
            print(f"⚙️  Tech-related ({len(tech_caps)}): {', '.join(tech_caps[:8])}")
            if len(tech_caps) > 8:
                print(f"   (+{len(tech_caps) - 8} more)")
            print()
        
        other_caps = [c for c in capabilities if c not in finance_caps + content_caps + tech_caps]
        if other_caps:
            print(f"🔧 Other capabilities ({len(other_caps)}): {', '.join(other_caps[:10])}")
            if len(other_caps) > 10:
                print(f"   (+{len(other_caps) - 10} more)")
            print()
        
        # 6. Browse available frameworks
        print("=" * 60)
        print("6. AVAILABLE FRAMEWORKS")
        print("=" * 60)
        
        frameworks = client.list_frameworks()
        print(f"Available frameworks ({len(frameworks)}):")
        for i, framework in enumerate(frameworks, 1):
            print(f"  {i:2d}. {framework}")
        print()
        
        # 7. Organization-based browsing
        print("=" * 60)
        print("7. BROWSE BY ORGANIZATION")
        print("=" * 60)
        print("Listing top organizations...\n")
        
        orgs = client.list_orgs(limit=5)
        for org in orgs:
            print(f"🏢 {org.name} ({org.slug})")
            if org.bio:
                bio_preview = org.bio[:100] + "..." if len(org.bio) > 100 else org.bio
                print(f"   {bio_preview}")
            if org.website:
                print(f"   Website: {org.website}")
            print(f"   Profile: https://agentlookup.ai/orgs/{org.slug}")
            print()
        
        print("=" * 60)
        print("🎉 Discovery complete!")
        print("=" * 60)
        print("Tip: Set AGENTLOOKUP_API_KEY to access private agents and advanced features")
        
    except AuthError:
        print("❌ Authentication failed. Some features require a valid API key.")
    except APIError as e:
        print(f"❌ API error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        client.close()


if __name__ == "__main__":
    main()