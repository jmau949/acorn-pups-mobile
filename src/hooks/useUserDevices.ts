/**
 * useUserDevices Hook
 *
 * Custom hook for fetching and managing user devices using React Query
 * Updated to match OpenAPI v1.0.0 specification with unwrapped responses
 */

import { ApiResponse } from "@/types/common";
import { UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";
import { Device, DEVICE_QUERY_KEYS, UserDevicesData } from "../types/devices";
import { queryLogger } from "../utils/logger";
import { useUnwrappedQuery } from "./useUnwrappedQuery";

/**
 * Hook for fetching user's devices with unwrapped response
 * Returns data directly without needing to access .data.data
 */
export function useUserDevices(
  userId: string
): UseQueryResult<UserDevicesData, Error> {
  return useUnwrappedQuery<
    ApiResponse<UserDevicesData>,
    Error,
    UserDevicesData
  >({
    queryKey: DEVICE_QUERY_KEYS.list(userId),
    queryFn: async () => {
      const queryKey = DEVICE_QUERY_KEYS.list(userId);
      queryLogger.fetchStart([...queryKey]);
      const startTime = Date.now();

      try {
        const response = await apiClient.get<UserDevicesData>(
          `/users/${userId}/devices`
        );
        const duration = Date.now() - startTime;
        queryLogger.fetchSuccess([...queryKey], duration);
        return response;
      } catch (error) {
        queryLogger.fetchError([...queryKey], error as Error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!userId, // Only run if userId is provided
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Device utility functions
 * Updated to work with the new Device interface
 */
export const deviceUtils = {
  /**
   * Filter devices by online status
   */
  filterOnlineDevices: (devices: Device[]): Device[] => {
    return devices.filter((device) => device.isOnline);
  },

  /**
   * Sort devices by name
   */
  sortDevicesByName: (devices: Device[]): Device[] => {
    return [...devices].sort((a, b) =>
      a.deviceName.localeCompare(b.deviceName)
    );
  },

  /**
   * Sort devices by last seen (most recent first)
   */
  sortDevicesByLastSeen: (devices: Device[]): Device[] => {
    return [...devices].sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
  },

  /**
   * Get device status counts
   */
  getDeviceStatusCounts: (devices: Device[]) => {
    const counts = {
      total: devices.length,
      online: 0,
      offline: 0,
    };

    devices.forEach((device) => {
      if (device.isOnline) counts.online++;
      else counts.offline++;
    });

    return counts;
  },

  /**
   * Format device last seen time
   */
  formatLastSeen: (lastSeen: string): string => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  },

  /**
   * Format signal strength
   */
  formatSignalStrength: (strength?: number): string => {
    if (!strength) return "Unknown";
    if (strength > -50) return "Excellent";
    if (strength > -60) return "Good";
    if (strength > -70) return "Fair";
    return "Poor";
  },

  /**
   * Get device status color
   */
  getDeviceStatusColor: (device: Device): string => {
    if (device.settings?.soundEnabled === false) return "#666666"; // Gray for inactive
    if (device.isOnline) return "#22C55E"; // Green for online
    return "#EF4444"; // Red for offline
  },

  /**
   * Get device status text
   */
  getDeviceStatusText: (device: Device): string => {
    if (device.settings?.soundEnabled === false) return "Inactive";
    if (device.isOnline) return "Online • Connected";
    return "Offline";
  },
};
