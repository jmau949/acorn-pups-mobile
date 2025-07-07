import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";
import {
  Device,
  DEVICE_QUERY_KEYS,
  DeviceSettingsUpdate,
  DeviceUser,
  GetUserDevicesResponse,
} from "../types/devices";
import {
  AcceptInvitationRequest as AcceptRequest,
  AcceptInvitationResponse as AcceptResponse,
  SendInvitationRequest as InvitationRequest,
  SendInvitationResponse as InvitationResponse,
} from "../types/invitations";
import { queryLogger } from "../utils/logger";

/**
 * Device Mutations with Optimized Cache Management
 *
 * Performance optimizations applied:
 * 1. ✅ Use refetchQueries instead of invalidateQueries after optimistic updates
 * 2. ✅ Only invalidate queries for fields actually displayed in DevicesScreen
 * 3. ✅ Added defensive type checks for undefined query data
 * 4. ✅ Match invalidation strategy to actual UI needs
 * 5. ✅ Skip invalidations for user preferences (not displayed in list)
 * 6. ✅ Use invalidateQueries only when adding/removing devices (can't optimize)
 *
 * Current UI usage audit:
 * - ✅ DEVICE_QUERY_KEYS.list(userId) - Used in DevicesScreen
 * - ❌ invitations queries - Not used in UI yet (commented out)
 * - ❌ individual device queries - Not used in UI yet
 *
 * DevicesScreen displays these fields:
 * - device_name, is_online, last_seen, signal_strength, wifi_ssid, firmware_version
 *
 * DevicesScreen does NOT display:
 * - Device settings: sound_volume, led_brightness, quiet_hours_*
 * - User preferences: device_nickname, notification_*, etc.
 *
 * Invalidation strategy:
 * - Device settings: Only invalidate if device_name changes
 * - User preferences: No invalidation needed (not displayed)
 * - Add/remove device: Must invalidate (adds/removes list items)
 * - Reset device: Must invalidate (affects displayed status fields)
 */

/**
 * Hook for updating device settings with optimistic updates
 *
 * Performance optimization: Only invalidates list if device_name changes
 * since other settings (volume, brightness, etc.) aren't shown in DevicesScreen
 */
export function useUpdateDeviceSettings(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deviceId,
      settings,
    }: {
      deviceId: string;
      settings: DeviceSettingsUpdate;
    }) => {
      queryLogger.fetchStart(["device-settings-update", deviceId]);
      const response = await apiClient.put<Device>(
        `/devices/${deviceId}/settings`,
        settings
      );
      queryLogger.fetchSuccess(["device-settings-update", deviceId], 0);
      return response.data;
    },

    // Optimistic update
    onMutate: async ({ deviceId, settings }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: DEVICE_QUERY_KEYS.list(userId),
      });

      // Snapshot the previous value
      const previousDevices = queryClient.getQueryData<GetUserDevicesResponse>(
        DEVICE_QUERY_KEYS.list(userId)
      );

      // Defensive check
      if (!previousDevices) return { previousDevices: null };

      // Optimistically update the cache
      queryClient.setQueryData<GetUserDevicesResponse>(
        DEVICE_QUERY_KEYS.list(userId),
        (old) => {
          if (!old) return old;

          return {
            ...old,
            devices: old.devices.map((device) =>
              device.device_id === deviceId
                ? {
                    ...device,
                    ...settings,
                    updated_at: new Date().toISOString(),
                  }
                : device
            ),
          };
        }
      );

      // Return a context object with the snapshotted value
      return { previousDevices };
    },

    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousDevices) {
        queryClient.setQueryData(
          DEVICE_QUERY_KEYS.list(userId),
          context.previousDevices
        );
      }
      queryLogger.fetchError(
        ["device-settings-update", variables.deviceId],
        err as Error
      );
    },

    // Smart invalidation: only if device_name changed (affects list display)
    onSettled: (data, error, variables) => {
      const changesDisplayedFields =
        variables.settings.device_name !== undefined;

      if (changesDisplayedFields) {
        // Use refetchQueries for displayed fields to prevent unnecessary refetches
        queryClient.refetchQueries({
          queryKey: DEVICE_QUERY_KEYS.list(userId),
          type: "active",
        });
      }
      // If only non-displayed fields changed (volume, brightness, etc.),
      // no invalidation needed since DevicesScreen doesn't show these
    },
  });
}

