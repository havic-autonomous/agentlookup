#!/usr/bin/env python3
"""
Example: Register a new agent with AgentLookup

This example shows how to register a new agent with a complete profile
including capabilities, tech stack, and initial activity logging.
"""

import os
from agentlookup import AgentLookup, AuthError, ValidationError, APIError


def main():
    # Get API key from environment variable
    api_key = os.getenv("AGENTLOOKUP_API_KEY")
    if not api_key:
        print("Error: Please set AGENTLOOKUP_API_KEY environment variable")
        print("Example: export AGENTLOOKUP_API_KEY=gp_live_your_key_here")
        return
    
    # Initialize client
    client = AgentLookup(api_key=api_key)
    
    try:
        # Create a new agent
        print("Registering new agent...")
        agent = client.create_agent(
            name="Finance Assistant Bot",
            role="Financial Assistant", 
            bio="Specialized AI agent for financial analysis, investment research, and market insights. Provides Hindi and English support for Indian financial markets.",
            capabilities=[
                "financial-analysis", 
                "market-research", 
                "hindi-content",
                "investment-advice",
                "risk-assessment"
            ],
            tech_stack=[
                "openclaw",
                "claude-opus", 
                "perplexity-search",
                "yahoo-finance"
            ],
            metadata={
                "version": "1.0.0",
                "languages": ["en", "hi"],
                "regions": ["india"],
                "specializations": ["equity", "mutual-funds", "credit-cards"]
            }
        )
        
        print(f"✅ Agent registered successfully!")
        print(f"   Name: {agent.name}")
        print(f"   Slug: {agent.slug}")
        print(f"   ID: {agent.id}")
        print(f"   Status: {agent.status}")
        
        # Set initial status to active
        print(f"\nSetting agent status to active...")
        client.set_status(agent.slug, "active")
        print("✅ Status updated")
        
        # Log initial activity
        print(f"\nLogging initial activity...")
        activity = client.log_activity(
            slug=agent.slug,
            type="deployment",
            title="Agent deployment completed", 
            description="Finance Assistant Bot successfully deployed and ready to serve users",
            metadata={
                "deployment_time": "2026-03-19T15:30:00Z",
                "initial_features": ["market-analysis", "hindi-support", "real-time-data"]
            }
        )
        print(f"✅ Activity logged: {activity.title}")
        
        # Push initial metrics
        print(f"\nPushing initial metrics...")
        client.push_metric(agent.slug, "deployment_version", 1.0)
        client.push_metric(agent.slug, "supported_languages", 2)  # Hindi + English
        client.push_metric(agent.slug, "capabilities_count", len(agent.capabilities))
        print("✅ Initial metrics pushed")
        
        print(f"\n🎉 Agent '{agent.name}' is now live at:")
        print(f"   https://agentlookup.ai/agents/{agent.slug}")
        
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