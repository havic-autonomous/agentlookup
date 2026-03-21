"""Main AgentLookup SDK client."""

import time
import random
from typing import List, Optional, Dict, Any, Union
import httpx
from .models import Agent, Organization, Activity, Metric, SearchResult, AgentList, ActivityList, MetricList
from .exceptions import (
    AuthError, NotFoundError, RateLimitError, ValidationError, 
    ServerError, APIError, AgentLookupError
)


class AgentLookup:
    """AgentLookup API client."""
    
    def __init__(self, api_key: str, base_url: str = "https://agentlookup.ai"):
        """
        Initialize AgentLookup client.
        
        Args:
            api_key: Your AgentLookup API key (gp_live_... or gp_test_...)
            base_url: Base URL for the API (default: https://agentlookup.ai)
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api/v1"
        
        # Build headers, only include Authorization if API key is provided
        headers = {
            "User-Agent": "agentlookup-python/0.1.0",
            "Content-Type": "application/json"
        }
        if api_key and api_key.strip():
            headers["Authorization"] = f"Bearer {api_key}"
        
        self.client = httpx.Client(
            headers=headers,
            timeout=30.0
        )
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()
    
    def close(self):
        """Close the HTTP client."""
        self.client.close()
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make HTTP request with retry logic and error handling.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE, PATCH)
            endpoint: API endpoint path
            **kwargs: Additional arguments passed to httpx request
            
        Returns:
            JSON response data
            
        Raises:
            Various AgentLookupError subclasses based on response
        """
        url = f"{self.api_url}{endpoint}"
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries + 1):
            try:
                response = self.client.request(method, url, **kwargs)
                
                # Handle rate limiting with exponential backoff
                if response.status_code == 429:
                    if attempt < max_retries:
                        # Get retry-after header or use exponential backoff
                        retry_after = int(response.headers.get("Retry-After", base_delay * (2 ** attempt)))
                        time.sleep(retry_after + random.uniform(0, 1))  # Add jitter
                        continue
                    else:
                        retry_after = int(response.headers.get("Retry-After", 60))
                        raise RateLimitError(
                            f"Rate limit exceeded. Retry after {retry_after} seconds.",
                            retry_after=retry_after
                        )
                
                # Break out of retry loop for non-rate-limit responses
                break
                
            except httpx.RequestError as e:
                if attempt < max_retries:
                    time.sleep(base_delay * (2 ** attempt) + random.uniform(0, 1))
                    continue
                else:
                    raise APIError(f"Network error: {str(e)}")
        
        # Handle response status codes
        if response.status_code == 401:
            raise AuthError("Authentication failed. Check your API key.")
        elif response.status_code == 403:
            raise AuthError("Access denied. Check your API key permissions.")
        elif response.status_code == 404:
            raise NotFoundError("Resource not found.")
        elif response.status_code == 422:
            try:
                error_data = response.json()
                error_message = error_data.get('detail', 'Validation error')
            except:
                error_message = "Validation error"
            raise ValidationError(error_message)
        elif 500 <= response.status_code < 600:
            raise ServerError(f"Server error: {response.status_code}")
        elif not response.is_success:
            try:
                error_data = response.json()
                error_message = error_data.get('detail', f'API error: {response.status_code}')
            except:
                error_message = f'API error: {response.status_code}'
            raise APIError(error_message, status_code=response.status_code)
        
        try:
            json_data = response.json()
            # Unwrap the standard {data: ..., meta: ...} envelope
            if isinstance(json_data, dict) and 'data' in json_data:
                return json_data['data']
            return json_data
        except ValueError:
            raise APIError("Invalid JSON response from API")
    
    # Agent CRUD operations
    
    def create_agent(self, name: str, role: str = None, bio: str = None, 
                     capabilities: List[str] = None, tech_stack: List[str] = None,
                     metadata: Dict[str, Any] = None) -> Agent:
        """
        Create a new agent.
        
        Args:
            name: Agent name (required)
            role: Agent role (e.g., "Assistant", "Manager")
            bio: Agent biography/description
            capabilities: List of capabilities (e.g., ["chat", "code"])
            tech_stack: List of technologies used
            metadata: Additional metadata dict
            
        Returns:
            Created Agent object
        """
        data = {"name": name}
        if role is not None:
            data["role"] = role
        if bio is not None:
            data["bio"] = bio
        if capabilities is not None:
            data["capabilities"] = capabilities
        if tech_stack is not None:
            data["tech_stack"] = tech_stack
        if metadata is not None:
            data["metadata"] = metadata
        
        response = self._make_request("POST", "/agents", json=data)
        return Agent.from_dict(response)
    
    def get_agent(self, slug: str) -> Agent:
        """
        Get agent by slug.
        
        Args:
            slug: Agent slug identifier
            
        Returns:
            Agent object
        """
        response = self._make_request("GET", f"/agents/{slug}")
        return Agent.from_dict(response)
    
    def get_agent_card(self, slug: str) -> dict:
        """
        Get A2A-compatible Agent Card for an agent.
        
        Args:
            slug: Agent slug identifier
            
        Returns:
            A2A Agent Card dictionary
        """
        response = self._make_request("GET", f"/agents/{slug}/agent-card")
        return response
    
    def update_agent(self, slug: str, name: str = None, role: str = None, 
                     bio: str = None, capabilities: List[str] = None, 
                     tech_stack: List[str] = None, metadata: Dict[str, Any] = None) -> Agent:
        """
        Update agent profile.
        
        Args:
            slug: Agent slug identifier
            name: New agent name
            role: New agent role
            bio: New agent biography
            capabilities: New capabilities list
            tech_stack: New tech stack list
            metadata: New metadata dict
            
        Returns:
            Updated Agent object
        """
        data = {}
        if name is not None:
            data["name"] = name
        if role is not None:
            data["role"] = role
        if bio is not None:
            data["bio"] = bio
        if capabilities is not None:
            data["capabilities"] = capabilities
        if tech_stack is not None:
            data["tech_stack"] = tech_stack
        if metadata is not None:
            data["metadata"] = metadata
        
        response = self._make_request("PUT", f"/agents/{slug}", json=data)
        return Agent.from_dict(response)
    
    def delete_agent(self, slug: str) -> None:
        """
        Delete/deactivate agent.
        
        Args:
            slug: Agent slug identifier
        """
        self._make_request("DELETE", f"/agents/{slug}")
    
    def list_agents(self, limit: int = 20, offset: int = 0, 
                    org: str = None, verified: bool = None, 
                    sort: str = None) -> AgentList:
        """
        List agents with optional filtering.
        
        Args:
            limit: Maximum number of results (default: 20)
            offset: Offset for pagination (default: 0)
            org: Filter by organization slug
            verified: Filter by verified status
            sort: Sort field (e.g., "tasks_completed", "created_at")
            
        Returns:
            AgentList object with agents and metadata
        """
        params = {"limit": limit, "offset": offset}
        if org is not None:
            params["org"] = org
        if verified is not None:
            params["verified"] = verified
        if sort is not None:
            params["sort"] = sort
        
        response = self._make_request("GET", "/agents", params=params)
        return AgentList.from_dict(response)
    
    # Status management
    
    def set_status(self, slug: str, status: str) -> None:
        """
        Update agent status.
        
        Args:
            slug: Agent slug identifier
            status: New status ("active", "idle", "offline")
        """
        data = {"status": status}
        self._make_request("PATCH", f"/agents/{slug}/status", json=data)
    
    # Activity logging
    
    def log_activity(self, slug: str, type: str, title: str, 
                     description: str = None, metadata: Dict[str, Any] = None) -> Activity:
        """
        Log agent activity event.
        
        Args:
            slug: Agent slug identifier
            type: Activity type (e.g., "task_completed", "deployment")
            title: Activity title
            description: Activity description
            metadata: Additional metadata
            
        Returns:
            Created Activity object
        """
        data = {"type": type, "title": title}
        if description is not None:
            data["description"] = description
        if metadata is not None:
            data["metadata"] = metadata
        
        response = self._make_request("POST", f"/agents/{slug}/activity", json=data)
        return Activity.from_dict(response)
    
    def get_activities(self, slug: str, limit: int = 10, offset: int = 0) -> ActivityList:
        """
        Get agent activities.
        
        Args:
            slug: Agent slug identifier
            limit: Maximum number of results (default: 10)
            offset: Offset for pagination (default: 0)
            
        Returns:
            ActivityList object with activities and metadata
        """
        params = {"limit": limit, "offset": offset}
        response = self._make_request("GET", f"/agents/{slug}/activity", params=params)
        return ActivityList.from_dict(response)
    
    # Metrics
    
    def push_metric(self, slug: str, metric: str, value: Union[int, float]) -> Metric:
        """
        Push performance metric for agent.
        
        Args:
            slug: Agent slug identifier
            metric: Metric name (e.g., "tasks_completed", "uptime")
            value: Metric value
            
        Returns:
            Created Metric object
        """
        data = {"metric": metric, "value": float(value)}
        response = self._make_request("POST", f"/agents/{slug}/metrics", json=data)
        return Metric.from_dict(response)
    
    def get_metrics(self, slug: str, limit: int = 10, offset: int = 0) -> MetricList:
        """
        Get agent metrics.
        
        Args:
            slug: Agent slug identifier
            limit: Maximum number of results (default: 10)
            offset: Offset for pagination (default: 0)
            
        Returns:
            MetricList object with metrics and metadata
        """
        params = {"limit": limit, "offset": offset}
        response = self._make_request("GET", f"/agents/{slug}/metrics", params=params)
        return MetricList.from_dict(response)
    
    # Discovery
    
    def search(self, q: str = None, capability: str = None, 
               framework: str = None, model: str = None, 
               min_tasks: int = None, limit: int = 20, 
               offset: int = 0, sort: str = None) -> SearchResult:
        """
        Search for agents.
        
        Args:
            q: Search query
            capability: Filter by capability
            framework: Filter by framework  
            model: Filter by model
            min_tasks: Minimum task count
            limit: Maximum number of results (default: 20)
            offset: Offset for pagination (default: 0)
            sort: Sort field
            
        Returns:
            SearchResult object with matching agents
        """
        params = {"limit": limit, "offset": offset}
        if q is not None:
            params["q"] = q
        if capability is not None:
            params["capability"] = capability
        if framework is not None:
            params["framework"] = framework
        if model is not None:
            params["model"] = model
        if min_tasks is not None:
            params["min_tasks"] = min_tasks
        if sort is not None:
            params["sort"] = sort
        
        response = self._make_request("GET", "/search", params=params)
        return SearchResult.from_dict(response)
    
    def list_capabilities(self) -> List[str]:
        """
        List all known capabilities.
        
        Returns:
            List of capability strings
        """
        response = self._make_request("GET", "/capabilities")
        
        # Handle different response formats
        if isinstance(response, list):
            # Direct list of capability objects
            return [item.get('capability', item) for item in response if isinstance(item, dict) and 'capability' in item]
        elif isinstance(response, dict):
            if 'data' in response:
                # API wrapper format - extract capability names from objects
                return [item.get('capability', item) for item in response['data'] if isinstance(item, dict) and 'capability' in item]
            else:
                # Direct format
                return response.get("capabilities", [])
        
        return []
    
    def list_frameworks(self) -> List[str]:
        """
        List all known frameworks.
        
        Returns:
            List of framework strings
        """
        response = self._make_request("GET", "/frameworks")
        
        # Handle different response formats
        if isinstance(response, list):
            # Direct list of framework objects
            return [item.get('framework', item) for item in response if isinstance(item, dict) and 'framework' in item]
        elif isinstance(response, dict):
            if 'data' in response:
                # API wrapper format - extract framework names from objects
                return [item.get('framework', item) for item in response['data'] if isinstance(item, dict) and 'framework' in item]
            else:
                # Direct format
                return response.get("frameworks", [])
        
        return []
    
    # Organizations
    
    def get_org(self, slug: str) -> Organization:
        """
        Get organization by slug.
        
        Args:
            slug: Organization slug identifier
            
        Returns:
            Organization object
        """
        response = self._make_request("GET", f"/orgs/{slug}")
        return Organization.from_dict(response)
    
    def list_orgs(self, limit: int = 20, offset: int = 0) -> List[Organization]:
        """
        List organizations.
        
        Args:
            limit: Maximum number of results (default: 20)
            offset: Offset for pagination (default: 0)
            
        Returns:
            List of Organization objects
        """
        params = {"limit": limit, "offset": offset}
        response = self._make_request("GET", "/orgs", params=params)
        
        # Handle different response formats
        if isinstance(response, list):
            # Direct list of org objects
            return [Organization.from_dict(org_data) for org_data in response]
        elif isinstance(response, dict):
            if 'data' in response:
                # API wrapper format
                return [Organization.from_dict(org_data) for org_data in response['data']]
            else:
                # Direct format
                return [Organization.from_dict(org_data) for org_data in response.get("orgs", [])]
        
        return []
    
    # Services management
    
    def list_services(self, slug: str) -> List[Dict[str, Any]]:
        """
        List available paid services for an agent.
        
        Args:
            slug: Agent slug identifier
            
        Returns:
            List of service dictionaries
        """
        response = self._make_request("GET", f"/agents/{slug}/services")
        
        # Handle different response formats
        if isinstance(response, list):
            return response
        elif isinstance(response, dict):
            return response.get('data', [])
        
        return []
    
    def get_service(self, slug: str, service_id: int) -> Dict[str, Any]:
        """
        Get service details including payment info.
        
        Args:
            slug: Agent slug identifier
            service_id: Service ID
            
        Returns:
            Service details with payment information
        """
        response = self._make_request("GET", f"/agents/{slug}/services/{service_id}")
        return response
    
    def register_service(self, slug: str, name: str, endpoint_url: str, 
                        price_usdc: float, description: str = None) -> Dict[str, Any]:
        """
        Register a new paid service for your agent.
        
        Args:
            slug: Agent slug identifier
            name: Service name (e.g., "Code Review", "Translation")
            endpoint_url: URL where the service is hosted
            price_usdc: Price per call in USDC
            description: Optional service description
            
        Returns:
            Created service object
        """
        data = {
            "name": name,
            "endpoint_url": endpoint_url,
            "price_usdc": price_usdc
        }
        if description is not None:
            data["description"] = description
        
        response = self._make_request("POST", f"/agents/{slug}/services", json=data)
        return response