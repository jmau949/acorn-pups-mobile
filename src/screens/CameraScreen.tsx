import { bleService } from "@/services/bleService";
import { BleDevice, BleError } from "@/types/ble";
import { AppStackParamList } from "@/types/navigation";
import { parseQRCode } from "@/utils/qrCodeParser";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BarcodeScanningResult,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Dimensions, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  Paragraph,
  Spinner,
  Text,
  XStack,
  YStack,
  ZStack,
} from "tamagui";

type CameraScreenNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  "Camera"
>;

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Scan area dimensions - make it bigger (80% of screen width)
const SCAN_AREA_SIZE = Math.min(screenWidth * 0.8, 300);

interface ScanState {
  isScanning: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  targetDeviceName: string | null;
  foundDevice: BleDevice | null;
}

export const CameraScreen: React.FC = () => {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>({
    isScanning: false,
    isConnecting: false,
    isConnected: false,
    error: null,
    targetDeviceName: null,
    foundDevice: null,
  });
  const [qrScanned, setQrScanned] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Log helpful QR code examples for testing
  useEffect(() => {
    console.log("📋 [Camera] QR Code examples that should work:");
    console.log('📋 [Camera] JSON format: {"deviceName": "AcornPups-B901"}');
    console.log("📋 [Camera] Plain text: AcornPups-B901");
    console.log(
      '📋 [Camera] Note: Device name must be exactly "AcornPups-{deviceid}" format'
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bleService.stopScanning();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Monitor app state to stop scanning when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState !== "active") {
        bleService.stopScanning();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, []);

  const handleClose = () => {
    bleService.stopScanning();
    navigation.goBack();
  };

  const handleManualAdd = () => {
    console.log("Manual add button pressed");
    bleService.stopScanning();

    // Get the parent navigation to handle the transition properly
    const parentNavigation = navigation.getParent();

    // First dismiss the camera modal
    navigation.goBack();

    // Then navigate to Bluetooth search using parent navigation
    setTimeout(() => {
      if (parentNavigation) {
        parentNavigation.navigate("BluetoothSearch");
      } else {
        navigation.navigate("BluetoothSearch");
      }
    }, 100);
  };

  const handleQRCodeScanned = async (result: BarcodeScanningResult) => {
    if (qrScanned || scanState.isScanning) {
      return; // Prevent multiple scans
    }

    console.log("📷 [Camera] QR Code scanned:", {
      data: result.data,
      type: result.type,
      timestamp: new Date().toISOString(),
    });

    setQrScanned(true);
    const qrData = parseQRCode(result.data);

    if (!qrData) {
      console.log("❌ [Camera] Invalid QR code data:", { data: result.data });
      setScanState((prev) => ({
        ...prev,
        error: "Invalid QR code. Please scan a valid device QR code.",
      }));

      // Allow scanning again after error
      setTimeout(() => {
        setQrScanned(false);
        setScanState((prev) => ({ ...prev, error: null }));
      }, 3000);
      return;
    }

    console.log("✅ [Camera] QR code parsed successfully:", {
      deviceName: qrData.deviceName,
      timestamp: new Date().toISOString(),
    });

    // Start BLE scanning for the specific device
    setScanState((prev) => ({
      ...prev,
      isScanning: true,
      targetDeviceName: qrData.deviceName,
      error: null,
    }));

    console.log("🔍 [Camera] Starting BLE scan for target device:", {
      targetDevice: qrData.deviceName,
    });

    try {
      await bleService.startScanning(
        "AcornPups", // Filter for AcornPups-{deviceid} devices
        (device: BleDevice) => {
          console.log("📱 [Camera] AcornPups device found during QR scan:", {
            deviceId: device.id,
            deviceName: device.name,
            rssi: device.rssi,
            qrTargetName: qrData.deviceName,
          });

          // Check if this device matches the exact QR code device name
          if (device.name !== qrData.deviceName) {
            console.log(
              "⏭️ [Camera] Device name does not match QR code exactly, skipping:",
              {
                foundDeviceName: device.name,
                qrTargetName: qrData.deviceName,
              }
            );
            return;
          }

          console.log("🎯 [Camera] Found exact matching device from QR code!", {
            deviceName: device.name,
            qrTargetName: qrData.deviceName,
          });

          setScanState((prev) => ({
            ...prev,
            foundDevice: device,
          }));

          // Auto-connect to the found device
          console.log("🚀 [Camera] Auto-connecting to matching device...");
          handleConnectToDevice(device);
        },
        (error: string) => {
          console.error("❌ [Camera] BLE scan error:", { error });
          setScanState((prev) => ({
            ...prev,
            isScanning: false,
            error: getErrorMessage(error),
          }));
        }
      );

      // Set timeout for scanning
      scanTimeoutRef.current = setTimeout(() => {
        console.log("⏰ [Camera] Scan timeout reached");
        bleService.stopScanning();
        setScanState((prev) => ({
          ...prev,
          isScanning: false,
          error: prev.foundDevice
            ? null
            : "Device not found. Make sure it's turned on and in range.",
        }));
      }, 15000); // 15 seconds timeout
    } catch (error) {
      console.error("💥 [Camera] Failed to start BLE scan:", { error });
      setScanState((prev) => ({
        ...prev,
        isScanning: false,
        error: getErrorMessage(
          error instanceof Error ? error.message : "Unknown error"
        ),
      }));
    }
  };

  const handleConnectToDevice = async (device: BleDevice) => {
    console.log("🔗 [Camera] Starting connection process:", {
      deviceId: device.id,
      deviceName: device.name,
      timestamp: new Date().toISOString(),
    });

    setScanState((prev) => ({
      ...prev,
      isConnecting: true,
      isScanning: false,
    }));

    bleService.stopScanning();

    try {
      await bleService.connectToDevice(device.id, (isConnected: boolean) => {
        console.log("🔄 [Camera] Connection state changed:", {
          deviceId: device.id,
          deviceName: device.name,
          isConnected,
          timestamp: new Date().toISOString(),
        });

        setScanState((prev) => ({
          ...prev,
          isConnected,
          isConnecting: false,
        }));

        if (isConnected) {
          console.log(
            "🎉 [Camera] Device connected successfully! Redirecting to main screen..."
          );
          // Success - go back to devices screen
          setTimeout(() => {
            navigation.navigate("MainTabs");
          }, 2000);
        } else {
          console.log("🔌 [Camera] Device disconnected");
        }
      });
    } catch (error) {
      console.error("💥 [Camera] Connection failed:", {
        deviceId: device.id,
        deviceName: device.name,
        error: error instanceof Error ? error.message : "Connection failed",
        timestamp: new Date().toISOString(),
      });

      setScanState((prev) => ({
        ...prev,
        isConnecting: false,
        error: getErrorMessage(
          error instanceof Error ? error.message : "Connection failed"
        ),
      }));
    }
  };

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case BleError.PERMISSION_DENIED:
        return "Bluetooth permissions required. Please enable Bluetooth permissions in Settings.";
      case BleError.BLUETOOTH_DISABLED:
        return "Bluetooth is disabled. Please enable Bluetooth and try again.";
      case BleError.DEVICE_NOT_FOUND:
        return "Device not found. Make sure it's turned on and in pairing mode.";
      case BleError.CONNECTION_FAILED:
        return "Failed to connect to device. Please try again.";
      case BleError.SCANNING_FAILED:
        return "Failed to scan for devices. Please try again.";
      default:
        return "An error occurred. Please try again.";
    }
  };

  const handleRetry = () => {
    setQrScanned(false);
    setScanState({
      isScanning: false,
      isConnecting: false,
      isConnected: false,
      error: null,
      targetDeviceName: null,
      foundDevice: null,
    });
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
      >
        <Spinner size="large" color="$accentColor" />
        <Text marginTop="$4">Loading camera...</Text>
      </YStack>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
        space="$4"
        padding="$4"
      >
        <Text textAlign="center" fontSize="$5" color="$color12">
          Camera permission is required to scan devices
        </Text>
        <Button
          onPress={requestPermission}
          backgroundColor="$accentColor"
          color="white"
        >
          Grant Permission
        </Button>
        <Button onPress={handleClose} variant="outlined">
          Cancel
        </Button>
      </YStack>
    );
  }

  // Show scanning/connecting overlay
  if (scanState.isScanning || scanState.isConnecting || scanState.isConnected) {
    return (
      <YStack flex={1} backgroundColor="black">
        <ZStack flex={1}>
          {/* Blurred camera background */}
          <CameraView
            style={[styles.camera, { opacity: 0.3 }]}
            facing={facing}
          />

          {/* Overlay */}
          <YStack
            flex={1}
            justifyContent="center"
            alignItems="center"
            backgroundColor="rgba(0, 0, 0, 0.7)"
            paddingHorizontal="$4"
          >
            <Card
              backgroundColor="rgba(255, 255, 255, 0.95)"
              padding="$6"
              borderRadius="$6"
              alignItems="center"
              space="$4"
              minWidth={280}
            >
              {scanState.isScanning && (
                <>
                  <Spinner size="large" color="$accentColor" />
                  <Text
                    fontSize="$5"
                    fontWeight="600"
                    color="$color12"
                    textAlign="center"
                  >
                    Searching for device...
                  </Text>
                  <Paragraph fontSize="$3" color="$color10" textAlign="center">
                    Looking for "{scanState.targetDeviceName}"
                  </Paragraph>
                </>
              )}

              {scanState.isConnecting && (
                <>
                  <Spinner size="large" color="$accentColor" />
                  <Text
                    fontSize="$5"
                    fontWeight="600"
                    color="$color12"
                    textAlign="center"
                  >
                    Connecting to device...
                  </Text>
                  <Paragraph fontSize="$3" color="$color10" textAlign="center">
                    {scanState.foundDevice?.name}
                  </Paragraph>
                </>
              )}

              {scanState.isConnected && (
                <>
                  <YStack
                    width={60}
                    height={60}
                    backgroundColor="$green10"
                    borderRadius="$4"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Ionicons name="checkmark" size={30} color="white" />
                  </YStack>
                  <Text
                    fontSize="$5"
                    fontWeight="600"
                    color="$green10"
                    textAlign="center"
                  >
                    Connected successfully!
                  </Text>
                  <Paragraph fontSize="$3" color="$color10" textAlign="center">
                    Redirecting to devices...
                  </Paragraph>
                </>
              )}
            </Card>
          </YStack>
        </ZStack>

        {/* Back Button */}
        <YStack position="absolute" top={insets.top + 16} left={16} zIndex={20}>
          <Button
            size="$4"
            circular
            backgroundColor="rgba(0, 0, 0, 0.5)"
            onPress={handleClose}
            pressStyle={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </Button>
        </YStack>
      </YStack>
    );
  }

  // Show error state
  if (scanState.error) {
    return (
      <YStack flex={1} backgroundColor="black">
        <ZStack flex={1}>
          {/* Blurred camera background */}
          <CameraView
            style={[styles.camera, { opacity: 0.3 }]}
            facing={facing}
          />

          {/* Error overlay */}
          <YStack
            flex={1}
            justifyContent="center"
            alignItems="center"
            backgroundColor="rgba(0, 0, 0, 0.7)"
            paddingHorizontal="$4"
          >
            <Card
              backgroundColor="rgba(255, 255, 255, 0.95)"
              padding="$6"
              borderRadius="$6"
              alignItems="center"
              space="$4"
              minWidth={280}
            >
              <YStack
                width={60}
                height={60}
                backgroundColor="$red10"
                borderRadius="$4"
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="alert" size={30} color="white" />
              </YStack>

              <Text
                fontSize="$5"
                fontWeight="600"
                color="$red10"
                textAlign="center"
              >
                Connection Error
              </Text>

              <Paragraph fontSize="$3" color="$color10" textAlign="center">
                {scanState.error}
              </Paragraph>

              <XStack space="$3" marginTop="$2">
                <Button
                  onPress={handleRetry}
                  backgroundColor="$accentColor"
                  color="white"
                  flex={1}
                >
                  Try Again
                </Button>
                <Button onPress={handleClose} variant="outlined" flex={1}>
                  Cancel
                </Button>
              </XStack>
            </Card>
          </YStack>
        </ZStack>

        {/* Back Button */}
        <YStack position="absolute" top={insets.top + 16} left={16} zIndex={20}>
          <Button
            size="$4"
            circular
            backgroundColor="rgba(0, 0, 0, 0.5)"
            onPress={handleClose}
            pressStyle={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </Button>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="black">
      {/* Camera View - Full Screen */}
      <ZStack flex={1}>
        <CameraView
          style={styles.camera}
          facing={facing}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417"],
          }}
          onBarcodeScanned={handleQRCodeScanned}
        />

        {/* Overlay Container */}
        <YStack flex={1} pointerEvents="box-none">
          {/* Top overlay */}
          <YStack
            style={[
              styles.overlay,
              {
                height: (screenHeight - SCAN_AREA_SIZE) / 2,
              },
            ]}
          />

          {/* Middle section with scan area */}
          <XStack flex={0} height={SCAN_AREA_SIZE}>
            {/* Left overlay */}
            <YStack
              style={styles.overlay}
              width={(screenWidth - SCAN_AREA_SIZE) / 2}
            />

            {/* Scan area - transparent without border */}
            <YStack
              width={SCAN_AREA_SIZE}
              height={SCAN_AREA_SIZE}
              style={styles.scanArea}
            />

            {/* Right overlay */}
            <YStack
              style={styles.overlay}
              width={(screenWidth - SCAN_AREA_SIZE) / 2}
            />
          </XStack>

          {/* Bottom overlay */}
          <YStack
            style={[
              styles.overlay,
              {
                height: (screenHeight - SCAN_AREA_SIZE) / 2,
              },
            ]}
            flex={1}
          />
        </YStack>

        {/* Back Button - Positioned absolutely */}
        <YStack
          position="absolute"
          top={insets.top + 16}
          left={16}
          zIndex={20}
          pointerEvents="box-none"
        >
          <Button
            size="$4"
            circular
            backgroundColor="rgba(0, 0, 0, 0.5)"
            onPress={handleClose}
            pressStyle={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </Button>
        </YStack>

        {/* Instructions - Positioned absolutely */}
        <YStack
          position="absolute"
          top={insets.top + 80}
          left={0}
          right={0}
          alignItems="center"
          zIndex={20}
          pointerEvents="none"
        >
          <Text color="white" fontSize="$5" fontWeight="600" textAlign="center">
            Scan Device QR Code
          </Text>
          <Text color="$gray10" fontSize="$3" textAlign="center" marginTop="$2">
            Position the QR code within the frame
          </Text>
        </YStack>
      </ZStack>

      {/* Bottom section with manual add button - Outside ZStack */}
      <YStack
        position="absolute"
        bottom={insets.bottom + 40}
        left={0}
        right={0}
        alignItems="center"
        zIndex={30}
        paddingHorizontal="$4"
      >
        <Button
          onPress={handleManualAdd}
          backgroundColor="rgba(255, 255, 255, 0.2)"
          borderColor="rgba(255, 255, 255, 0.4)"
          borderWidth={1}
          color="white"
          size="$4"
          minWidth={180}
          fontSize="$3"
          pressStyle={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
        >
          or add manually
        </Button>
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  scanArea: {
    backgroundColor: "transparent",
  },
});
