/**
 * Device Types
 *
 * Type definitions for IoT devices in the Acorn Pups system
 * Based on the database schema from technical documentation
 */

/**
 * Device (Smart Receiver) - matches Devices table schema
 */
export interface Device {
  // Primary identifiers
  device_id: string; // Unique UUID for the device
  serial_number: string; // Hardware serial number (unique)
  mac_address: string; // Device MAC address

  // Device metadata
  device_name: string; // User-friendly name like "Living Room Receiver"
  owner_user_id: string; // UUID of device owner
  firmware_version: string; // Current firmware version
  hardware_version: string; // Hardware revision

  // Connectivity status
  is_online: boolean; // Current connectivity status
  last_seen: string; // Last communication timestamp (ISO format)
  wifi_ssid: string; // Connected WiFi network name
  signal_strength: number; // WiFi signal strength in dBm

  // Timestamps
  created_at: string; // Device registration timestamp (ISO format)
  updated_at: string; // Last metadata update timestamp (ISO format)

  // Device settings
  is_active: boolean; // Whether device is active/enabled
  sound_enabled: boolean; // Whether device makes sounds
  sound_volume: number; // Device sound volume, 1-10 scale
  led_brightness: number; // LED brightness level, 1-10 scale
  notification_cooldown: number; // Seconds between notifications

  // Quiet hours settings
  quiet_hours_enabled: boolean; // Whether quiet hours are active
  quiet_hours_start: string; // Time to stop ringing locally, e.g. "22:00"
  quiet_hours_end: string; // Time to resume ringing locally, e.g. "07:00"
}

/**
 * Device Status - matches DeviceStatus table schema
 */
export interface DeviceStatus {
  device_id: string; // UUID of the device
  status_type: DeviceStatusType; // Type: "CURRENT", "HEALTH", "CONNECTIVITY"
  timestamp: string; // Status report timestamp (ISO format)
  signal_strength: number; // WiFi signal strength at report time
  is_online: boolean; // Whether device was online
  memory_usage: number; // Device memory usage percentage
  cpu_temperature: number; // Device CPU temperature in Celsius
  uptime: number; // Device uptime in seconds
  error_count: number; // Number of errors since last report
  last_error_message?: string; // Most recent error message
  firmware_version: string; // Firmware version at report time
}

export enum DeviceStatusType {
  CURRENT = "CURRENT",
  HEALTH = "HEALTH",
  CONNECTIVITY = "CONNECTIVITY",
}

/**
 * Device User Relationship - matches DeviceUsers table schema
 */
export interface DeviceUser {
  device_id: string; // UUID of the device
  user_id: string; // UUID of user with access

  // Permissions
  notifications_permission: boolean; // Can receive notifications
  settings_permission: boolean; // Can modify device settings

  // User preferences for this device
  notifications_enabled: boolean; // User wants notifications from this device
  notification_sound: NotificationSoundType; // Notification sound preference
  notification_vibration: boolean; // Enable vibration for notifications

  // User-specific quiet hours
  quiet_hours_enabled: boolean; // User has quiet hours set
  quiet_hours_start: string; // User's quiet hours start time "HH:MM"
  quiet_hours_end: string; // User's quiet hours end time "HH:MM"

  // Customization
  custom_notification_sound?: string; // URL to custom sound file
  device_nickname?: string; // User's custom name for device

  // Invitation tracking
  invited_by: string; // UUID of user who sent invitation
  invited_at: string; // Invitation sent timestamp (ISO format)
  accepted_at: string; // Invitation accepted timestamp (ISO format)
  is_active: boolean; // Whether access permission is active
}

export enum NotificationSoundType {
  DEFAULT = "default",
  SILENT = "silent",
  CUSTOM = "custom",
}

/**
 * Device Settings Update Request
 */
export interface DeviceSettingsUpdate {
  device_name?: string;
  sound_enabled?: boolean;
  sound_volume?: number; // 1-10 scale
  led_brightness?: number; // 1-10 scale
  notification_cooldown?: number; // Seconds
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string; // "HH:MM" format
  quiet_hours_end?: string; // "HH:MM" format
}

/**
 * Device Registration Request
 */
export interface DeviceRegistrationRequest {
  serial_number: string;
  mac_address: string;
  device_name: string;
  firmware_version: string;
  hardware_version: string;
  wifi_ssid: string;
}

/**
 * API Response types
 */
export interface GetUserDevicesResponse {
  devices: Device[];
  device_users: DeviceUser[]; // User's relationship to each device
  total_count: number;
}

export interface GetDeviceStatusResponse {
  device: Device;
  status: DeviceStatus[];
  device_user: DeviceUser; // Current user's relationship to device
}

export interface RegisterDeviceResponse {
  device: Device;
  device_user: DeviceUser;
  aws_iot_certificate: string;
  aws_iot_private_key: string;
  aws_iot_endpoint: string;
}

/**
 * Query Keys - for React Query
 */
export const DEVICE_QUERY_KEYS = {
  all: ["devices"] as const,
  lists: () => [...DEVICE_QUERY_KEYS.all, "list"] as const,
  list: (userId: string) => [...DEVICE_QUERY_KEYS.lists(), userId] as const,
  details: () => [...DEVICE_QUERY_KEYS.all, "detail"] as const,
  detail: (deviceId: string) =>
    [...DEVICE_QUERY_KEYS.details(), deviceId] as const,
  status: (deviceId: string) =>
    [...DEVICE_QUERY_KEYS.all, "status", deviceId] as const,
  settings: (deviceId: string) =>
    [...DEVICE_QUERY_KEYS.all, "settings", deviceId] as const,
} as const;
