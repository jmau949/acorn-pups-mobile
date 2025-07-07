/**
 * Environment Configuration Example
 *
 * Copy this file to env.js and configure your environment variables.
 * The app will fail fast if required variables are missing.
 */

export default {
  // REQUIRED: API base URL - app will throw error if not set
  API_BASE_URL: "https://api.acorn-pups.com",

  // Optional: Override default configurations
  // API_TIMEOUT: 10000,

  // Optional: Logging level for development
  // LOG_LEVEL: 'debug', // 'debug' | 'info' | 'warn' | 'error' | 'silent'

  // Optional: Feature flags
  // ENABLE_SENTRY_LOGGING: false,
  // ENABLE_ANALYTICS: false,

  // Development-specific overrides
  ...(process.env.NODE_ENV === "development" &&
    {
      // API_BASE_URL: 'http://localhost:3000/api',
      // LOG_LEVEL: 'debug',
    }),

  // Production-specific overrides
  ...(process.env.NODE_ENV === "production" &&
    {
      // ENABLE_SENTRY_LOGGING: true,
      // ENABLE_ANALYTICS: true,
      // LOG_LEVEL: 'error',
    }),
};
