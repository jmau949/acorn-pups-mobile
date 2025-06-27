import { Platform } from "react-native";
import {
  ErrorCategory,
  ErrorContext,
  ErrorSeverity,
  StructuredError,
} from "../types/errors";

class ErrorLogger {
  private errorQueue: StructuredError[] = [];
  private readonly maxQueueSize = 100;
  private readonly throttleWindow = 5000; // 5 seconds
  private errorCounts = new Map<string, { count: number; lastSeen: number }>();
  private isDevelopment = __DEV__;

  /**
   * Main error logging method
   */
  public logError(
    error: Error,
    category: ErrorCategory = ErrorCategory.UI_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {}
  ): string {
    const errorId = this.generateErrorId();
    const fullContext = this.enrichContext(context);

    const structuredError: StructuredError = {
      id: errorId,
      message: error.message,
      category,
      severity,
      error,
      context: fullContext,
      stackTrace: error.stack,
      retryable: this.isRetryableError(error, category),
    };

    // Throttle identical errors
    if (this.shouldThrottleError(error.message)) {
      return errorId;
    }

    this.recordError(structuredError);

    if (this.isDevelopment) {
      this.logToConsole(structuredError);
    } else {
      this.queueForRemoteLogging(structuredError);
    }

    return errorId;
  }

  /**
   * Log API errors with additional context
   */
  public logApiError(
    error: Error,
    endpoint: string,
    method: string,
    statusCode?: number,
    context: Partial<ErrorContext> = {}
  ): string {
    const apiContext = {
      ...context,
      metadata: {
        ...context.metadata,
        endpoint,
        method,
        statusCode,
      },
    };

    const severity = this.getApiErrorSeverity(statusCode);
    return this.logError(error, ErrorCategory.API_ERROR, severity, apiContext);
  }

  /**
   * Log navigation errors
   */
  public logNavigationError(
    error: Error,
    fromScreen: string,
    toScreen: string,
    context: Partial<ErrorContext> = {}
  ): string {
    const navContext = {
      ...context,
      metadata: {
        ...context.metadata,
        fromScreen,
        toScreen,
      },
    };

    return this.logError(
      error,
      ErrorCategory.NAVIGATION_ERROR,
      ErrorSeverity.MEDIUM,
      navContext
    );
  }

  /**
   * Log performance errors
   */
  public logPerformanceError(
    error: Error,
    performanceMetric: string,
    value: number,
    context: Partial<ErrorContext> = {}
  ): string {
    const perfContext = {
      ...context,
      metadata: {
        ...context.metadata,
        performanceMetric,
        value,
      },
    };

    return this.logError(
      error,
      ErrorCategory.PERFORMANCE_ERROR,
      ErrorSeverity.LOW,
      perfContext
    );
  }

  /**
   * Get queued errors for batch sending
   */
  public getQueuedErrors(): StructuredError[] {
    return [...this.errorQueue];
  }

  /**
   * Clear error queue after successful upload
   */
  public clearQueue(): void {
    this.errorQueue = [];
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};

    this.errorQueue.forEach((error) => {
      categories[error.category] = (categories[error.category] || 0) + 1;
    });

    return {
      totalErrors: this.errorQueue.length,
      categories,
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private enrichContext(context: Partial<ErrorContext>): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version.toString(),
      },
      ...context,
    };
  }

  private shouldThrottleError(message: string): boolean {
    const now = Date.now();
    const errorKey = this.hashMessage(message);
    const errorData = this.errorCounts.get(errorKey);

    if (!errorData) {
      this.errorCounts.set(errorKey, { count: 1, lastSeen: now });
      return false;
    }

    // Reset count if outside throttle window
    if (now - errorData.lastSeen > this.throttleWindow) {
      this.errorCounts.set(errorKey, { count: 1, lastSeen: now });
      return false;
    }

    // Throttle if we've seen this error too many times
    errorData.count++;
    errorData.lastSeen = now;

    return errorData.count > 3; // Max 3 identical errors per throttle window
  }

  private hashMessage(message: string): string {
    // Simple hash function for error message
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private recordError(error: StructuredError): void {
    this.errorQueue.push(error);

    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest error
    }
  }

  private logToConsole(error: StructuredError): void {
    const style = this.getConsoleStyle(error.severity);

    console.group(
      `%c[${error.category}] ${error.severity.toUpperCase()}`,
      style
    );
    console.error("Error:", error.message);
    console.log("ID:", error.id);
    console.log("Context:", error.context);
    if (error.stackTrace) {
      console.log("Stack:", error.stackTrace);
    }
    console.groupEnd();
  }

  private getConsoleStyle(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "color: white; background-color: #dc2626; font-weight: bold; padding: 2px 6px; border-radius: 3px;";
      case ErrorSeverity.HIGH:
        return "color: white; background-color: #ea580c; font-weight: bold; padding: 2px 6px; border-radius: 3px;";
      case ErrorSeverity.MEDIUM:
        return "color: white; background-color: #d97706; font-weight: bold; padding: 2px 6px; border-radius: 3px;";
      case ErrorSeverity.LOW:
        return "color: white; background-color: #65a30d; font-weight: bold; padding: 2px 6px; border-radius: 3px;";
      default:
        return "color: white; background-color: #6b7280; font-weight: bold; padding: 2px 6px; border-radius: 3px;";
    }
  }

  private queueForRemoteLogging(error: StructuredError): void {
    // In production, errors are queued for batch sending to Sentry or other services
    // This method is ready for Sentry integration
    console.log(`[PROD] Error queued for remote logging: ${error.id}`);
  }

  private isRetryableError(error: Error, category: ErrorCategory): boolean {
    // Network and API errors are generally retryable
    if (category === ErrorCategory.API_ERROR) {
      return !error.message.includes("401") && !error.message.includes("403");
    }

    // UI errors are generally not retryable
    if (category === ErrorCategory.UI_ERROR) {
      return false;
    }

    return false;
  }

  private getApiErrorSeverity(statusCode?: number): ErrorSeverity {
    if (!statusCode) return ErrorSeverity.MEDIUM;

    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

// Convenience functions
export const logError = (
  error: Error,
  category?: ErrorCategory,
  severity?: ErrorSeverity,
  context?: Partial<ErrorContext>
) => errorLogger.logError(error, category, severity, context);

export const logApiError = (
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number,
  context?: Partial<ErrorContext>
) => errorLogger.logApiError(error, endpoint, method, statusCode, context);

export const logNavigationError = (
  error: Error,
  fromScreen: string,
  toScreen: string,
  context?: Partial<ErrorContext>
) => errorLogger.logNavigationError(error, fromScreen, toScreen, context);

export const logPerformanceError = (
  error: Error,
  metric: string,
  value: number,
  context?: Partial<ErrorContext>
) => errorLogger.logPerformanceError(error, metric, value, context);
