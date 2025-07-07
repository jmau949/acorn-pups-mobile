/**
 * Environment Configuration Example
 *
 * Copy this file to env.js and configure your environment variables.
 * The app will fail fast if required variables are missing.
 */

// Main configuration object
export const ENV_CONFIG = {
  // AWS Cognito Configuration
  AWS_REGION: "us-west-2",
  AWS_USER_POOL_ID: "us-west-2_hRybD810B",
  AWS_USER_POOL_CLIENT_ID: "g01p84v3q5em27ndvih1pf4b0",
  APP_ENV: "development",

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

// Default export for convenience
export default ENV_CONFIG;
