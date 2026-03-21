#!/usr/bin/env python3
"""Test script to verify the AgentLookup SDK works with real API."""

import sys
import os

# Add the SDK to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from agentlookup import AgentLookup, AuthError, NotFoundError, APIError


def test_get_agent():
    """Test getting alex-claw agent (public endpoint, no auth needed)."""
    print("🧪 Testing AgentLookup SDK...")
    print("=" * 50)
    
    # Initialize client without API key (for public endpoints)
    client = AgentLookup(api_key="", base_url="https://agentlookup.ai")
    
    try:
        print("📡 Fetching agent: alex-claw")
        agent = client.get_agent("alex-claw")
        
        print("✅ Request successful!")
        print(f"   Agent ID: {agent.id}")
        print(f"   Name: {agent.name}")
        print(f"   Slug: {agent.slug}")
        
        if agent.role:
            print(f"   Role: {agent.role}")
        if agent.bio:
            bio_preview = agent.bio[:100] + "..." if len(agent.bio) > 100 else agent.bio
            print(f"   Bio: {bio_preview}")
        if agent.capabilities:
            print(f"   Capabilities ({len(agent.capabilities)}): {', '.join(agent.capabilities[:5])}")
            if len(agent.capabilities) > 5:
                print(f"      (+{len(agent.capabilities) - 5} more)")
        if agent.tech_stack:
            print(f"   Tech Stack: {', '.join(agent.tech_stack)}")
        
        print(f"   Status: {agent.status}")
        if agent.organization_slug:
            print(f"   Organization: {agent.organization_slug}")
        print(f"   Verified: {agent.verified}")
        
        if agent.created_at:
            print(f"   Created: {agent.created_at.strftime('%Y-%m-%d %H:%M UTC')}")
        if agent.last_active_at:
            print(f"   Last Active: {agent.last_active_at.strftime('%Y-%m-%d %H:%M UTC')}")
        
        print(f"\n🌐 Profile URL: https://agentlookup.ai/agents/{agent.slug}")
        
        return True
        
    except NotFoundError:
        print("❌ Agent 'alex-claw' not found")
        return False
    except AuthError:
        print("❌ Authentication error (unexpected for public endpoint)")
        return False
    except APIError as e:
        print(f"❌ API error: {e}")
        if hasattr(e, 'status_code'):
            print(f"   Status code: {e.status_code}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False
    finally:
        client.close()


def test_search():
    """Test search functionality (public endpoint)."""
    print("\n" + "=" * 50)
    print("🔍 Testing search functionality...")
    
    client = AgentLookup(api_key="", base_url="https://agentlookup.ai")
    
    try:
        print("📡 Searching for agents with 'assistant' keyword")
        results = client.search(q="assistant", limit=3)
        
        print("✅ Search successful!")
        print(f"   Total results: {results.total}")
        print(f"   Returned: {len(results.agents)}")
        print(f"   Limit: {results.limit}")
        print(f"   Offset: {results.offset}")
        
        if results.agents:
            print(f"\n   Found agents:")
            for i, agent in enumerate(results.agents, 1):
                print(f"   {i}. {agent.name} ({agent.slug})")
                if agent.role:
                    print(f"      Role: {agent.role}")
                if agent.organization_slug:
                    print(f"      Org: {agent.organization_slug}")
        
        return True
        
    except APIError as e:
        print(f"❌ Search failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        client.close()


def main():
    """Run all tests."""
    print("🚀 AgentLookup SDK Test Suite")
    print("Testing against: https://agentlookup.ai/api/v1/")
    print()
    
    success_count = 0
    total_tests = 2
    
    # Test 1: Get specific agent
    if test_get_agent():
        success_count += 1
    
    # Test 2: Search functionality
    if test_search():
        success_count += 1
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Passed: {success_count}/{total_tests}")
    
    if success_count == total_tests:
        print("🎉 All tests passed! SDK is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Check the output above.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)