/**
 * Hook for updating user's device preferences (nickname, notifications, etc.)
 *
 * Performance optimization: No list invalidation needed since user preferences
 * (nickname, notifications, etc.) aren't displayed on DevicesScreen
 */
export function useUpdateUserDevicePreferences(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deviceId,
      preferences,
    }: {
      deviceId: string;
      preferences: Partial<DeviceUser>;
    }) => {
      queryLogger.fetchStart(["device-user-preferences-update", deviceId]);
      const response = await apiClient.put<DeviceUser>(
        `/devices/${deviceId}/users/${userId}`,
        preferences
      );
      queryLogger.fetchSuccess(["device-user-preferences-update", deviceId], 0);
      return response.data;
    },

    // Optimistic update for DeviceUser data
    onMutate: async ({ deviceId, preferences }) => {
      await queryClient.cancelQueries({
        queryKey: DEVICE_QUERY_KEYS.list(userId),
      });

      const previousDevices = queryClient.getQueryData<GetUserDevicesResponse>(
        DEVICE_QUERY_KEYS.list(userId)
      );

      // Defensive check
      if (!previousDevices) return { previousDevices: null };

      // Optimistically update device_users
      queryClient.setQueryData<GetUserDevicesResponse>(
        DEVICE_QUERY_KEYS.list(userId),
        (old) => {
          if (!old) return old;

          return {
            ...old,
            device_users: old.device_users.map((deviceUser) =>
              deviceUser.device_id === deviceId && deviceUser.user_id === userId
                ? { ...deviceUser, ...preferences }
                : deviceUser
            ),
          };
        }
      );

      return { previousDevices };
    },

    onError: (err, variables, context) => {
      if (context?.previousDevices) {
        queryClient.setQueryData(
          DEVICE_QUERY_KEYS.list(userId),
          context.previousDevices
        );
      }
      queryLogger.fetchError(
        ["device-user-preferences-update", variables.deviceId],
        err as Error
      );
    },

    // No invalidation needed: user preferences aren't displayed on DevicesScreen
    // The optimistic update above is sufficient for any future detail screens
    onSettled: () => {
      // Previously: queryClient.refetchQueries({ queryKey: DEVICE_QUERY_KEYS.list(userId) });
      // Optimization: User preferences (nickname, notifications) aren't shown in DevicesScreen
      // so no refetch needed. The optimistic update handles the cache correctly.
    },
  });
}

/**
 * Hook for sending device invitations
 */
export function useSendDeviceInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: InvitationRequest) => {
      queryLogger.fetchStart(["send-device-invitation", request.device_id]);
      const response = await apiClient.post<InvitationResponse>(
        `/devices/${request.device_id}/invite`,
        request
      );
      queryLogger.fetchSuccess(
        ["send-device-invitation", request.device_id],
        0
      );
      return response.data;
    },

    // No onSuccess invalidation needed since invitations aren't used in UI yet
    // onSuccess: (data, variables) => {
    //   // Invalidate device invitations list
    //   queryClient.invalidateQueries({
    //     queryKey: ["invitations", "device", variables.device_id],
    //   });
    // },

    onError: (err, variables) => {
      queryLogger.fetchError(
        ["send-device-invitation", variables.device_id],
        err as Error
      );
    },
  });
}

/**
 * Hook for accepting device invitations
 *
 * Performance optimization: Uses invalidateQueries since this adds a new device
 * to the user's list, which requires a fresh fetch
 */
