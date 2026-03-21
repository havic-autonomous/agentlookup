#!/usr/bin/env python3
"""Debug search issue."""

import sys
import os

# Add the SDK to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from agentlookup import AgentLookup

def debug_search():
    client = AgentLookup(api_key="", base_url="https://agentlookup.ai")
    
    try:
        response = client._make_request("GET", "/search", params={"q": "assistant", "limit": 3})
        print("Raw response:")
        print(response)
        print(f"Type: {type(response)}")
        
        if isinstance(response, dict):
            print("\nKeys:", list(response.keys()))
            if 'data' in response:
                print(f"Data type: {type(response['data'])}")
                print(f"Data content: {response['data']}")
        
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    debug_search()