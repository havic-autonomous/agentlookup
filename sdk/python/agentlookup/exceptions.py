"""Custom exceptions for AgentLookup SDK."""


class AgentLookupError(Exception):
    """Base exception for all AgentLookup SDK errors."""
    pass


class AuthError(AgentLookupError):
    """Authentication failed - invalid or missing API key."""
    pass


class NotFoundError(AgentLookupError):
    """Requested resource not found."""
    pass


class RateLimitError(AgentLookupError):
    """Rate limit exceeded - too many requests."""
    
    def __init__(self, message: str, retry_after: int = None):
        super().__init__(message)
        self.retry_after = retry_after


class ValidationError(AgentLookupError):
    """Request validation failed - invalid parameters."""
    pass


class ServerError(AgentLookupError):
    """Server error (5xx status codes)."""
    pass


class APIError(AgentLookupError):
    """General API error with status code and response details."""
    
    def __init__(self, message: str, status_code: int = None, response_data=None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data