export function useAcceptDeviceInvitation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AcceptRequest) => {
      queryLogger.fetchStart([
        "accept-device-invitation",
        request.invitation_token,
      ]);
      const response = await apiClient.post<AcceptResponse>(
        `/invitations/${request.invitation_token}/accept`,
        request
      );
      queryLogger.fetchSuccess(
        ["accept-device-invitation", request.invitation_token],
        0
      );
      return response.data;
    },

    onSuccess: () => {
      // Invalidate (not refetch) since we're adding a new device that we don't have cached
      queryClient.invalidateQueries({
        queryKey: DEVICE_QUERY_KEYS.list(userId),
      });
      // Note: Invitations queries removed since they're not used in UI yet
      // queryClient.invalidateQueries({
      //   queryKey: ["invitations", "user", userId],
      // });
    },

    onError: (err, variables) => {
      queryLogger.fetchError(
        ["accept-device-invitation", variables.invitation_token],
        err as Error
      );
    },
  });
}

/**
 * Hook for declining device invitations
 *
 * Performance optimization: No invalidation needed since declining doesn't
 * affect the user's device list
 */
export function useDeclineDeviceInvitation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invitationToken }: { invitationToken: string }) => {
      queryLogger.fetchStart(["decline-device-invitation", invitationToken]);
      const response = await apiClient.post(
        `/invitations/${invitationToken}/decline`
      );
      queryLogger.fetchSuccess(
        ["decline-device-invitation", invitationToken],
        0
      );
      return response.data;
    },

    onSuccess: () => {
      // No invalidation needed: declining doesn't affect user's device list
      // Note: Invitations queries removed since they're not used in UI yet
      // queryClient.invalidateQueries({
      //   queryKey: ["invitations", "user", userId],
      // });
    },

    onError: (err, variables) => {
      queryLogger.fetchError(
        ["decline-device-invitation", variables.invitationToken],
        err as Error
      );
    },
  });
}

/**
 * Hook for removing user access from a device
 *
 * Performance optimization: Uses invalidateQueries since this removes devices
 * from user lists, requiring fresh fetches
 */
export function useRemoveUserAccess(deviceOwnerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deviceId,
      userId,
    }: {
      deviceId: string;
      userId: string;
    }) => {
      queryLogger.fetchStart(["remove-user-access", deviceId, userId]);
      const response = await apiClient.delete(
        `/devices/${deviceId}/users/${userId}`
      );
      queryLogger.fetchSuccess(["remove-user-access", deviceId, userId], 0);
      return response.data;
    },

    onSuccess: (data, variables) => {
      // Invalidate device owner's devices list (device might be removed from their view)
      queryClient.invalidateQueries({
        queryKey: DEVICE_QUERY_KEYS.list(deviceOwnerId),
      });
      // Invalidate removed user's devices list (device will be removed from their list)
      queryClient.invalidateQueries({
        queryKey: DEVICE_QUERY_KEYS.list(variables.userId),
      });
    },

    onError: (err, variables) => {
      queryLogger.fetchError(
        ["remove-user-access", variables.deviceId, variables.userId],
        err as Error
      );
    },
  });
}

/**
 * Hook for device factory reset
 *
 * Performance optimization: Uses invalidateQueries since reset can change
 * device status, connectivity, and settings shown in DevicesScreen
 */
export function useResetDevice(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deviceId }: { deviceId: string }) => {
      queryLogger.fetchStart(["reset-device", deviceId]);
      const response = await apiClient.post(`/devices/${deviceId}/reset`);
      queryLogger.fetchSuccess(["reset-device", deviceId], 0);
      return response.data;
    },

    onSuccess: () => {
      // Invalidate device list since reset affects device status/connectivity shown in UI
      queryClient.invalidateQueries({
        queryKey: DEVICE_QUERY_KEYS.list(userId),
      });
      // Note: Removed broad invalidations since invitations aren't used in UI yet
      // queryClient.invalidateQueries({ queryKey: DEVICE_QUERY_KEYS.all });
      // queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },

    onError: (err, variables) => {
      queryLogger.fetchError(
        ["reset-device", variables.deviceId],
        err as Error
      );
    },
  });
}
