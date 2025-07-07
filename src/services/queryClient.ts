/**
 * React Query Client Configuration
 *
 * Configures React Query with AsyncStorage persistence for caching
 */

import { queryLogger } from "@/utils/logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

/**
 * React Query Client Configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time (was cacheTime)

      // Refetch configuration
      refetchOnWindowFocus: true, // Refetch when app comes back to foreground
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: false, // Don't refetch on component mount if we have cached data

      // Background refetch configuration
      refetchInterval: false, // No automatic polling
      refetchIntervalInBackground: false, // No background polling

      // Retry configuration
      retry: 2, // Retry failed requests 2 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff

      // Network mode
      networkMode: "online", // Only fetch when online

      // Error handling
      throwOnError: false, // Don't throw errors, let components handle them

      // Dev tools
      meta: {
        persist: true, // Enable persistence for all queries by default
      },
    },
    mutations: {
      // Retry configuration for mutations
      retry: 1, // Retry failed mutations once
      retryDelay: 1000, // 1 second delay between retries

      // Network mode
      networkMode: "online", // Only mutate when online

      // Error handling
      throwOnError: false, // Don't throw errors, let components handle them
    },
  },
});

/**
 * AsyncStorage Persister Configuration
 */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "acorn-pups-query-cache",

  // Serialization options
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

/**
 * Query Client Utility Functions
 */
export const queryUtils = {
  /**
   * Clear all cached data
   */
  clearAllCache: async () => {
    await queryClient.clear();
    await AsyncStorage.removeItem("acorn-pups-query-cache");
    queryLogger.fetchSuccess(["cache", "clear"], 0);
  },

  /**
   * Invalidate queries by key pattern
   */
  invalidateQueries: async (queryKey: string[]) => {
    await queryClient.invalidateQueries({
      queryKey,
      exact: false, // Invalidate all queries that start with this key
    });
    queryLogger.fetchSuccess(["cache", "invalidate", ...queryKey], 0);
  },

  /**
   * Refetch queries by key pattern
   */
  refetchQueries: async (queryKey: string[]) => {
    await queryClient.refetchQueries({
      queryKey,
      exact: false, // Refetch all queries that start with this key
    });
    queryLogger.fetchSuccess(["cache", "refetch", ...queryKey], 0);
  },

  /**
   * Get cached data for a query
   */
  getCachedData: <T = any>(queryKey: string[]): T | undefined => {
    const data = queryClient.getQueryData<T>(queryKey);
    if (data) {
      queryLogger.cacheHit(queryKey);
    } else {
      queryLogger.cacheMiss(queryKey);
    }
    return data;
  },

  /**
   * Set cached data for a query
   */
  setCachedData: <T = any>(queryKey: string[], data: T) => {
    queryClient.setQueryData<T>(queryKey, data);
    queryLogger.fetchSuccess(["cache", "set", ...queryKey], 0);
  },

  /**
   * Remove cached data for a query
   */
  removeCachedData: (queryKey: string[]) => {
    queryClient.removeQueries({ queryKey });
    queryLogger.fetchSuccess(["cache", "remove", ...queryKey], 0);
  },

  /**
   * Get query state
   */
  getQueryState: (queryKey: string[]) => {
    const query = queryClient.getQueryState(queryKey);
    return {
      data: query?.data,
      error: query?.error,
      status: query?.status,
      fetchStatus: query?.fetchStatus,
      dataUpdatedAt: query?.dataUpdatedAt,
      errorUpdatedAt: query?.errorUpdatedAt,
    };
  },

  /**
   * Prefetch data
   */
  prefetchQuery: async <T = any>(
    queryKey: string[],
    queryFn: () => Promise<T>,
    options?: { staleTime?: number }
  ) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: options?.staleTime,
    });
    queryLogger.fetchSuccess(["cache", "prefetch", ...queryKey], 0);
  },
};

/**
 * React Query DevTools Configuration
 */
export const queryDevTools = {
  initialIsOpen: __DEV__ ? false : false, // Don't open by default even in dev
  position: "bottom-right" as const,
  panelProps: {
    style: {
      zIndex: 999999,
    },
  },
};
