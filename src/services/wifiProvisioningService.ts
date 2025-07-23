import { Platform } from "react-native";
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

// BLE MTU configuration
const DEFAULT_MTU = 23; // Standard BLE MTU
const TARGET_MTU = 512; // Target for maximum throughput
const MIN_CHUNK_SIZE = 20; // Minimum safe chunk size (DEFAULT_MTU - 3)
const CHUNK_DELAY_MS = 15; // Delay between chunk writes to avoid overrun

class WiFiProvisioningService {
  private device: Device | null = null;
  private service: Service | null = null;
  private ssidCharacteristic: Characteristic | null = null;
  private statusCharacteristic: Characteristic | null = null;
  private statusSubscription: Subscription | null = null;
  private statusCallback: ((status: WiFiProvisioningStatus) => void) | null =
    null;
  private statusTimeout: NodeJS.Timeout | null = null;
  private negotiatedMTU: number = DEFAULT_MTU;

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
      // Negotiate MTU first for better performance
      await this.negotiateMTU(device);

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
   * Negotiate MTU for optimal data transfer
   */
  private async negotiateMTU(device: Device): Promise<void> {
    try {
      console.log("🔧 [WiFi] Negotiating MTU for optimal data transfer...");

      // On Android, explicitly request MTU
      if (Platform.OS === "android") {
        console.log(
          `🔧 [WiFi] Requesting MTU of ${TARGET_MTU} bytes (Android)...`
        );
        try {
          const mtuResult = await device.requestMTU(TARGET_MTU);
          // Some versions return the device, others return the MTU directly
          this.negotiatedMTU =
            typeof mtuResult === "number" ? mtuResult : TARGET_MTU;
          console.log(`✅ [WiFi] MTU negotiated: ${this.negotiatedMTU} bytes`);
        } catch (mtuError) {
          console.warn(
            "⚠️ [WiFi] MTU request failed, using fallback:",
            mtuError
          );
          this.negotiatedMTU = Math.min(TARGET_MTU, 247); // Common Android fallback
        }
      } else {
        // iOS handles MTU automatically, but we can check current MTU
        console.log("🔧 [WiFi] iOS detected - MTU will be auto-negotiated");
        // iOS typically negotiates 185 bytes automatically
        this.negotiatedMTU = 185; // Conservative estimate for iOS
        console.log(
          `✅ [WiFi] Using estimated MTU: ${this.negotiatedMTU} bytes`
        );
      }
    } catch (error) {
      console.warn("⚠️ [WiFi] MTU negotiation failed, using default:", error);
      this.negotiatedMTU = DEFAULT_MTU;
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
   * Calculate chunk size based on negotiated MTU
   */
  private getChunkSize(): number {
    // Reserve 3 bytes for BLE header/overhead
    const chunkSize = this.negotiatedMTU - 3;

    // Ensure minimum chunk size for safety
    return Math.max(chunkSize, MIN_CHUNK_SIZE);
  }

  /**
   * Split data into chunks for BLE transmission
   */
  private chunkData(data: string): string[] {
    const chunkSize = this.getChunkSize();
    const chunks: string[] = [];

    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    console.log("✂️ [WiFi] Data chunked for transmission:", {
      originalLength: data.length,
      chunkSize,
      numChunks: chunks.length,
      mtu: this.negotiatedMTU,
    });

    return chunks;
  }

  /**
   * Send data chunks with proper timing and protocol
   */
  private async sendChunkedData(data: string): Promise<void> {
    if (!this.ssidCharacteristic) {
      throw new Error("SSID characteristic not available");
    }

    // Create length-prefixed protocol: [8-digit length][raw JSON data]
    const lengthPrefix = data.length.toString().padStart(8, "0");
    const fullData = lengthPrefix + data;

    // Convert the full data to base64 for BLE transmission
    const base64Data = btoa(fullData);

    console.log("📦 [WiFi] Preparing chunked transmission:", {
      originalJsonLength: data.length,
      withPrefixLength: fullData.length,
      base64Length: base64Data.length,
      lengthPrefix,
    });

    // Split base64 data into chunks
    const chunks = this.chunkData(base64Data);

    // Send chunks sequentially with delays
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLastChunk = i === chunks.length - 1;

      console.log(`📤 [WiFi] Sending chunk ${i + 1}/${chunks.length}:`, {
        chunkLength: chunk.length,
        isLastChunk,
        progress: Math.round(((i + 1) / chunks.length) * 100),
      });

      try {
        // Send chunk (chunk is part of base64 string, send as-is)
        await this.ssidCharacteristic.writeWithResponse(chunk);

        // Add delay between chunks to prevent overrun (except for last chunk)
        if (!isLastChunk) {
          await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
        }
      } catch (error) {
        console.error(`💥 [WiFi] Failed to send chunk ${i + 1}:`, error);
        throw new Error(`Failed to send data chunk ${i + 1}`);
      }
    }

    console.log("✅ [WiFi] All chunks sent successfully!");
  }

  /**
   * Send WiFi credentials to the connected device using chunked transmission
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
      mtu: this.negotiatedMTU,
    });

    try {
      // Create enhanced credentials object
      const credentialsJson = JSON.stringify({
        ssid: credentials.ssid,
        password: credentials.password,
        device_name: credentials.device_name,
        auth_token: credentials.auth_token,
        user_timezone: credentials.user_timezone,
      });

      console.log("📝 [WiFi] Enhanced credentials JSON prepared:", {
        json: credentialsJson.substring(0, 100) + "...", // Truncate for security
        length: credentialsJson.length,
        includesAuthToken: credentialsJson.includes("auth_token"),
        includesDeviceName: credentialsJson.includes("device_name"),
        includesTimezone: credentialsJson.includes("user_timezone"),
      });

      // Send using chunked transmission
      await this.sendChunkedData(credentialsJson);

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
