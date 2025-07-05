import { Characteristic, Device, Service } from "react-native-ble-plx";
import { WiFiCredentials, WiFiProvisioningError } from "../types/wifi";
import { bleService } from "./bleService";

// Common UUIDs for WiFi provisioning (these might need to be adjusted based on your ESP32 implementation)
const WIFI_PROVISIONING_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const WIFI_CREDENTIALS_CHARACTERISTIC_UUID =
  "87654321-4321-4321-4321-cba987654321";

// ESP32 common service UUIDs to try
const ESP32_COMMON_UUIDS = [
  "12345678-1234-1234-1234-123456789abc", // Generic
  "0000180F-0000-1000-8000-00805F9B34FB", // Battery Service
  "0000181A-0000-1000-8000-00805F9B34FB", // Environmental Sensing
  "6E400001-B5A3-F393-E0A9-E50E24DCCA9E", // Nordic UART Service
  "4fafc201-1fb5-459e-8fcc-c5c9c331914b", // ESP32 Custom
];

class WiFiProvisioningService {
  private device: Device | null = null;
  private service: Service | null = null;
  private characteristic: Characteristic | null = null;

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

      // Get all services for debugging
      const services = await device.services();
      console.log("📋 [WiFi] Available services:", {
        count: services.length,
        services: services.map((s: Service) => ({
          uuid: s.uuid,
          isPrimary: s.isPrimary,
        })),
      });

      // Try to find a suitable service for WiFi provisioning
      let provisioningService = this.findBestService(services);

      if (!provisioningService) {
        console.error(
          "❌ [WiFi] No suitable service found for WiFi provisioning"
        );
        throw new Error(WiFiProvisioningError.SERVICE_NOT_FOUND);
      }

      this.service = provisioningService;
      console.log("✅ [WiFi] Using service for WiFi provisioning:", {
        uuid: provisioningService.uuid,
        isPrimary: provisioningService.isPrimary,
      });

      // Get characteristics
      const characteristics = await provisioningService.characteristics();
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

      // Find the best writable characteristic
      let credentialsCharacteristic =
        this.findBestCharacteristic(characteristics);

      if (!credentialsCharacteristic) {
        console.error("❌ [WiFi] No writable characteristic found");
        throw new Error(WiFiProvisioningError.CHARACTERISTIC_NOT_FOUND);
      }

