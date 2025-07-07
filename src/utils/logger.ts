/**
 * Centralized Logger
 *
 * A unified logging interface that can be easily swapped between
 * console logging (development) and external services like Sentry (production)
 */

export interface Logger {
  debug(message: string, extra?: Record<string, any>): void;
  info(message: string, extra?: Record<string, any>): void;
  warn(message: string, extra?: Record<string, any>): void;
  error(message: string, error?: Error, extra?: Record<string, any>): void;
}

/**
 * Console Logger Implementation
 * Used for development
 */
class ConsoleLogger implements Logger {
  private formatMessage(
    level: string,
    message: string,
    extra?: Record<string, any>
  ): string {
    const timestamp = new Date().toISOString();
    const extraStr = extra ? ` | ${JSON.stringify(extra)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${extraStr}`;
  }

  debug(message: string, extra?: Record<string, any>): void {
    console.log(this.formatMessage("debug", message, extra));
  }

  info(message: string, extra?: Record<string, any>): void {
    console.info(this.formatMessage("info", message, extra));
  }

  warn(message: string, extra?: Record<string, any>): void {
    console.warn(this.formatMessage("warn", message, extra));
  }

  error(message: string, error?: Error, extra?: Record<string, any>): void {
    const errorDetails = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...extra,
        }
      : extra;

    console.error(this.formatMessage("error", message, errorDetails));
  }
}

/**
 * Silent Logger Implementation
 * Used for production when external logging service is not yet configured
 */
class SilentLogger implements Logger {
  debug(): void {
    // No-op in production
  }

  info(): void {
    // No-op in production
  }

  warn(): void {
    // No-op in production
  }

  error(): void {
    // No-op in production - should be replaced with Sentry when ready
  }
}

/**
 * Sentry Logger Implementation (Example)
 * Uncomment and configure when ready to use Sentry
 */
// import * as Sentry from '@sentry/react-native';
//
// class SentryLogger implements Logger {
//   debug(message: string, extra?: Record<string, any>): void {
//     // Debug messages are typically not sent to Sentry to avoid noise
//     if (__DEV__) {
//       console.log(`[DEBUG] ${message}`, extra);
//     }
//   }
//
//   info(message: string, extra?: Record<string, any>): void {
//     Sentry.addBreadcrumb({
//       message,
//       level: 'info',
//       data: extra,
//     });
//   }
//
//   warn(message: string, extra?: Record<string, any>): void {
//     Sentry.captureMessage(message, 'warning');
//     if (extra) {
//       Sentry.setContext('warning_context', extra);
//     }
//   }
//
//   error(message: string, error?: Error, extra?: Record<string, any>): void {
//     if (error) {
//       Sentry.captureException(error, {
//         tags: { source: 'app' },
//         extra: { message, ...extra }
//       });
//     } else {
//       Sentry.captureMessage(message, 'error');
//       if (extra) {
//         Sentry.setContext('error_context', extra);
//       }
//     }
//   }
// }

/**
 * Logger Configuration
 *
 * Automatically switches between implementations based on environment:
 * - Development: ConsoleLogger (verbose logging)
 * - Production: SilentLogger (no console spam) or SentryLogger when configured
 */
function createLogger(): Logger {
  // Check if we're in development mode
  if (__DEV__ || process.env.NODE_ENV === "development") {
    return new ConsoleLogger();
  }

  // For production, you can switch to SentryLogger when ready:
  // return new SentryLogger();

  // Until Sentry is configured, use SilentLogger to avoid console spam
  return new SilentLogger();
}

export const logger: Logger = createLogger();

/**
 * Specialized loggers for different modules
 */
export const apiLogger = {
  requestStart: (
    method: string,
    url: string,
    headers?: Record<string, string>
  ) => {
    logger.debug(`API Request: ${method} ${url}`, { headers });
  },

  requestSuccess: (
    method: string,
    url: string,
    status: number,
    duration: number
  ) => {
    logger.info(`API Success: ${method} ${url} - ${status} (${duration}ms)`);
  },

  requestError: (
    method: string,
    url: string,
    error: Error,
    duration: number
  ) => {
    logger.error(
      `API Error: ${method} ${url} - ${error.message} (${duration}ms)`,
      error
    );
  },
};

export const queryLogger = {
  cacheHit: (queryKey: string[]) => {
    logger.debug(`Query Cache Hit: ${queryKey.join(".")}`);
  },

  cacheMiss: (queryKey: string[]) => {
    logger.debug(`Query Cache Miss: ${queryKey.join(".")}`);
  },

  fetchStart: (queryKey: string[]) => {
    logger.debug(`Query Fetch Start: ${queryKey.join(".")}`);
  },

  fetchSuccess: (queryKey: string[], duration: number) => {
    logger.info(`Query Fetch Success: ${queryKey.join(".")} (${duration}ms)`);
  },

  fetchError: (queryKey: string[], error: Error) => {
    logger.error(`Query Fetch Error: ${queryKey.join(".")}`, error);
  },
};
