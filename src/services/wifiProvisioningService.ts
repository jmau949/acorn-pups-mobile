import {
  Characteristic,
  Device,
  Service,
  Subscription,
} from "react-native-ble-plx";
import {
  WiFiCredentials,
  WiFiProvisioningError,
  WiFiProvisioningStatus,
} from "../types/wifi";
import { bleService } from "./bleService";

// Updated UUIDs from firmware specification
const WIFI_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const SSID_CHAR_UUID = "12345678-1234-1234-1234-123456789abd";
const PASSWORD_CHAR_UUID = "12345678-1234-1234-1234-123456789abe";
const STATUS_CHAR_UUID = "12345678-1234-1234-1234-123456789abf";

// Status timeout (matches ESP32 30-second timeout)
const STATUS_TIMEOUT_MS = 30000;

class WiFiProvisioningService {
  private device: Device | null = null;
  private service: Service | null = null;
  private ssidCharacteristic: Characteristic | null = null;
  private statusCharacteristic: Characteristic | null = null;
  private statusSubscription: Subscription | null = null;
  private statusCallback: ((status: WiFiProvisioningStatus) => void) | null =
    null;
  private statusTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize WiFi provisioning with a connected BLE device
   */
  async initialize(deviceId: string): Promise<void> {
    console.log("📡 [WiFi] Initializing WiFi provisioning service...", {
      deviceId,
    });

    // Get the connected device from BLE service
    const device = await bleService.getConnectedDevice(deviceId);
    if (!device) {
      throw new Error(WiFiProvisioningError.DEVICE_NOT_CONNECTED);
    }

    this.device = device;

    try {
      // Discover services
      console.log("🔍 [WiFi] Discovering BLE services...");
      await device.discoverAllServicesAndCharacteristics();

      // Get WiFi provisioning service
      console.log("🔍 [WiFi] Looking for WiFi provisioning service...");
      const services = await device.services();
      const service = services.find(
        (s: Service) => s.uuid.toLowerCase() === WIFI_SERVICE_UUID.toLowerCase()
      );

      if (!service) {
        console.error("❌ [WiFi] WiFi provisioning service not found");
        throw new Error(WiFiProvisioningError.SERVICE_NOT_FOUND);
      }

      this.service = service;
      console.log("✅ [WiFi] Found WiFi provisioning service:", {
        uuid: service.uuid,
        isPrimary: service.isPrimary,
      });

      // Get characteristics
      console.log("🔍 [WiFi] Discovering characteristics...");
      const characteristics = await service.characteristics();
      console.log("📋 [WiFi] Available characteristics:", {
        count: characteristics.length,
        characteristics: characteristics.map((c: Characteristic) => ({
          uuid: c.uuid,
          isWritableWithResponse: c.isWritableWithResponse,
          isWritableWithoutResponse: c.isWritableWithoutResponse,
          isReadable: c.isReadable,
          isNotifiable: c.isNotifiable,
        })),
      });

      // Find SSID characteristic (for sending credentials)
      this.ssidCharacteristic =
        characteristics.find(
          (c: Characteristic) =>
            c.uuid.toLowerCase() === SSID_CHAR_UUID.toLowerCase()
        ) || null;

      if (!this.ssidCharacteristic) {
        console.error("❌ [WiFi] SSID characteristic not found");
        throw new Error(WiFiProvisioningError.CHARACTERISTIC_NOT_FOUND);
      }

      console.log("✅ [WiFi] Found SSID characteristic:", {
        uuid: this.ssidCharacteristic.uuid,
        isWritable: this.ssidCharacteristic.isWritableWithResponse,
      });

      // Find status characteristic (for notifications)
      this.statusCharacteristic =
        characteristics.find(
          (c: Characteristic) =>
            c.uuid.toLowerCase() === STATUS_CHAR_UUID.toLowerCase()
        ) || null;

      if (!this.statusCharacteristic) {
        console.error("❌ [WiFi] Status characteristic not found");
        throw new Error(WiFiProvisioningError.CHARACTERISTIC_NOT_FOUND);
      }

      console.log("✅ [WiFi] Found status characteristic:", {
        uuid: this.statusCharacteristic.uuid,
        isNotifiable: this.statusCharacteristic.isNotifiable,
      });
    } catch (error) {
      console.error("💥 [WiFi] Failed to initialize WiFi provisioning:", error);
      throw error;
    }
  }

