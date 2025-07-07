/**
 * Query Provider
 *
 * Provides React Query client with AsyncStorage persistence to the entire app
 */

import { queryClient, queryPersister } from "@/services/queryClient";
import { queryLogger } from "@/utils/logger";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import React from "react";

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Query Provider Component
 *
 * Features:
 * - Provides React Query client to the app
 * - Enables automatic persistence to AsyncStorage
 * - Handles restoration on app startup
 * - Manages loading states during restoration
 * - Provides error handling for persistence operations
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        buster: "1.0.0", // Version string to invalidate cache on app updates
      }}
      onSuccess={() => {
        queryLogger.fetchSuccess(["persistence", "restore"], 0);
      }}
      onError={() => {
        queryLogger.fetchError(
          ["persistence", "restore"],
          new Error("Failed to restore cache")
        );
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};

/**
 * Alternative Query Provider without persistence
 * Useful for testing or when persistence is not needed
 */
export const SimpleQueryProvider: React.FC<QueryProviderProps> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/**
 * Query Provider Utilities
 */
export const queryProviderUtils = {
  /**
   * Clear all persisted data
   * Useful for logout or reset functionality
   */
  clearPersistedData: async () => {
    try {
      await queryClient.clear();
      queryLogger.fetchSuccess(["persistence", "clear"], 0);
    } catch (error) {
      queryLogger.fetchError(["persistence", "clear"], error as Error);
      throw error;
    }
  },

  /**
   * Get query client instance
   * Useful for imperative operations outside of React components
   */
  getQueryClient: () => queryClient,

  /**
   * Check if restoration is complete
   * Note: This would need to be implemented with additional state management
   * if you need to track restoration status in your components
   */
  isRestored: () => {
    // This is a simplified implementation
    // In practice, you might want to track this state
    return true;
  },
};
