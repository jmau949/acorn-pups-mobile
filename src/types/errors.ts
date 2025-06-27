export enum ErrorCategory {
  UI_ERROR = "UI_ERROR",
  API_ERROR = "API_ERROR",
  NAVIGATION_ERROR = "NAVIGATION_ERROR",
  PERFORMANCE_ERROR = "PERFORMANCE_ERROR",
  UNHANDLED_ERROR = "UNHANDLED_ERROR",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface ErrorContext {
  timestamp: string;
  userAction?: string;
  screenName?: string;
  userId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
  metadata?: Record<string, any>;
}

export interface StructuredError {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  error: Error;
  context: ErrorContext;
  stackTrace?: string;
  retryable?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  errorId?: string;
}

export interface AsyncErrorOptions {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  retryable?: boolean;
  customMessage?: string;
  context?: Partial<ErrorContext>;
}
