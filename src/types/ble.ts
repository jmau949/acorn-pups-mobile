export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number;
  isConnectable: boolean;
}

export interface QRCodeData {
  deviceName: string;
}

export interface BleConnectionState {
  isScanning: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  connectedDevice: BleDevice | null;
  error: string | null;
}

export enum BleError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  BLUETOOTH_DISABLED = "BLUETOOTH_DISABLED",
  DEVICE_NOT_FOUND = "DEVICE_NOT_FOUND",
  CONNECTION_FAILED = "CONNECTION_FAILED",
  SCANNING_FAILED = "SCANNING_FAILED",
  LOCATION_PERMISSION_DENIED = "LOCATION_PERMISSION_DENIED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}
