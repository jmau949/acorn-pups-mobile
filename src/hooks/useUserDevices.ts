/**
 * useUserDevices Hook
 *
 * Custom hook for fetching and managing user devices using React Query
 */

import { apiRequest } from "@/services/apiClient";
import {
  Device,
  DEVICE_QUERY_KEYS,
  DeviceUser,
  GetUserDevicesResponse,
} from "@/types/devices";
import { queryLogger } from "@/utils/logger";
import { useQuery, UseQueryResult } from "@tanstack/react-query";

export interface UseUserDevicesOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
}

export interface UseUserDevicesResult {
  devices: Device[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  isSuccess: boolean;
  refetch: () => Promise<any>;
  isRefetching: boolean;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
}

/**
 * Hook for fetching user's devices
 */
export function useUserDevices(
  userId: string
): UseQueryResult<GetUserDevicesResponse, Error> {
  return useQuery({
    queryKey: DEVICE_QUERY_KEYS.list(userId),
    queryFn: async () => {
      const queryKey = DEVICE_QUERY_KEYS.list(userId);
      queryLogger.fetchStart([...queryKey]);
      const startTime = Date.now();

      try {
        const response = await apiRequest.get<GetUserDevicesResponse>(
          `/users/${userId}/devices`
        );
        const duration = Date.now() - startTime;
        queryLogger.fetchSuccess([...queryKey], duration);
        return response.data;
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
 * Hook for fetching user's devices with immediate cache loading
 */
export function useUserDevicesImmediate(
  userId: string
): UseQueryResult<GetUserDevicesResponse, Error> {
  return useQuery({
    queryKey: DEVICE_QUERY_KEYS.list(userId),
    queryFn: async () => {
      const queryKey = DEVICE_QUERY_KEYS.list(userId);
      queryLogger.fetchStart([...queryKey]);
      const startTime = Date.now();

      try {
        const response = await apiRequest.get<GetUserDevicesResponse>(
          `/users/${userId}/devices`
        );
        const duration = Date.now() - startTime;
        queryLogger.fetchSuccess([...queryKey], duration);
        return response.data;
      } catch (error) {
        queryLogger.fetchError([...queryKey], error as Error);
        throw error;
      }
    },
    staleTime: 0, // Always consider stale for immediate refetch
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!userId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Hook for fetching user's devices with longer cache time
 */
export function useUserDevicesLongCache(
  userId: string
): UseQueryResult<GetUserDevicesResponse, Error> {
  return useQuery({
    queryKey: DEVICE_QUERY_KEYS.list(userId),
    queryFn: async () => {
      const queryKey = DEVICE_QUERY_KEYS.list(userId);
      queryLogger.fetchStart([...queryKey]);
      const startTime = Date.now();

      try {
        const response = await apiRequest.get<GetUserDevicesResponse>(
          `/users/${userId}/devices`
        );
        const duration = Date.now() - startTime;
        queryLogger.fetchSuccess([...queryKey], duration);
        return response.data;
      } catch (error) {
        queryLogger.fetchError([...queryKey], error as Error);
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!userId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Hook for offline-first device fetching
 */
export function useUserDevicesOffline(
  userId: string
): UseQueryResult<GetUserDevicesResponse, Error> {
  return useQuery({
    queryKey: DEVICE_QUERY_KEYS.list(userId),
    queryFn: async () => {
      const queryKey = DEVICE_QUERY_KEYS.list(userId);
      queryLogger.fetchStart([...queryKey]);
      const startTime = Date.now();

      try {
        const response = await apiRequest.get<GetUserDevicesResponse>(
          `/users/${userId}/devices`
        );
        const duration = Date.now() - startTime;
        queryLogger.fetchSuccess([...queryKey], duration);
        return response.data;
      } catch (error) {
        queryLogger.fetchError([...queryKey], error as Error);
        throw error;
      }
    },
    staleTime: Infinity, // Never refetch automatically
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: !!userId,
    retry: 1, // Only retry once for offline mode
    retryDelay: 2000,
  });
}

/**
 * Device utility functions
 */
export const deviceUtils = {
  /**
   * Filter devices by online status
   */
  filterOnlineDevices: (devices: Device[]): Device[] => {
    return devices.filter((device) => device.is_online);
  },

  /**
   * Filter devices by active status
   */
  filterActiveDevices: (devices: Device[]): Device[] => {
    return devices.filter((device) => device.is_active);
  },

  /**
   * Sort devices by name
   */
  sortDevicesByName: (devices: Device[]): Device[] => {
    return [...devices].sort((a, b) =>
      a.device_name.localeCompare(b.device_name)
    );
  },

  /**
   * Sort devices by last seen (most recent first)
   */
  sortDevicesByLastSeen: (devices: Device[]): Device[] => {
    return [...devices].sort(
      (a, b) =>
        new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
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
      active: 0,
      inactive: 0,
    };

    devices.forEach((device) => {
      if (device.is_online) counts.online++;
      else counts.offline++;

      if (device.is_active) counts.active++;
      else counts.inactive++;
    });

    return counts;
  },

  /**
   * Get user's permissions for a device
   */
  getUserDevicePermissions: (
    deviceUsers: DeviceUser[],
    deviceId: string,
    userId: string
  ) => {
    const deviceUser = deviceUsers.find(
      (du) => du.device_id === deviceId && du.user_id === userId
    );
    return deviceUser
      ? {
          notifications_permission: deviceUser.notifications_permission,
          settings_permission: deviceUser.settings_permission,
          notifications_enabled: deviceUser.notifications_enabled,
          device_nickname: deviceUser.device_nickname,
        }
      : null;
  },

  /**
   * Check if user owns a device
   */
  isDeviceOwner: (device: Device, userId: string): boolean => {
    return device.owner_user_id === userId;
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
  formatSignalStrength: (strength: number): string => {
    if (strength > -50) return "Excellent";
    if (strength > -60) return "Good";
    if (strength > -70) return "Fair";
    return "Poor";
  },

  /**
   * Get device status color
   */
  getDeviceStatusColor: (device: Device): string => {
    if (!device.is_active) return "#666666"; // Gray for inactive
    if (device.is_online) return "#22C55E"; // Green for online
    return "#EF4444"; // Red for offline
  },
};
