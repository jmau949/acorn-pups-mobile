/**
 * Device Types
 *
 * Type definitions for IoT devices in the Acorn Pups system
 * Based on OpenAPI v1.0.0 specification
 */

import { ApiResponse } from "./common";

/**
 * Device (Smart Receiver) - matches OpenAPI Device schema
 */
export interface Device {
  // Primary identifiers
  deviceId: string; // Updated to match OpenAPI (camelCase)
  deviceName: string; // Updated to match OpenAPI (camelCase)
  serialNumber: string; // Updated to match OpenAPI (camelCase)
  macAddress?: string; // Optional in OpenAPI spec

  // Owner information
  ownerId?: string; // Owner user ID (optional for non-owner views)

  // Connectivity status
  isOnline: boolean; // Updated to match OpenAPI (camelCase)
  lastSeen: string; // Last communication timestamp (ISO format)

  // Device metadata
  firmwareVersion?: string; // Optional in OpenAPI spec

  // Device settings (from OpenAPI DeviceSettings schema)
  settings?: DeviceSettings;

  // User permissions for this device
  permissions?: {
    notifications: boolean;
    settings: boolean;
  };

  // Registration timestamp
  registeredAt: string; // Updated to match OpenAPI (camelCase)
}

/**
 * Device Settings - matches OpenAPI DeviceSettings schema
 */
export interface DeviceSettings {
  soundEnabled: boolean;
  soundVolume: number; // 1-10 scale
  ledBrightness: number; // 1-10 scale
  notificationCooldown: number; // Seconds between notifications
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // "HH:MM" format
  quietHoursEnd?: string; // "HH:MM" format
}

/**
 * Device Settings Update Request - matches OpenAPI DeviceSettingsRequest
 */
export interface DeviceSettingsUpdate {
  soundEnabled?: boolean;
  soundVolume?: number; // 1-10 scale
  ledBrightness?: number; // 1-10 scale
  notificationCooldown?: number; // Seconds
  quietHoursEnabled?: boolean;
  quietHoursStart?: string; // "HH:MM" format
  quietHoursEnd?: string; // "HH:MM" format
}

/**
 * Device Registration Request - matches OpenAPI DeviceRegistrationRequest
 */
export interface DeviceRegistrationRequest {
  deviceId: string; // Updated to match OpenAPI (camelCase)
  deviceName: string; // Updated to match OpenAPI (camelCase)
  serialNumber: string; // Updated to match OpenAPI (camelCase)
  macAddress: string; // Updated to match OpenAPI (camelCase)
}

/**
 * API Response types matching OpenAPI v1.0.0 specification
 */

// Raw API response data (what comes in the "data" field)
export interface UserDevicesData {
  devices: Device[];
  total: number;
}

// Full API response (includes requestId)
export interface UserDevicesApiResponse extends ApiResponse<UserDevicesData> {}

// Device registration response data
export interface DeviceRegistrationData {
  deviceId: string;
  deviceName: string;
  serialNumber: string;
  ownerId: string;
  registeredAt: string;
  status: "pending" | "active";
  certificates: {
    deviceCertificate: string;
    privateKey: string;
    iotEndpoint: string;
  };
}

// Full device registration API response
export interface DeviceRegistrationApiResponse
  extends ApiResponse<DeviceRegistrationData> {}

// Device settings response data
export interface DeviceSettingsData extends DeviceSettings {}

// Full device settings API response
export interface DeviceSettingsApiResponse
  extends ApiResponse<DeviceSettingsData> {}

// Device reset response data
export interface DeviceResetData {
  deviceId: string;
  message: string;
  resetInitiatedAt: string;
}

// Full device reset API response
export interface DeviceResetApiResponse extends ApiResponse<DeviceResetData> {}

/**
 * Device Status - matches DeviceStatus table schema
 */
export interface DeviceStatus {
  device_id: string;
  status_type: DeviceStatusType;
  timestamp: string;
  signal_strength: number;
  is_online: boolean;
  memory_usage: number;
  cpu_temperature: number;
  uptime: number;
  error_count: number;
  last_error_message?: string;
  firmware_version: string;
}

export enum DeviceStatusType {
  CURRENT = "CURRENT",
  HEALTH = "HEALTH",
  CONNECTIVITY = "CONNECTIVITY",
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
