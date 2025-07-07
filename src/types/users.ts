/**
 * User Types
 *
 * Type definitions for users in the Acorn Pups system
 * Based on the Users table schema from technical documentation
 */

/**
 * User Profile - matches Users table schema
 */
export interface User {
  // Primary identifiers
  user_id: string; // Unique UUID for the user
  email: string; // User email address (unique)
  cognito_sub: string; // AWS Cognito user pool subject ID

  // Profile information
  full_name: string; // User full name
  phone?: string; // User phone number
  timezone: string; // User timezone, default: "UTC"

  // Timestamps
  created_at: string; // Account creation timestamp (ISO format)
  updated_at: string; // Last profile update timestamp (ISO format)
  last_login?: string; // Last login timestamp (ISO format)

  // Account status
  is_active: boolean; // Whether user account is active

  // Notification preferences
  push_notifications: boolean; // Global push notification preference
  sound_alerts: boolean; // Global sound alert preference
  vibration_alerts: boolean; // Global vibration alert preference

  // Localization
  preferred_language: string; // User preferred app language
}

/**
 * User Profile Update Request
 */
export interface UserProfileUpdate {
  full_name?: string;
  phone?: string;
  timezone?: string;
  push_notifications?: boolean;
  sound_alerts?: boolean;
  vibration_alerts?: boolean;
  preferred_language?: string;
}

/**
 * User Preferences for notifications
 */
export interface UserNotificationPreferences {
  push_notifications: boolean;
  sound_alerts: boolean;
  vibration_alerts: boolean;
  preferred_language: string;
}

/**
 * User Registration Request (from auth flow)
 */
export interface UserRegistrationRequest {
  email: string;
  full_name: string;
  phone?: string;
  timezone?: string;
  preferred_language?: string;
}

/**
 * API Response types
 */
export interface GetUserProfileResponse {
  user: User;
}

export interface UpdateUserProfileResponse {
  user: User;
}

/**
 * Query Keys - for React Query
 */
export const USER_QUERY_KEYS = {
  all: ["users"] as const,
  profile: (userId: string) =>
    [...USER_QUERY_KEYS.all, "profile", userId] as const,
  preferences: (userId: string) =>
    [...USER_QUERY_KEYS.all, "preferences", userId] as const,
} as const;
