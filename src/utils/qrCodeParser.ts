import { QRCodeData } from "../types/ble";

/**
 * Parse QR code data to extract device information
 * Expected format: {deviceName: "acorn-pups-1234"}
 */
export function parseQRCode(data: string): QRCodeData | null {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(data);

    if (parsed && typeof parsed.deviceName === "string") {
      return {
        deviceName: parsed.deviceName,
      };
    }

    // If not JSON, check if it's a plain device name
    if (typeof data === "string" && data.includes("acorn-pups")) {
      return {
        deviceName: data.trim(),
      };
    }

    return null;
  } catch (error) {
    // If JSON parsing fails, try to extract device name from string
    if (typeof data === "string" && data.includes("acorn-pups")) {
      return {
        deviceName: data.trim(),
      };
    }

    return null;
  }
}

/**
 * Validate if a device name matches the expected pattern
 */
export function isValidDeviceName(deviceName: string): boolean {
  return deviceName.includes("acorn-pups") && deviceName.length > 0;
}