      this.characteristic = credentialsCharacteristic;
      console.log("✅ [WiFi] Using characteristic for WiFi credentials:", {
        uuid: credentialsCharacteristic.uuid,
        isWritableWithResponse:
          credentialsCharacteristic.isWritableWithResponse,
        isWritableWithoutResponse:
          credentialsCharacteristic.isWritableWithoutResponse,
      });
    } catch (error) {
      console.error("💥 [WiFi] Failed to initialize WiFi provisioning:", error);
      throw error;
    }
  }

  /**
   * Find the best service for WiFi provisioning
   */
  private findBestService(services: Service[]): Service | null {
    console.log("🔍 [WiFi] Searching for best service...");

    // Try specific WiFi provisioning service first
    let service = services.find(
      (s: Service) =>
        s.uuid.toLowerCase() === WIFI_PROVISIONING_SERVICE_UUID.toLowerCase()
    );
    if (service) {
      console.log("✅ [WiFi] Found specific WiFi provisioning service");
      return service;
    }

    // Try ESP32 common UUIDs
    for (const uuid of ESP32_COMMON_UUIDS) {
      service = services.find(
        (s: Service) => s.uuid.toLowerCase() === uuid.toLowerCase()
      );
      if (service) {
        console.log("✅ [WiFi] Found ESP32 common service:", { uuid });
        return service;
      }
    }

    // Use the first custom service (non-standard UUID)
    service = services.find(
      (s: Service) =>
        !s.uuid.startsWith("0000") && // Not a standard BLE service
        s.uuid.length === 36 // Full UUID format
    );
    if (service) {
      console.log("✅ [WiFi] Using first custom service:", {
        uuid: service.uuid,
      });
      return service;
    }

    // Last resort - use any service
    if (services.length > 0) {
      console.log("⚠️ [WiFi] Using first available service as fallback");
      return services[0];
    }

    return null;
  }

  /**
   * Find the best characteristic for WiFi credentials
   */
  private findBestCharacteristic(
    characteristics: Characteristic[]
  ): Characteristic | null {
    console.log("🔍 [WiFi] Searching for best characteristic...");

    // Try specific WiFi credentials characteristic first
    let char = characteristics.find(
      (c: Characteristic) =>
        c.uuid.toLowerCase() ===
        WIFI_CREDENTIALS_CHARACTERISTIC_UUID.toLowerCase()
    );
    if (
      char &&
      (char.isWritableWithResponse || char.isWritableWithoutResponse)
    ) {
      console.log("✅ [WiFi] Found specific WiFi credentials characteristic");
      return char;
    }

    // Find any writable characteristic (prefer writeWithResponse)
    char = characteristics.find(
      (c: Characteristic) => c.isWritableWithResponse
    );
    if (char) {
      console.log("✅ [WiFi] Found writable characteristic (with response):", {
        uuid: char.uuid,
      });
      return char;
    }

    // Find any writable characteristic (writeWithoutResponse)
    char = characteristics.find(
      (c: Characteristic) => c.isWritableWithoutResponse
    );
    if (char) {
      console.log(
        "✅ [WiFi] Found writable characteristic (without response):",
        { uuid: char.uuid }
      );
      return char;
    }

    console.error("❌ [WiFi] No writable characteristics found");
    return null;
  }

  /**
   * Send WiFi credentials to the connected device
   */
  async sendWiFiCredentials(credentials: WiFiCredentials): Promise<void> {
    if (!this.device || !this.characteristic) {
      throw new Error(WiFiProvisioningError.DEVICE_NOT_CONNECTED);
    }

    if (!credentials.ssid || credentials.ssid.trim().length === 0) {
      throw new Error(WiFiProvisioningError.INVALID_CREDENTIALS);
    }

    console.log("📡 [WiFi] Sending WiFi credentials...", {
      ssid: credentials.ssid,
      passwordLength: credentials.password.length,
      deviceId: this.device.id,
      characteristicUuid: this.characteristic.uuid,
      canWriteWithResponse: this.characteristic.isWritableWithResponse,
      canWriteWithoutResponse: this.characteristic.isWritableWithoutResponse,
    });

    try {
      // Prepare credentials JSON in the exact format requested
      const credentialsJson = JSON.stringify({
        ssid: credentials.ssid,
        password: credentials.password,
      });

      console.log("📝 [WiFi] Credentials JSON prepared:", {
        json: credentialsJson,
        length: credentialsJson.length,
      });

      // Try different encoding methods (React Native compatible)
      const encodingMethods = [
        {
          name: "base64",
          data: btoa(credentialsJson), // Use btoa() instead of Buffer for base64
        },
        { name: "utf8", data: credentialsJson },
        {
          name: "hex",
          data: credentialsJson
            .split("")
            .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join(""),
        },
      ];

      for (const method of encodingMethods) {
        try {
          console.log(`📤 [WiFi] Trying ${method.name} encoding...`, {
            dataLength: method.data.length,
            useResponse: this.characteristic.isWritableWithResponse,
          });

          // Try writeWithResponse first, then writeWithoutResponse
          if (this.characteristic.isWritableWithResponse) {
            await this.characteristic.writeWithResponse(method.data);
          } else if (this.characteristic.isWritableWithoutResponse) {
            await this.characteristic.writeWithoutResponse(method.data);
          } else {
            throw new Error("Characteristic is not writable");
          }

          console.log(
            `✅ [WiFi] WiFi credentials sent successfully using ${method.name} encoding!`
          );
          console.log("🎯 [WiFi] Data sent to firmware:", {
            encoding: method.name,
            data: method.data,
            originalJson: credentialsJson,
          });
          return; // Success!
        } catch (error) {
          console.warn(`⚠️ [WiFi] Failed with ${method.name} encoding:`, error);
          // Continue to next encoding method
        }
      }

      // If all encoding methods failed
      throw new Error("All encoding methods failed");
    } catch (error) {
      console.error("💥 [WiFi] Failed to send WiFi credentials:", error);
      throw new Error(WiFiProvisioningError.WRITE_FAILED);
    }
  }

  /**
   * Check if WiFi provisioning is available
   */
  isAvailable(): boolean {
    return !!(this.device && this.service && this.characteristic);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    console.log("🧹 [WiFi] Cleaning up WiFi provisioning service...");
    this.device = null;
    this.service = null;
    this.characteristic = null;
  }

  /**
   * Get error message for display
   */
  getErrorMessage(error: string): string {
    switch (error) {
      case WiFiProvisioningError.SERVICE_NOT_FOUND:
        return "WiFi provisioning service not found on device.";
      case WiFiProvisioningError.CHARACTERISTIC_NOT_FOUND:
        return "WiFi credentials characteristic not found.";
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