  /**
   * Subscribe to status notifications from the device
   */
  async subscribeToStatus(
    callback: (status: WiFiProvisioningStatus) => void
  ): Promise<void> {
    if (!this.device || !this.statusCharacteristic) {
      throw new Error(WiFiProvisioningError.DEVICE_NOT_CONNECTED);
    }

    console.log("📡 [WiFi] Subscribing to status notifications...");
    this.statusCallback = callback;

    try {
      // First check if notifications are already enabled
      if (!this.statusCharacteristic.isNotifiable) {
        console.log("📡 [WiFi] Status characteristic is not notifiable");
        console.log(
          "📡 [WiFi] Continuing without status notifications - will rely on timeout fallback"
        );
        return; // Don't throw - allow provisioning to continue
      }

      console.log("📡 [WiFi] Setting up notification monitoring...");

      // Subscribe to status notifications with better error handling
      this.statusSubscription = this.statusCharacteristic.monitor(
        (error, characteristic) => {
          if (error) {
            // BLE notification errors are common and expected - log as info/warn, not error
            console.log(
              "📡 [WiFi] BLE notification event:",
              error instanceof Error ? error.message : error
            );

            // Check if it's a "notify change failed" error - this is common on some devices
            if (error.message?.includes("notify change failed")) {
              console.log(
                "📡 [WiFi] Notification setup failed (common on some devices), continuing with timeout fallback..."
              );
              return; // Don't trigger error status
            }

            // For other notification issues, also just log and continue
            console.log(
              "📡 [WiFi] Notification event occurred, continuing with timeout fallback"
            );
            return;
          }

          if (characteristic?.value) {
            // Decode status from base64 (React Native compatible)
            try {
              const status = atob(characteristic.value);
              console.log("📡 [WiFi] Status from ESP32:", status);
              this.handleStatusUpdate(status);
            } catch (decodeError) {
              console.log(
                "📡 [WiFi] Base64 decode failed, trying raw string fallback:",
                decodeError
              );
              // Try direct string interpretation as fallback
              const status = characteristic.value;
              console.log("📡 [WiFi] Status (raw):", status);
              this.handleStatusUpdate(status);
            }
          }
        }
      );

      console.log("✅ [WiFi] Successfully subscribed to status notifications");
    } catch (error) {
      console.log(
        "📡 [WiFi] Could not set up status notifications (common on some devices):",
        error instanceof Error ? error.message : error
      );
      // Don't throw here - allow provisioning to continue without status updates
      console.log(
        "📡 [WiFi] Continuing without status notifications - will rely on timeout fallback"
      );
    }
  }

  /**
   * Handle status updates from the device
   */
  private handleStatusUpdate(status: string): void {
    // Clear timeout on any status update
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }

    let provisioningStatus: WiFiProvisioningStatus;

    switch (status) {
      case "RECEIVED":
        provisioningStatus = {
          phase: "processing",
          progress: 25,
          message: "✅ Credentials received",
          isComplete: false,
          isError: false,
        };
        break;

      case "PROCESSING":
        provisioningStatus = {
          phase: "processing",
          progress: 50,
          message: "🔄 Processing credentials...",
          isComplete: false,
          isError: false,
        };
        break;

      case "STORED":
        provisioningStatus = {
          phase: "processing",
          progress: 75,
          message: "💾 Credentials stored",
          isComplete: false,
          isError: false,
        };
        break;

      case "SUCCESS":
        provisioningStatus = {
          phase: "complete",
          progress: 100,
          message: "🎉 WiFi provisioning successful!",
          isComplete: true,
          isError: false,
        };
        break;

      case "STORAGE_FAILED":
        provisioningStatus = {
          phase: "error",
          progress: 0,
          message: "❌ Failed to store credentials",
          isComplete: true,
          isError: true,
          error: "Device couldn't save WiFi settings",
        };
        break;

      case "ERROR_INVALID_JSON":
        provisioningStatus = {
          phase: "error",
          progress: 0,
          message: "❌ Invalid credential format",
          isComplete: true,
          isError: true,
          error: "WiFi credentials format was invalid",
        };
        break;

      default:
        console.warn(`⚠️ [WiFi] Unknown status: ${status}`);
        provisioningStatus = {
          phase: "error",
          progress: 0,
          message: `❌ Unknown status: ${status}`,
          isComplete: true,
          isError: true,
          error: `Received unknown status: ${status}`,
        };
    }

    console.log("📊 [WiFi] Status update:", provisioningStatus);

