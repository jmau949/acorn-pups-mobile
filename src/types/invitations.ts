/**
 * Invitation Types
 *
 * Type definitions for device invitations in the Acorn Pups system
 * Based on the Invitations table schema from technical documentation
 */

/**
 * Device Invitation - matches Invitations table schema
 */
export interface Invitation {
  // Primary identifiers
  invitation_id: string; // Unique UUID for invitation
  device_id: string; // UUID of device being shared

  // Invitation details
  invited_email: string; // Email address of invited user
  invited_by: string; // UUID of user sending invitation
  invitation_token: string; // Unique token for accepting invitation

  // Timestamps
  expires_at: string; // Invitation expiration timestamp (ISO format)
  created_at: string; // Invitation creation timestamp (ISO format)
  accepted_at?: string; // Invitation acceptance timestamp (ISO format)

  // Status
  is_accepted: boolean; // Whether invitation has been accepted
  is_expired: boolean; // Whether invitation has expired
}

/**
 * Send Invitation Request
 */
export interface SendInvitationRequest {
  device_id: string;
  invited_email: string;
  notifications_permission?: boolean; // Default permissions for invited user
  settings_permission?: boolean;
}

/**
 * Accept Invitation Request
 */
export interface AcceptInvitationRequest {
  invitation_token: string;
  device_nickname?: string; // User's custom name for the device
  notifications_enabled?: boolean; // User wants notifications from this device
  notification_sound?: string; // Notification sound preference
  notification_vibration?: boolean;
}

/**
 * Decline Invitation Request
 */
export interface DeclineInvitationRequest {
  invitation_token: string;
  reason?: string; // Optional reason for declining
}

/**
 * Invitation with Device Details (for display in UI)
 */
export interface InvitationWithDevice {
  invitation: Invitation;
  device_name: string; // Device name for display
  owner_name: string; // Name of user who sent invitation
  owner_email: string; // Email of user who sent invitation
}

/**
 * API Response types
 */
export interface SendInvitationResponse {
  invitation: Invitation;
  message: string;
}

export interface GetUserInvitationsResponse {
  invitations: InvitationWithDevice[];
  total_count: number;
}

export interface GetDeviceInvitationsResponse {
  invitations: Invitation[];
  total_count: number;
}

export interface AcceptInvitationResponse {
  device_user: {
    device_id: string;
    user_id: string;
    notifications_permission: boolean;
    settings_permission: boolean;
    notifications_enabled: boolean;
    device_nickname?: string;
  };
  message: string;
}

/**
 * Query Keys - for React Query
 */
export const INVITATION_QUERY_KEYS = {
  all: ["invitations"] as const,
  user: (userId: string) =>
    [...INVITATION_QUERY_KEYS.all, "user", userId] as const,
  device: (deviceId: string) =>
    [...INVITATION_QUERY_KEYS.all, "device", deviceId] as const,
  pending: (userId: string) =>
    [...INVITATION_QUERY_KEYS.user(userId), "pending"] as const,
} as const;
