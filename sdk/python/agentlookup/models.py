"""Data models for AgentLookup API responses."""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class Agent:
    """Agent profile model."""
    id: str
    slug: str
    name: str
    role: Optional[str] = None
    bio: Optional[str] = None
    capabilities: Optional[List[str]] = None
    tech_stack: Optional[List[str]] = None
    status: str = "active"
    last_active_at: Optional[datetime] = None
    api_version: str = "v1"
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    avatar_url: Optional[str] = None
    punk_id: Optional[str] = None
    model: Optional[str] = None
    framework: Optional[str] = None
    active_since: Optional[str] = None
    tasks_completed: int = 0
    verified: bool = False
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    org_slug: Optional[str] = None
    organization_id: Optional[str] = None
    organization_slug: Optional[str] = None
    languages: Optional[List[str]] = None
    portfolio: Optional[List[Dict[str, Any]]] = None
    contacts: Optional[List[Dict[str, Any]]] = None
    trust_score: Optional[int] = None
    verifications: Optional[Dict[str, Any]] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Agent':
        """Create Agent from API response dict."""
        # Parse datetime fields if they exist
        created_at = None
        if data.get('created_at'):
            try:
                created_at = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
                
        updated_at = None
        if data.get('updated_at'):
            try:
                updated_at = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
                
        last_active_at = None
        if data.get('last_active_at'):
            try:
                last_active_at = datetime.fromisoformat(data['last_active_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        
        return cls(
            id=data['id'],
            slug=data['slug'],
            name=data['name'],
            role=data.get('role'),
            bio=data.get('bio'),
            capabilities=data.get('capabilities', []),
            tech_stack=data.get('tech_stack', []),
            status=data.get('status', 'active'),
            last_active_at=last_active_at,
            api_version=data.get('api_version', 'v1'),
            metadata=data.get('metadata'),
            created_at=created_at,
            updated_at=updated_at,
            avatar_url=data.get('avatar_url'),
            punk_id=data.get('punk_id'),
            model=data.get('model'),
            framework=data.get('framework'),
            active_since=data.get('active_since'),
            tasks_completed=data.get('tasks_completed', 0),
            verified=data.get('verified', False),
            org_id=data.get('org_id'),
            org_name=data.get('org_name'),
            org_slug=data.get('org_slug'),
            organization_id=data.get('organization_id'),
            organization_slug=data.get('organization_slug'),
            languages=data.get('languages', []),
            portfolio=data.get('portfolio', []),
            contacts=data.get('contacts', []),
            trust_score=data.get('trust_score'),
            verifications=data.get('verifications')
        )


@dataclass
class Organization:
    """Organization model."""
    id: str
    slug: str
    name: str
    bio: Optional[str] = None
    website: Optional[str] = None
    verified: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Organization':
        """Create Organization from API response dict."""
        created_at = None
        if data.get('created_at'):
            try:
                created_at = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
                
        updated_at = None
        if data.get('updated_at'):
            try:
                updated_at = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        
        return cls(
            id=data['id'],
            slug=data['slug'],
            name=data['name'],
            bio=data.get('bio'),
            website=data.get('website'),
            verified=data.get('verified', False),
            created_at=created_at,
            updated_at=updated_at
        )


@dataclass
class Activity:
    """Agent activity event model."""
    id: int
    agent_id: str
    type: str
    title: str
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Activity':
        """Create Activity from API response dict."""
        created_at = None
        if data.get('created_at'):
            try:
                created_at = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        
        return cls(
            id=data['id'],
            agent_id=data['agent_id'],
            type=data['type'],
            title=data['title'],
            description=data.get('description'),
            metadata=data.get('metadata'),
            created_at=created_at
        )


@dataclass
class Metric:
    """Agent performance metric model."""
    id: int
    agent_id: str
    metric: str
    value: float
    recorded_at: Optional[datetime] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Metric':
        """Create Metric from API response dict."""
        recorded_at = None
        if data.get('recorded_at'):
            try:
                recorded_at = datetime.fromisoformat(data['recorded_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        
        return cls(
            id=data['id'],
            agent_id=data['agent_id'],
            metric=data['metric'],
            value=float(data['value']),
            recorded_at=recorded_at
        )


@dataclass
class SearchResult:
    """Search results container."""
    agents: List[Agent]
    total: int
    limit: int
    offset: int
    
    @classmethod
    def from_dict(cls, data) -> 'SearchResult':
        """Create SearchResult from API response dict."""
        # Handle list response (empty search results)
        if isinstance(data, list):
            return cls(
                agents=[Agent.from_dict(agent_data) for agent_data in data],
                total=len(data),
                limit=20,
                offset=0
            )
        
        # Handle dict responses
        if isinstance(data, dict):
            if 'data' in data and 'pagination' in data:
                # API wrapper format
                agents = [Agent.from_dict(agent_data) for agent_data in data['data']]
                pagination = data['pagination']
                return cls(
                    agents=agents,
                    total=pagination.get('total', 0),
                    limit=pagination.get('limit', 20),
                    offset=pagination.get('offset', 0)
                )
            else:
                # Direct format
                agents = [Agent.from_dict(agent_data) for agent_data in data.get('agents', [])]
                return cls(
                    agents=agents,
                    total=data.get('total', 0),
                    limit=data.get('limit', 20),
                    offset=data.get('offset', 0)
                )
        
        # Fallback
        return cls(agents=[], total=0, limit=20, offset=0)


@dataclass
class AgentList:
    """Agent list container."""
    agents: List[Agent]
    total: int
    limit: int
    offset: int
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentList':
        """Create AgentList from API response dict."""
        # Handle both direct format and API wrapper format
        if 'data' in data and 'pagination' in data:
            # API wrapper format
            agents = [Agent.from_dict(agent_data) for agent_data in data['data']]
            pagination = data['pagination']
            return cls(
                agents=agents,
                total=pagination.get('total', 0),
                limit=pagination.get('limit', 20),
                offset=pagination.get('offset', 0)
            )
        else:
            # Direct format
            agents = [Agent.from_dict(agent_data) for agent_data in data.get('agents', [])]
            return cls(
                agents=agents,
                total=data.get('total', 0),
                limit=data.get('limit', 20),
                offset=data.get('offset', 0)
            )


@dataclass
class ActivityList:
    """Activity list container."""
    activities: List[Activity]
    total: int
    limit: int
    offset: int
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ActivityList':
        """Create ActivityList from API response dict."""
        # Handle both direct format and API wrapper format
        if 'data' in data and 'pagination' in data:
            # API wrapper format
            activities = [Activity.from_dict(activity_data) for activity_data in data['data']]
            pagination = data['pagination']
            return cls(
                activities=activities,
                total=pagination.get('total', 0),
                limit=pagination.get('limit', 10),
                offset=pagination.get('offset', 0)
            )
        else:
            # Direct format
            activities = [Activity.from_dict(activity_data) for activity_data in data.get('activities', [])]
            return cls(
                activities=activities,
                total=data.get('total', 0),
                limit=data.get('limit', 10),
                offset=data.get('offset', 0)
            )


@dataclass
class MetricList:
    """Metric list container."""
    metrics: List[Metric]
    total: int
    limit: int
    offset: int
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MetricList':
        """Create MetricList from API response dict."""
        # Handle both direct format and API wrapper format
        if 'data' in data and 'pagination' in data:
            # API wrapper format
            metrics = [Metric.from_dict(metric_data) for metric_data in data['data']]
            pagination = data['pagination']
            return cls(
                metrics=metrics,
                total=pagination.get('total', 0),
                limit=pagination.get('limit', 10),
                offset=pagination.get('offset', 0)
            )
        else:
            # Direct format
            metrics = [Metric.from_dict(metric_data) for metric_data in data.get('metrics', [])]
            return cls(
                metrics=metrics,
                total=data.get('total', 0),
                limit=data.get('limit', 10),
                offset=data.get('offset', 0)
            )