import { QRCodeData } from "../types/ble";

/**
 * Parse QR code data to extract device information
 * Expected format: {deviceName: "AcornPups-B901"} or plain text "AcornPups-B901"
 */
export function parseQRCode(data: string): QRCodeData | null {
  console.log("🔍 [QR] Parsing QR code data:", { data });

  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(data);
    console.log("📋 [QR] JSON parsed successfully:", parsed);

    if (parsed && typeof parsed.deviceName === "string") {
      const deviceName = parsed.deviceName.trim();
      console.log("📝 [QR] Extracted device name:", { deviceName });

      if (isValidDeviceName(deviceName)) {
        console.log("✅ [QR] Valid AcornPups device name found:", {
          deviceName,
        });
        return { deviceName };
      } else {
        console.log("❌ [QR] Invalid device name (not AcornPups format):", {
          deviceName,
        });
      }
    }

    // If not JSON, check if it's a plain device name
    if (typeof data === "string" && isValidDeviceName(data)) {
      const deviceName = data.trim();
      console.log("✅ [QR] Valid plain text AcornPups device name found:", {
        deviceName,
      });
      return { deviceName };
    }

    console.log("❌ [QR] No valid AcornPups device name found in JSON");
    return null;
  } catch (error) {
    console.log("📋 [QR] JSON parsing failed, trying plain text:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // If JSON parsing fails, try to extract device name from string
    if (typeof data === "string" && isValidDeviceName(data)) {
      const deviceName = data.trim();
      console.log(
        "✅ [QR] Valid plain text AcornPups device name found after JSON failure:",
        { deviceName }
      );
      return { deviceName };
    }

    console.log("❌ [QR] No valid AcornPups device name found in plain text");
    return null;
  }
}

/**
 * Validate if a device name matches the AcornPups-{deviceid} pattern
 */
export function isValidDeviceName(deviceName: string): boolean {
  if (!deviceName || deviceName.length === 0) {
    console.log("❌ [QR] Empty device name");
    return false;
  }

  console.log("🔍 [QR] Validating device name for AcornPups pattern:", {
    deviceName,
  });

  // Check if it starts with "AcornPups-" followed by a device ID
  const isValid = deviceName.startsWith("AcornPups-") && deviceName.length > 10;

  console.log(
    isValid
      ? "✅ [QR] Device name matches AcornPups-{deviceid} pattern"
      : "❌ [QR] Device name does not match AcornPups-{deviceid} pattern"
  );

  return isValid;
}