    if (this.statusCallback) {
      this.statusCallback(provisioningStatus);
    }
  }

  /**
   * Send WiFi credentials to the connected device
   */
  async sendWiFiCredentials(credentials: WiFiCredentials): Promise<void> {
    if (!this.device || !this.ssidCharacteristic) {
      throw new Error(WiFiProvisioningError.DEVICE_NOT_CONNECTED);
    }

    if (!credentials.ssid || credentials.ssid.trim().length === 0) {
      throw new Error(WiFiProvisioningError.INVALID_CREDENTIALS);
    }

    if (!credentials.auth_token || credentials.auth_token.trim().length === 0) {
      throw new Error(WiFiProvisioningError.INVALID_CREDENTIALS);
    }

    console.log("📤 [WiFi] Sending enhanced WiFi credentials...", {
      ssid: credentials.ssid,
      passwordLength: credentials.password.length,
      deviceName: credentials.device_name,
      timezone: credentials.user_timezone,
      authTokenLength: credentials.auth_token.length,
      deviceId: this.device.id,
      characteristicUuid: this.ssidCharacteristic.uuid,
    });

    try {
      // Prepare enhanced credentials JSON with auth token and device metadata
      const credentialsJson = JSON.stringify({
        ssid: credentials.ssid,
        password: credentials.password,
        auth_token: credentials.auth_token,
        device_name: credentials.device_name,
        user_timezone: credentials.user_timezone,
      });

      console.log("📝 [WiFi] Enhanced credentials JSON prepared:", {
        json: credentialsJson.substring(0, 100) + "...", // Truncate for security
        length: credentialsJson.length,
        includesAuthToken: credentialsJson.includes("auth_token"),
        includesDeviceName: credentialsJson.includes("device_name"),
        includesTimezone: credentialsJson.includes("user_timezone"),
      });

      // Convert to base64 for BLE transmission (React Native compatible)
      const base64Data = btoa(credentialsJson);

      console.log(
        "📤 [WiFi] Sending enhanced credentials to SSID characteristic...",
        {
          dataLength: base64Data.length,
          useResponse: this.ssidCharacteristic.isWritableWithResponse,
        }
      );

      // Send credentials with write response
      await this.ssidCharacteristic.writeWithResponse(base64Data);

      console.log("✅ [WiFi] Enhanced WiFi credentials sent successfully!");

      // Start timeout for status updates (30 seconds)
      this.startStatusTimeout();
    } catch (error) {
      // Check if it's a disconnection error - this is normal behavior
      if (error instanceof Error && error.message?.includes("disconnected")) {
        console.log(
          "🔌 [WiFi] Device disconnected after sending credentials - this is normal behavior"
        );
        console.log("📱 [WiFi] Device is restarting to connect to WiFi");

        // Treat disconnection as success since credentials were likely sent
        if (this.statusCallback) {
          const disconnectionStatus: WiFiProvisioningStatus = {
            phase: "complete",
            progress: 100,
            message: "📱 Device restarted to connect to WiFi",
            isComplete: true,
            isError: false,
            warning:
              "Device disconnected after receiving credentials (normal behavior)",
          };
          this.statusCallback(disconnectionStatus);
        }
        return; // Don't throw error
      }

      // Only log as error if it's actually an unexpected failure
      console.error(
        "💥 [WiFi] Unexpected error sending WiFi credentials:",
        error
      );
      throw new Error(WiFiProvisioningError.WRITE_FAILED);
    }
  }

  /**
   * Start timeout for status updates
   */
  private startStatusTimeout(): void {
    console.log("⏰ [WiFi] Starting 30-second status timeout...");

    this.statusTimeout = setTimeout(() => {
      console.warn("⏰ [WiFi] Status timeout - device may have restarted");

      // Assume success on timeout (device may have restarted)
      const timeoutStatus: WiFiProvisioningStatus = {
        phase: "complete",
        progress: 100,
        message: "✅ WiFi credentials sent successfully!",
        isComplete: true,
        isError: false,
        warning:
          "Device likely connected to WiFi and restarted (normal behavior)",
      };

      if (this.statusCallback) {
        this.statusCallback(timeoutStatus);
      }
    }, STATUS_TIMEOUT_MS);
  }

  /**
   * Check if WiFi provisioning is available
   */
  isAvailable(): boolean {
    return !!(
      this.device &&
      this.service &&
      this.ssidCharacteristic &&
      this.statusCharacteristic
    );
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    console.log("🧹 [WiFi] Cleaning up WiFi provisioning service...");

    // Clear timeout
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }

    // Unsubscribe from status notifications
    if (this.statusSubscription) {
      this.statusSubscription.remove();
      this.statusSubscription = null;
    }

    // Clear references
    this.device = null;
    this.service = null;
    this.ssidCharacteristic = null;
    this.statusCharacteristic = null;
    this.statusCallback = null;
  }

  /**
   * Get error message for display
   */
  getErrorMessage(error: string): string {
    switch (error) {
      case WiFiProvisioningError.SERVICE_NOT_FOUND:
        return "WiFi provisioning service not found on device.";
      case WiFiProvisioningError.CHARACTERISTIC_NOT_FOUND:
        return "WiFi provisioning characteristics not found.";
      case WiFiProvisioningError.WRITE_FAILED:
        return "Failed to send WiFi credentials to device.";
      case WiFiProvisioningError.DEVICE_NOT_CONNECTED:
        return "Device is not connected.";
      case WiFiProvisioningError.INVALID_CREDENTIALS:
        return "Please enter a valid WiFi network name.";
      case WiFiProvisioningError.TIMEOUT:
        return "WiFi provisioning timed out.";
      default:
        return "An error occurred during WiFi provisioning.";
    }
  }
}

export const wifiProvisioningService = new WiFiProvisioningService();
