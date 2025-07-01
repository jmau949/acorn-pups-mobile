import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device, State } from "react-native-ble-plx";
import { BleDevice, BleError } from "../types/ble";

class BleService {
  private manager: BleManager;
  private scanningTimeout?: NodeJS.Timeout;
  private readonly SCAN_TIMEOUT = 10000; // 10 seconds
  private connectedDevice: Device | null = null;

  constructor() {
    console.log("🔧 [BLE] BLE Service instantiated");
    this.manager = new BleManager();
  }

  /**
   * Initialize BLE manager and check permissions
   */
  async initialize(): Promise<void> {
    console.log("🚀 [BLE] Initializing BLE service...");

    const state = await this.manager.state();
    console.log("📡 [BLE] Current Bluetooth state:", { state });

    if (state !== State.PoweredOn) {
      console.error("❌ [BLE] Bluetooth not powered on:", { state });
      throw new Error(BleError.BLUETOOTH_DISABLED);
    }

    if (Platform.OS === "android") {
      console.log("🤖 [BLE] Android detected, requesting permissions...");
      await this.requestAndroidPermissions();
    } else {
      console.log("🍎 [BLE] iOS detected, no additional permissions needed");
    }

    console.log("✅ [BLE] BLE service initialized successfully");
  }

  /**
   * Request Android BLE permissions
   */
  private async requestAndroidPermissions(): Promise<void> {
    console.log("🔐 [BLE] Requesting Android permissions...");

    try {
      const permissions: string[] = [];

      // For Android 12+ (API 31+)
      const androidVersion =
        typeof Platform.Version === "string"
          ? parseInt(Platform.Version, 10)
          : Platform.Version;

      console.log("📱 [BLE] Android version detected:", { androidVersion });

      if (androidVersion >= 31) {
        console.log(
          "🔐 [BLE] Android 12+ detected, requesting BLUETOOTH_SCAN and BLUETOOTH_CONNECT"
        );
        permissions.push(
          "android.permission.BLUETOOTH_SCAN",
          "android.permission.BLUETOOTH_CONNECT"
        );
      } else {
        console.log(
          "🔐 [BLE] Android <12 detected, requesting ACCESS_FINE_LOCATION"
        );
        permissions.push("android.permission.ACCESS_FINE_LOCATION");
      }

      console.log("🔐 [BLE] Requesting permissions:", { permissions });
      const granted = await PermissionsAndroid.requestMultiple(
        permissions as any
      );

      console.log("🔐 [BLE] Permission results:", granted);

      // Check if required permissions are granted
      for (const permission of permissions) {
        const result = (granted as any)[permission];
        console.log("🔐 [BLE] Permission check:", { permission, result });

        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          console.error("❌ [BLE] Permission denied:", { permission, result });
          throw new Error(BleError.PERMISSION_DENIED);
        }
      }

      console.log("✅ [BLE] All Android permissions granted successfully");
    } catch (error) {
      console.error("💥 [BLE] Failed to request Android permissions:", error);
      throw new Error(BleError.PERMISSION_DENIED);
    }
  }

  /**
   * Check if Bluetooth is available and enabled
   */
  async isBluetoothAvailable(): Promise<boolean> {
    try {
      const state = await this.manager.state();
      const available = state === State.PoweredOn;
      console.log("📡 [BLE] Bluetooth availability check:", {
        state,
        available,
      });
      return available;
    } catch (error) {
      console.error("❌ [BLE] Failed to check Bluetooth availability:", error);
      return false;
    }
  }

  /**
   * Start scanning for BLE devices with optional target device name
   */
  async startScanning(
    targetDeviceName?: string,
    onDeviceFound?: (device: BleDevice) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    try {
      console.log("🔍 [BLE] Starting scan for devices...", {
        targetDeviceName,
        timestamp: new Date().toISOString(),
      });

      await this.initialize();

      const foundDevices = new Map<string, BleDevice>();

      // Set scanning timeout
      this.scanningTimeout = setTimeout(() => {
        console.log("⏰ [BLE] Scan timeout reached, stopping scan");
        this.stopScanning();
      }, this.SCAN_TIMEOUT);

      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error("❌ [BLE] Scan Error:", error);
          onError?.(BleError.SCANNING_FAILED);
          return;
        }

        if (!device || !device.name) {
          return;
        }

        // Filter for target device if specified
        if (targetDeviceName && !device.name.startsWith("AcornPups-")) {
          console.log(
            "⏭️ [BLE] Device does not match AcornPups pattern, skipping:",
            {
              deviceName: device.name,
              expectedPattern: "AcornPups-*",
            }
          );
          return;
        }

        console.log("📱 [BLE] Device discovered:", {
          id: device.id,
          name: device.name,
          rssi: device.rssi,
          isConnectable: device.isConnectable,
          matchesPattern: device.name.startsWith("AcornPups-"),
        });

        // Convert to our BleDevice format
        const bleDevice: BleDevice = {
          id: device.id,
          name: device.name,
          rssi: device.rssi || -100,
          isConnectable: device.isConnectable || false,
        };

        // Avoid duplicates
        if (!foundDevices.has(device.id)) {
          foundDevices.set(device.id, bleDevice);
          console.log("✅ [BLE] New device added to list:", {
            deviceId: device.id,
            deviceName: device.name,
            totalDevices: foundDevices.size,
          });
          onDeviceFound?.(bleDevice);
        }
      });
    } catch (error) {
      console.error("💥 [BLE] Failed to start scanning:", error);
      onError?.(
        error instanceof Error ? error.message : BleError.UNKNOWN_ERROR
      );
    }
  }

  /**
   * Stop BLE scanning
   */
  stopScanning(): void {
    try {
      console.log("🛑 [BLE] Stopping device scan");
      this.manager.stopDeviceScan();
      if (this.scanningTimeout) {
        clearTimeout(this.scanningTimeout);
        this.scanningTimeout = undefined;
      }
    } catch (error) {
      console.error("❌ [BLE] Failed to stop scanning:", error);
    }
  }

  /**
   * Connect to a BLE device
   */
  async connectToDevice(
    deviceId: string,
    onConnectionStateChange?: (isConnected: boolean) => void
  ): Promise<Device> {
    try {
      console.log("🔗 [BLE] Attempting to connect to device:", {
        deviceId,
        timestamp: new Date().toISOString(),
      });

      const device = await this.manager.connectToDevice(deviceId);

      console.log("✅ [BLE] Device connected successfully:", {
        deviceId: device.id,
        deviceName: device.name,
        timestamp: new Date().toISOString(),
      });

      // Store the connected device
      this.connectedDevice = device;

      // Monitor connection state
      device.onDisconnected((error, disconnectedDevice) => {
        console.log("🔌 [BLE] Device disconnected:", {
          deviceId: disconnectedDevice?.id,
          deviceName: disconnectedDevice?.name,
          error: error?.message,
          timestamp: new Date().toISOString(),
        });

        // Clear stored device
        this.connectedDevice = null;
        onConnectionStateChange?.(false);
      });

      console.log("🎯 [BLE] Connection state change callback registered");
      onConnectionStateChange?.(true);
      return device;
    } catch (error) {
      console.error("💥 [BLE] Connection failed:", {
        deviceId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw new Error(BleError.CONNECTION_FAILED);
    }
  }

  /**
   * Get the currently connected device
   */
  async getConnectedDevice(deviceId: string): Promise<Device | null> {
    if (this.connectedDevice && this.connectedDevice.id === deviceId) {
      console.log("📱 [BLE] Returning stored connected device:", {
        deviceId: this.connectedDevice.id,
        deviceName: this.connectedDevice.name,
      });
      return this.connectedDevice;
    }

    console.log("❌ [BLE] No connected device found for ID:", { deviceId });
    return null;
  }

  /**
   * Disconnect from a BLE device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      console.log("🔌 [BLE] Manually disconnecting device:", { deviceId });
      await this.manager.cancelDeviceConnection(deviceId);

      // Clear stored device
      this.connectedDevice = null;

      console.log("✅ [BLE] Device disconnected successfully:", { deviceId });
    } catch (error) {
      console.error("❌ [BLE] Failed to disconnect device:", {
        deviceId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Clean up BLE manager
   */
  destroy(): void {
    console.log("🧹 [BLE] Cleaning up BLE service...");
    this.stopScanning();
    this.manager.destroy();
    console.log("✅ [BLE] BLE service destroyed successfully");
  }
}

export const bleService = new BleService();
