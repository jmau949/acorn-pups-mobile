export interface WiFiCredentials {
  ssid: string;
  password: string;
}

export interface WiFiProvisioningState {
  isProvisioning: boolean;
  isComplete: boolean;
  error: string | null;
  progress: string | null;
}

export interface WiFiProvisioningStatus {
  phase:
    | "scanning"
    | "connecting"
    | "sending"
    | "processing"
    | "complete"
    | "error";
  progress: number; // 0-100
  message: string;
  isComplete: boolean;
  isError: boolean;
  error?: string;
  warning?: string;
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
