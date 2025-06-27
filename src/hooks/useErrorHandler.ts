// Toast functionality handled via Tamagui toast system
import { useCallback, useRef } from "react";
import {
  AsyncErrorOptions,
  ErrorCategory,
  ErrorSeverity,
  RetryConfig,
} from "../types/errors";
import { asyncErrorHandler } from "../utils/asyncErrorHandler";
import { errorLogger } from "../utils/errorLogger";

interface UseErrorHandlerOptions {
  defaultCategory?: ErrorCategory;
  defaultSeverity?: ErrorSeverity;
  context?: Record<string, any>;
}

interface ErrorHandlerReturn {
  handleError: (error: Error, options?: AsyncErrorOptions) => string;
  handleAsyncError: <T>(
    operation: () => Promise<T>,
    options?: AsyncErrorOptions
  ) => Promise<T>;
  handleAsyncErrorWithRetry: <T>(
    operation: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>,
    options?: AsyncErrorOptions
  ) => Promise<T>;
  clearErrorState: () => void;
  getErrorMessage: (error: Error) => string;
}

export const useErrorHandler = (
  options: UseErrorHandlerOptions = {}
): ErrorHandlerReturn => {
  const {
    defaultCategory = ErrorCategory.UI_ERROR,
    defaultSeverity = ErrorSeverity.MEDIUM,
    context = {},
  } = options;

  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);

  const handleError = useCallback(
    (error: Error, errorOptions: AsyncErrorOptions = {}): string => {
      const now = Date.now();
      const timeSinceLastError = now - lastErrorTimeRef.current;

      // Throttle rapid consecutive errors
      if (timeSinceLastError < 1000) {
        errorCountRef.current++;
        if (errorCountRef.current > 3) {
          // Too many errors in quick succession, just log
          return errorLogger.logError(error, defaultCategory, defaultSeverity, {
            ...context,
            metadata: {
              ...context.metadata,
              throttled: true,
              errorCount: errorCountRef.current,
            },
          });
        }
      } else {
        errorCountRef.current = 1;
      }

      lastErrorTimeRef.current = now;

      const {
        category = defaultCategory,
        severity = defaultSeverity,
        context: errorContext = {},
      } = errorOptions;

      // Log the error
      const errorId = errorLogger.logError(error, category, severity, {
        ...context,
        ...errorContext,
      });

      return errorId;
    },
    [defaultCategory, defaultSeverity, context]
  );

  const handleAsyncError = useCallback(
    async <T>(
      operation: () => Promise<T>,
      errorOptions: AsyncErrorOptions = {}
    ): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        handleError(err, errorOptions);
        throw err;
      }
    },
    [handleError]
  );

  const handleAsyncErrorWithRetry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      retryConfig: Partial<RetryConfig> = {},
      errorOptions: AsyncErrorOptions = {}
    ): Promise<T> => {
      return asyncErrorHandler.handleAsyncWithRetry(operation, retryConfig, {
        context,
        ...errorOptions,
      });
    },
    [context]
  );

  const getErrorMessage = useCallback((error: Error): string => {
    return getUserFriendlyMessage(error);
  }, []);

  const clearErrorState = useCallback(() => {
    errorCountRef.current = 0;
    lastErrorTimeRef.current = 0;
  }, []);

  return {
    handleError,
    handleAsyncError,
    handleAsyncErrorWithRetry,
    clearErrorState,
    getErrorMessage,
  };
};

// Specialized hooks for specific error types

export const useApiErrorHandler = (baseUrl?: string) => {
  const errorHandler = useErrorHandler({
    defaultCategory: ErrorCategory.API_ERROR,
    context: { baseUrl },
  });

  const handleApiError = useCallback(
    async <T>(
      request: () => Promise<Response>,
      options: {
        endpoint?: string;
        method?: string;
        parseResponse?: boolean;
      } & AsyncErrorOptions = {}
    ): Promise<T> => {
      return asyncErrorHandler.handleApiRequest<T>(request, {
        ...options,
        context: {
          ...options.context,
          metadata: {
            ...options.context?.metadata,
            baseUrl,
          },
        },
      });
    },
    [baseUrl]
  );

  return {
    ...errorHandler,
    handleApiError,
  };
};

export const useNavigationErrorHandler = () => {
  return useErrorHandler({
    defaultCategory: ErrorCategory.NAVIGATION_ERROR,
  });
};

export const usePerformanceErrorHandler = () => {
  return useErrorHandler({
    defaultCategory: ErrorCategory.PERFORMANCE_ERROR,
    defaultSeverity: ErrorSeverity.LOW,
  });
};

function getUserFriendlyMessage(error: Error): string {
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

  // Default fallback
  return error.message || "An unexpected error occurred. Please try again.";
}
