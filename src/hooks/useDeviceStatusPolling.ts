/**
 * Device Status Polling Hook
 *
 * Provides periodic device status refresh while screen is active.
 * Follows the hybrid approach from technical documentation:
 * - MQTT Lifecycle Events update database automatically
 * - Mobile app polls every 60 seconds for UI updates
 */

import { UserDevicesData } from "@/types/devices";
import { useFocusEffect } from "@react-navigation/native";
import { UseQueryResult } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useUserDevices } from "./useUserDevices";

interface UseDeviceStatusPollingOptions {
  /** User ID for fetching devices */
  userId: string;
  /** Polling interval in milliseconds (default: 60000 = 60 seconds) */
  intervalMs?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

interface UseDeviceStatusPollingReturn {
  /** Device data */
  data: UserDevicesData | undefined;
  /** Whether initial load is happening */
  isLoading: boolean;
  /** Whether an error occurred */
  isError: boolean;
  /** Error object if one occurred */
  error: Error | null;
  /** Whether any fetch is in progress */
  isFetching: boolean;
  /** Whether a manual refetch is in progress */
  isRefetching: boolean;
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Manually trigger a refresh */
  refreshDeviceStatus: () => Promise<UserDevicesData | undefined>;
}

/**
 * Custom hook for device status polling with proper lifecycle management
 *
 * Behavior:
 * - Polls every 60 seconds when screen is focused and app is active
 * - Stops polling when app goes to background or screen loses focus
 * - Resumes polling when returning to foreground and screen is focused
 * - Triggers immediate refresh when screen gains focus
 */
export function useDeviceStatusPolling({
  userId,
  intervalMs = 60000, // 60 seconds default
  enabled = true,
}: UseDeviceStatusPollingOptions): UseDeviceStatusPollingReturn {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScreenFocusedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  // Use the existing useUserDevices hook
  const queryResult = useUserDevices(userId);
  const { refetch } = queryResult;

  // Check if polling should be active
  const shouldPoll = useCallback(() => {
    return (
      enabled &&
      !!userId &&
      isScreenFocusedRef.current &&
      appStateRef.current === "active"
    );
  }, [enabled, userId]);

  // Manually refresh device status
  const refreshDeviceStatus = useCallback(async () => {
    if (!enabled || !userId) return undefined;

    try {
      const result = await refetch();
      return result.data;
    } catch (error) {
      console.error("[DeviceStatusPolling] Manual refresh failed:", error);
      throw error;
    }
  }, [enabled, userId, refetch]);

  // Start polling
  const startPolling = useCallback(() => {
    if (!shouldPoll() || intervalRef.current) return;

    console.log("[DeviceStatusPolling] Starting device status polling", {
      intervalMs,
      userId,
      timestamp: new Date().toISOString(),
    });

    intervalRef.current = setInterval(async () => {
      if (shouldPoll()) {
        try {
          console.log("[DeviceStatusPolling] Polling device status...");
          await refetch();
        } catch (error) {
          console.error("[DeviceStatusPolling] Polling failed:", error);
        }
      }
    }, intervalMs);
  }, [shouldPoll, intervalMs, refetch, userId]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      console.log("[DeviceStatusPolling] Stopping device status polling");
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log("[DeviceStatusPolling] App state changed:", {
        from: appStateRef.current,
        to: nextAppState,
        screenFocused: isScreenFocusedRef.current,
      });

      appStateRef.current = nextAppState;

      if (nextAppState === "active") {
        // App became active - start polling if screen is focused
        if (isScreenFocusedRef.current) {
          startPolling();
          // Trigger immediate refresh when returning to foreground
          refreshDeviceStatus().catch(console.error);
        }
      } else {
        // App went to background - stop polling
        stopPolling();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [startPolling, stopPolling, refreshDeviceStatus]);

  // Handle screen focus changes using navigation focus
  useFocusEffect(
    useCallback(() => {
      console.log("[DeviceStatusPolling] Screen focused");
      isScreenFocusedRef.current = true;

      // Trigger immediate refresh when screen gains focus
      refreshDeviceStatus().catch(console.error);

      // Start polling if app is active
      if (appStateRef.current === "active") {
        startPolling();
      }

      return () => {
        console.log("[DeviceStatusPolling] Screen unfocused");
        isScreenFocusedRef.current = false;
        stopPolling();
      };
    }, [startPolling, stopPolling, refreshDeviceStatus])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    isFetching: queryResult.isFetching,
    isRefetching: queryResult.isRefetching,
    isPolling: intervalRef.current !== null,
    refreshDeviceStatus,
  };
}
