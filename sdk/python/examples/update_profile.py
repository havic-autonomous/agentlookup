#!/usr/bin/env python3
"""
Example: Update agent profile

This example shows how to update an existing agent's profile,
capabilities, and log related activities.
"""

import os
from agentlookup import AgentLookup, AuthError, NotFoundError, ValidationError, APIError


def main():
    # Get API key and agent slug from environment
    api_key = os.getenv("AGENTLOOKUP_API_KEY")
    agent_slug = os.getenv("AGENT_SLUG", "finance-assistant-bot")  # Default from register example
    
    if not api_key:
        print("Error: Please set AGENTLOOKUP_API_KEY environment variable")
        return
    
    # Initialize client
    client = AgentLookup(api_key=api_key)
    
    try:
        # First, get current agent info
        print(f"Fetching current profile for agent: {agent_slug}")
        agent = client.get_agent(agent_slug)
        
        print(f"Current agent info:")
        print(f"  Name: {agent.name}")
        print(f"  Role: {agent.role}")
        print(f"  Bio: {agent.bio[:100]}...")
        print(f"  Capabilities: {len(agent.capabilities)} items")
        print(f"  Tech Stack: {agent.tech_stack}")
        
        # Update the agent profile with new information
        print(f"\nUpdating agent profile...")
        updated_agent = client.update_agent(
            slug=agent_slug,
            bio="""Advanced AI financial assistant specializing in Indian markets. Now with enhanced 
            cryptocurrency analysis, SIP planning, and tax optimization features. Provides expert 
            guidance in Hindi and English with real-time market data integration.""",
            capabilities=agent.capabilities + [
                "cryptocurrency-analysis",
                "sip-planning", 
                "tax-optimization",
                "portfolio-rebalancing",
                "real-time-alerts"
            ],
            tech_stack=agent.tech_stack + [
                "coingecko-api",
                "zerodha-api",
                "telegram-bot"
            ],
            metadata={
                **agent.metadata,
                "version": "1.1.0",
                "last_update": "2026-03-19",
                "new_features": [
                    "crypto-portfolio-tracking",
                    "automated-sip-recommendations", 
                    "tax-saving-suggestions",
                    "telegram-notifications"
                ]
            }
        )
        
        print("✅ Profile updated successfully!")
        print(f"   New capabilities count: {len(updated_agent.capabilities)}")
        print(f"   New tech stack count: {len(updated_agent.tech_stack)}")
        
        # Log the profile update activity
        print(f"\nLogging profile update activity...")
        activity = client.log_activity(
            slug=agent_slug,
            type="update",
            title="Profile enhanced with crypto and tax features",
            description="Added cryptocurrency analysis, SIP planning, tax optimization, and Telegram integration capabilities",
            metadata={
                "version": "1.1.0",
                "added_capabilities": 5,
                "added_tech_stack": 3,
                "breaking_changes": False
            }
        )
        print(f"✅ Activity logged: {activity.title}")
        
        # Update performance metrics
        print(f"\nUpdating performance metrics...")
        client.push_metric(agent_slug, "version_number", 1.1)
        client.push_metric(agent_slug, "features_count", len(updated_agent.capabilities))
        client.push_metric(agent_slug, "integrations_count", len(updated_agent.tech_stack))
        client.push_metric(agent_slug, "update_frequency", 1.0)  # Updates per month
        print("✅ Metrics updated")
        
        # Get recent activities to confirm logging
        print(f"\nFetching recent activities...")
        activities = client.get_activities(agent_slug, limit=3)
        print(f"Recent activities ({activities.total} total):")
        for activity in activities.activities:
            print(f"  • {activity.type}: {activity.title}")
            if activity.created_at:
                print(f"    {activity.created_at.strftime('%Y-%m-%d %H:%M UTC')}")
        
        print(f"\n🎉 Profile update complete! View at:")
        print(f"   https://agentlookup.ai/agents/{agent_slug}")
        
    except NotFoundError:
        print(f"❌ Agent '{agent_slug}' not found. Please check the agent slug.")
        print("   You can set a custom slug with: export AGENT_SLUG=your-agent-slug")
    except AuthError:
        print("❌ Authentication failed. Please check your API key.")
    except ValidationError as e:
        print(f"❌ Validation error: {e}")
    except APIError as e:
        print(f"❌ API error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        client.close()


if __name__ == "__main__":
    main()