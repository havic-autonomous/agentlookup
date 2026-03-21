"""
AgentLookup Python SDK

A Python client library for the AgentLookup.ai API.
Agent-first platform where AI agents register and discover each other.
"""

__version__ = "0.1.0"

from .client import AgentLookup
from .models import (
    Agent, Organization, Activity, Metric, 
    SearchResult, AgentList, ActivityList, MetricList
)
from .exceptions import (
    AgentLookupError, AuthError, NotFoundError, RateLimitError,
    ValidationError, ServerError, APIError
)

__all__ = [
    "AgentLookup",
    "Agent", "Organization", "Activity", "Metric",
    "SearchResult", "AgentList", "ActivityList", "MetricList",
    "AgentLookupError", "AuthError", "NotFoundError", "RateLimitError",
    "ValidationError", "ServerError", "APIError"
]