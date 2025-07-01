export interface WiFiCredentials {
  ssid: string;
  password: string;
}

export interface WiFiProvisioningState {
  isProvisioning: boolean;
  isComplete: boolean;
  error: string | null;
  progress: "discovering" | "writing" | "verifying" | "complete" | null;
}

export enum WiFiProvisioningError {
  SERVICE_NOT_FOUND = "SERVICE_NOT_FOUND",
  CHARACTERISTIC_NOT_FOUND = "CHARACTERISTIC_NOT_FOUND",
  WRITE_FAILED = "WRITE_FAILED",
  DEVICE_NOT_CONNECTED = "DEVICE_NOT_CONNECTED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  TIMEOUT = "TIMEOUT",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}
