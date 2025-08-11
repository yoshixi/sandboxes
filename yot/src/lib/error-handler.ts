export interface ErrorResponse {
  error: string;
  details?: string;
  timestamp: string;
}

export class SlackBotError extends Error {
  public statusCode: number;
  public details?: string;

  constructor(message: string, statusCode: number = 500, details?: string) {
    super(message);
    this.name = 'SlackBotError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function createErrorResponse(error: Error | SlackBotError | string, statusCode: number = 500): {
  response: ErrorResponse;
  status: number;
} {
  const timestamp = new Date().toISOString();

  if (error instanceof SlackBotError) {
    return {
      response: {
        error: error.message,
        details: error.details,
        timestamp,
      },
      status: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      response: {
        error: error.message,
        timestamp,
      },
      status: statusCode,
    };
  }

  return {
    response: {
      error: typeof error === 'string' ? error : 'Unknown error',
      timestamp,
    },
    status: statusCode,
  };
}

export function logError(context: string, error: Error | string, additionalInfo?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${timestamp}] ${context}:`, {
    error: errorMessage,
    stack,
    additionalInfo,
  });
}

// Specific error types for better error handling
export class SlackVerificationError extends SlackBotError {
  constructor(message: string, details?: string) {
    super(message, 401, details);
    this.name = 'SlackVerificationError';
  }
}

export class GeminiAPIError extends SlackBotError {
  constructor(message: string, details?: string) {
    super(message, 500, details);
    this.name = 'GeminiAPIError';
  }
}

export class SlackAPIError extends SlackBotError {
  constructor(message: string, details?: string) {
    super(message, 500, details);
    this.name = 'SlackAPIError';
  }
}

export class ConfigurationError extends SlackBotError {
  constructor(message: string) {
    super(message, 500);
    this.name = 'ConfigurationError';
  }
}