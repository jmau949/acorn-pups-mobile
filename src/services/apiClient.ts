/**
 * API Client
 *
 * Reusable API client with retry logic, authentication, and centralized error handling
 */

import { ApiResponse } from "@/types/common";
import { apiLogger } from "@/utils/logger";
import ENV_CONFIG from "../../env";
import { authService } from "./auth";

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
}

export interface RequestConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  data?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public response?: any) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * API Client Class
 *
 * Handles all HTTP requests with authentication and error handling.
 * Retry logic is handled by React Query.
 */
export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    // Fail fast if API_BASE_URL is not configured
    const apiBaseUrl = ENV_CONFIG.API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error(
        "API_BASE_URL environment variable is required but not set. " +
          "Please configure your environment variables properly."
      );
    }

    this.config = {
      baseUrl: apiBaseUrl,
      timeout: 10000,
      ...config,
    };
  }

  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const session = await authService.getSession();
      const token = session.tokens?.accessToken?.toString();

      if (!token) {
        throw new AuthError("No access token available");
      }

      return {
        Authorization: `Bearer ${token}`,
      };
    } catch (error) {
      throw new AuthError("Failed to get authentication token");
    }
  }

  /**
   * Build full URL
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${baseUrl}${url}`;
  }

  /**
   * Make HTTP request (retry logic handled by React Query)
   */
  private async makeRequest<T = any>(
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const { method, url, data, headers = {}, skipAuth = false } = config;
    const fullUrl = this.buildUrl(url);
    const startTime = Date.now();

    // Create AbortController for timeout handling
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      // Build headers
      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...headers,
      };

      // Add auth headers if not skipped
      if (!skipAuth) {
        const authHeaders = await this.getAuthHeaders();
        Object.assign(requestHeaders, authHeaders);
      }

      // Log request start
      apiLogger.requestStart(method, fullUrl, requestHeaders);

      // Set up timeout
      timeoutId = setTimeout(() => {
        abortController.abort();
      }, this.config.timeout);

      // Create fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        signal: abortController.signal,
      };

      // Add body for non-GET requests
      if (data && method !== "GET") {
        fetchOptions.body = JSON.stringify(data);
      }

      // Make the request
      const response = await fetch(fullUrl, fetchOptions);
      const duration = Date.now() - startTime;

      // Clear timeout on successful response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle auth errors
        if (response.status === 401 || response.status === 403) {
          const authError = new AuthError(
            errorData.message || "Authentication failed"
          );
          apiLogger.requestError(method, fullUrl, authError, duration);
          throw authError;
        }

        // Handle other HTTP errors
        const apiError = new ApiError(
          errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
        apiLogger.requestError(method, fullUrl, apiError, duration);
        throw apiError;
      }

      // Parse response
      const responseData = await response.json();

      // Log success
      apiLogger.requestSuccess(method, fullUrl, response.status, duration);

      return {
        data: responseData,
        success: true,
        message: responseData.message || "Request successful",
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      // Clean up timeout regardless of error type
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      // Handle abort errors (includes timeout)
      if (
        (error as any)?.name === "AbortError" ||
        abortController.signal.aborted
      ) {
        const timeoutError = new NetworkError("Request timeout");
        apiLogger.requestError(method, fullUrl, timeoutError, duration);
        throw timeoutError;
      }

      // Handle network errors
      if (
        error instanceof TypeError ||
        (error as any)?.name === "NetworkError"
      ) {
        const networkError = new NetworkError("Network request failed");
        apiLogger.requestError(method, fullUrl, networkError, duration);
        throw networkError;
      }

      // Handle other timeout-related errors (legacy fallback)
      if ((error as any)?.name === "TimeoutError") {
        const timeoutError = new NetworkError("Request timeout");
        apiLogger.requestError(method, fullUrl, timeoutError, duration);
        throw timeoutError;
      }

      // Re-throw all errors for React Query to handle retries
      throw error;
    } finally {
      // Final cleanup to ensure timeout is always cleared
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Public request methods
   */
  async get<T = any>(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({ method: "GET", url, ...config });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({ method: "POST", url, data, ...config });
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({ method: "PUT", url, data, ...config });
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({ method: "PATCH", url, data, ...config });
  }

  async delete<T = any>(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({ method: "DELETE", url, ...config });
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

/**
 * Convenience function for making authenticated requests
 */
export const apiRequest = {
  get: <T = any>(url: string, config?: Partial<RequestConfig>) =>
    apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) =>
    apiClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) =>
    apiClient.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) =>
    apiClient.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: Partial<RequestConfig>) =>
    apiClient.delete<T>(url, config),
};
