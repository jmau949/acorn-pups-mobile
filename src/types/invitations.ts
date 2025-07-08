import { ApiResponse } from "./common";

/**
 * Invitation Types
 *
 * Type definitions for device invitations in the Acorn Pups system
 * Based on OpenAPI v1.0.0 specification - all properties use camelCase
 */

/**
 * Device Invitation - matches OpenAPI Invitation schema
 */
export interface Invitation {
  // Primary identifiers
  invitationId: string; // Unique UUID for invitation
  deviceId: string; // UUID of device being shared
  deviceName: string; // Device name for display

  // Invitation details
  email: string; // Email address of invited user
  invitedBy: string; // Name/email of user sending invitation
  notificationsPermission: boolean; // Can receive notifications
  settingsPermission: boolean; // Can modify device settings

  // Timestamps
  createdAt: string; // Invitation creation timestamp (ISO format)
  expiresAt: string; // Invitation expiration timestamp (ISO format)
}

/**
 * Send Invitation Request - matches OpenAPI UserInviteRequest
 */
export interface SendInvitationRequest {
  email: string;
  notificationsPermission?: boolean; // Default permissions for invited user
  settingsPermission?: boolean;
}

/**
 * Accept Invitation Request
 */
export interface AcceptInvitationRequest {
  invitationToken: string;
}

/**
 * Decline Invitation Request
 */
export interface DeclineInvitationRequest {
  invitationToken: string;
  reason?: string; // Optional reason for declining
}

/**
 * API Response types matching OpenAPI v1.0.0
 */

// Send invitation response data
export interface SendInvitationData {
  invitationId: string;
  email: string;
  deviceId: string;
  deviceName: string;
  notificationsPermission: boolean;
  settingsPermission: boolean;
  expiresAt: string;
  sentAt: string;
}

// Full send invitation API response
export interface SendInvitationResponse
  extends ApiResponse<SendInvitationData> {}

// User invitations response data
export interface UserInvitationsData {
  invitations: Invitation[];
  total: number;
}

// Full user invitations API response
export interface UserInvitationsResponse
  extends ApiResponse<UserInvitationsData> {}

// Accept invitation response data
export interface AcceptInvitationData {
  deviceId: string;
  message: string;
}

// Full accept invitation API response
export interface AcceptInvitationResponse
  extends ApiResponse<AcceptInvitationData> {}

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
