import {
  AsyncErrorOptions,
  ErrorCategory,
  ErrorSeverity,
  RetryConfig,
} from "../types/errors";
import { errorLogger } from "./errorLogger";

// Type declaration for React Native global
declare const global: any;

class AsyncErrorHandler {
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  private unhandledRejectionHandler: ((event: any) => void) | null = null;

  constructor() {
    this.setupGlobalHandlers();
  }

  /**
   * Handle async operations with automatic error logging
   */
  public async handleAsync<T>(
    operation: () => Promise<T>,
    options: AsyncErrorOptions = {}
  ): Promise<T> {
    const {
      category = ErrorCategory.API_ERROR,
      severity = ErrorSeverity.MEDIUM,
      customMessage,
      context = {},
    } = options;

    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Log the error
      const errorId = errorLogger.logError(err, category, severity, {
        userAction: "async_operation",
        ...context,
      });

      // Add error ID to the error for tracking
      (err as any).errorId = errorId;

      // Re-throw to allow caller to handle
      throw err;
    }
  }

  /**
   * Handle async operations with retry logic
   */
  public async handleAsyncWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: Partial<RetryConfig> = {},
    options: AsyncErrorOptions = {}
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    const {
      category = ErrorCategory.API_ERROR,
      severity = ErrorSeverity.MEDIUM,
      customMessage,
      context = {},
    } = options;

    let lastError: Error;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        const result = await operation();

        // If we succeeded after retries, log the recovery
        if (attempt > 0) {
          errorLogger.logError(
            new Error(`Operation succeeded after ${attempt} retries`),
            ErrorCategory.API_ERROR,
            ErrorSeverity.LOW,
            {
              userAction: "retry_success",
              metadata: { attempts: attempt },
              ...context,
            }
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        // Log retry attempts
        errorLogger.logError(
          lastError,
          category,
          attempt <= config.maxRetries ? ErrorSeverity.LOW : severity,
          {
            userAction: "async_operation_retry",
            metadata: {
              attempt,
              maxRetries: config.maxRetries,
              isLastAttempt: attempt > config.maxRetries,
            },
            ...context,
          }
        );

        if (attempt > config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        await this.delay(delay);
      }
    }

    // All retries failed - add retry info to error
    (lastError! as any).retryAttempts = config.maxRetries;
    (lastError! as any).customMessage =
      customMessage || `Operation failed after ${config.maxRetries} attempts`;

    throw lastError!;
  }

  /**
   * Handle API requests with standardized error handling
   */
  public async handleApiRequest<T>(
    request: () => Promise<Response>,
    options: AsyncErrorOptions & {
      endpoint?: string;
      method?: string;
      parseResponse?: boolean;
    } = {}
  ): Promise<T> {
    const {
      endpoint = "unknown",
      method = "GET",
      parseResponse = true,
      context = {},
      ...asyncOptions
    } = options;

    try {
      const response = await this.handleAsync(request, {
        category: ErrorCategory.API_ERROR,
        context: {
          ...context,
          metadata: {
            endpoint,
            method,
            ...context.metadata,
          },
        },
        ...asyncOptions,
      });

      if (!response.ok) {
        const errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        const apiError = new Error(errorMessage);

        // Log API error with response details
        errorLogger.logError(
          apiError,
          ErrorCategory.API_ERROR,
          ErrorSeverity.HIGH,
          {
            userAction: "api_request",
            metadata: {
              endpoint,
              method,
              status: response.status,
              statusText: response.statusText,
              url: response.url,
            },
            ...context,
          }
        );

        // Add response info to error
        (apiError as any).status = response.status;
        (apiError as any).statusText = response.statusText;
        (apiError as any).endpoint = endpoint;

        throw apiError;
      }

      if (parseResponse) {
        try {
          return await response.json();
        } catch (parseError) {
          const error = new Error("Failed to parse API response");
          errorLogger.logError(
            error,
            ErrorCategory.API_ERROR,
            ErrorSeverity.MEDIUM,
            {
              userAction: "api_response_parse",
              metadata: { endpoint, method },
              ...context,
            }
          );
          throw error;
        }
      }

      return response as unknown as T;
    } catch (error) {
      // If it's already our error, just re-throw
      if (error instanceof Error && (error as any).errorId) {
        throw error;
      }

      // Handle network errors
      const networkError =
        error instanceof Error ? error : new Error(String(error));
      errorLogger.logError(
        networkError,
        ErrorCategory.API_ERROR,
        ErrorSeverity.HIGH,
        {
          userAction: "api_request_network",
          metadata: { endpoint, method },
          ...context,
        }
      );

      throw networkError;
    }
  }

  /**
   * Wrap a promise with error handling
   */
  public wrapPromise<T>(
    promise: Promise<T>,
    options: AsyncErrorOptions = {}
  ): Promise<T> {
    return this.handleAsync(() => promise, options);
  }

  /**
   * Setup global error handlers for unhandled promise rejections
   */
  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    this.unhandledRejectionHandler = (event: any) => {
      const error =
        event.reason || event.error || new Error("Unhandled promise rejection");

      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        ErrorCategory.UNHANDLED_ERROR,
        ErrorSeverity.HIGH,
        {
          userAction: "unhandled_promise_rejection",
          metadata: {
            handled: false,
            source: "global_handler",
          },
        }
      );

      // Prevent default behavior that would crash the app
      if (event.preventDefault) {
        event.preventDefault();
      }
    };

    // React Native environment
    if (typeof global !== "undefined" && global.ErrorUtils) {
      global.ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
        errorLogger.logError(
          error,
          ErrorCategory.UNHANDLED_ERROR,
          ErrorSeverity.CRITICAL,
          {
            userAction: "global_error",
            metadata: {
              isFatal,
              source: "react_native_global_handler",
            },
          }
        );
      });
    }

    // Standard promise rejection handling
    if (typeof global !== "undefined" && global.addEventListener) {
      global.addEventListener(
        "unhandledrejection",
        this.unhandledRejectionHandler
      );
    } else if (typeof process !== "undefined" && process.on) {
      process.on("unhandledRejection", this.unhandledRejectionHandler);
    }
  }

  /**
   * Get user-friendly error message
   */
  public getUserFriendlyMessage(error: Error): string {
    const message = error.message?.toLowerCase() || "";

    // Network errors
    if (message.includes("network") || message.includes("fetch")) {
      return "Network connection issue. Please check your internet connection.";
    }

    // Authentication errors
    if (message.includes("unauthorized") || message.includes("auth")) {
      return "Authentication failed. Please sign in again.";
    }

    // Validation errors
    if (message.includes("validation") || message.includes("invalid")) {
      return "Please check your input and try again.";
    }

    // Timeout errors
    if (message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }

    // API errors with status codes
    if ((error as any).status) {
      const status = (error as any).status;
      if (status >= 400 && status < 500) {
        return "Invalid request. Please check your input and try again.";
      }
      if (status >= 500) {
        return "Server error. Please try again later.";
      }
    }

    // Retry errors
    if ((error as any).retryAttempts) {
      return (
        (error as any).customMessage ||
        "Operation failed after multiple attempts. Please try again later."
      );
    }

    // Default fallback
    return error.message || "An unexpected error occurred. Please try again.";
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup global handlers
   */
  public cleanup(): void {
    if (this.unhandledRejectionHandler) {
      if (typeof global !== "undefined" && global.removeEventListener) {
        global.removeEventListener(
          "unhandledrejection",
          this.unhandledRejectionHandler
        );
      } else if (typeof process !== "undefined" && process.off) {
        process.off("unhandledRejection", this.unhandledRejectionHandler);
      }
      this.unhandledRejectionHandler = null;
    }
  }
}

// Create singleton instance
export const asyncErrorHandler = new AsyncErrorHandler();

// Convenience functions for direct usage
export const handleAsync = <T>(
  operation: () => Promise<T>,
  options?: AsyncErrorOptions
) => asyncErrorHandler.handleAsync(operation, options);

export const handleAsyncWithRetry = <T>(
  operation: () => Promise<T>,
  retryConfig?: Partial<RetryConfig>,
  options?: AsyncErrorOptions
) => asyncErrorHandler.handleAsyncWithRetry(operation, retryConfig, options);

export const handleApiRequest = <T>(
  request: () => Promise<Response>,
  options?: AsyncErrorOptions & {
    endpoint?: string;
    method?: string;
    parseResponse?: boolean;
  }
) => asyncErrorHandler.handleApiRequest<T>(request, options);

export const wrapPromise = <T>(
  promise: Promise<T>,
  options?: AsyncErrorOptions
) => asyncErrorHandler.wrapPromise(promise, options);

export const getUserFriendlyMessage = (error: Error) =>
  asyncErrorHandler.getUserFriendlyMessage(error);
