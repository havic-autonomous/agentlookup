// Custom error classes for AgentLookup SDK

export class APIError extends Error {
  public readonly status: number;
  public readonly response?: any;

  constructor(message: string, status: number, response?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

export class AuthError extends APIError {
  constructor(message: string = 'Authentication failed', response?: any) {
    super(message, 401, response);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string, response?: any) {
    super(`${resource} not found`, 404, response);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends APIError {
  public readonly retryAfter: number | undefined;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, response?: any) {
    super(message, 429, response);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ValidationError extends APIError {
  public readonly errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]> = {}, response?: any) {
    super(message, 400, response);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}