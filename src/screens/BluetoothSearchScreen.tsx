import { bleService } from "@/services/bleService";
import { BleDevice, BleError } from "@/types/ble";
import { DeviceSetupModalParamList } from "@/types/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H1,
  Paragraph,
  ScrollView,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";

type BluetoothSearchNavigationProp = NativeStackNavigationProp<
  DeviceSetupModalParamList,
  "BluetoothSearch"
>;

interface BluetoothState {
  isScanning: boolean;
  isConnecting: boolean;
  devices: BleDevice[];
  error: string | null;
  connectingDeviceId: string | null;
}

export const BluetoothSearchScreen: React.FC = () => {
  const navigation = useNavigation<BluetoothSearchNavigationProp>();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<BluetoothState>({
    isScanning: false,
    isConnecting: false,
    devices: [],
    error: null,
    connectingDeviceId: null,
  });
  const scanTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const getErrorMessage = useCallback((error: string): string => {
    switch (error) {
      case BleError.PERMISSION_DENIED:
        return "Bluetooth permissions required. Please enable Bluetooth permissions in Settings.";
      case BleError.BLUETOOTH_DISABLED:
        return "Bluetooth is disabled. Please enable Bluetooth and try again.";
      case BleError.DEVICE_NOT_FOUND:
        return "No devices found. Make sure your device is turned on and in pairing mode.";
      case BleError.CONNECTION_FAILED:
        return "Failed to connect to device. Please try again.";
      case BleError.SCANNING_FAILED:
        return "Failed to scan for devices. Please check your Bluetooth permissions.";
      default:
        return "An error occurred. Please try again.";
    }
  }, []);

  const startScanning = useCallback(async () => {
    console.log("🔍 [BluetoothSearch] Starting manual BLE scan...", {
      timestamp: new Date().toISOString(),
    });

    setState((prev) => ({
      ...prev,
      isScanning: true,
      devices: [],
      error: null,
    }));

    try {
      const foundDevices = new Map<string, BleDevice>();

      await bleService.startScanning(
        "AcornPups", // Filter specifically for AcornPups-{deviceid} devices
        (device: BleDevice) => {
          console.log("📱 [BluetoothSearch] Device discovered:", {
            deviceId: device.id,
            deviceName: device.name,
            rssi: device.rssi,
            isConnectable: device.isConnectable,
          });

          // Add device to map to avoid duplicates
          if (!foundDevices.has(device.id)) {
            foundDevices.set(device.id, device);
            console.log("✅ [BluetoothSearch] Device added to UI list:", {
              deviceId: device.id,
              deviceName: device.name,
              totalDevicesInUI: foundDevices.size,
            });

            setState((prev) => ({
              ...prev,
              devices: Array.from(foundDevices.values()),
            }));
          } else {
            console.log(
              "🔄 [BluetoothSearch] Device already in list, skipping:",
              {
                deviceId: device.id,
                deviceName: device.name,
              }
            );
          }
        },
        (error: string) => {
          console.error("❌ [BluetoothSearch] Scan error:", { error });
          setState((prev) => ({
            ...prev,
            isScanning: false,
            error: getErrorMessage(error),
          }));
        }
      );

      // Set timeout for scanning
      scanTimeoutRef.current = setTimeout(() => {
        console.log("⏰ [BluetoothSearch] Scan timeout reached, stopping...");
        bleService.stopScanning();
        setState((prev) => ({
          ...prev,
          isScanning: false,
        }));
      }, 15000); // 15 seconds timeout
    } catch (error) {
      console.error("💥 [BluetoothSearch] Failed to start scanning:", {
        error,
      });
      setState((prev) => ({
        ...prev,
        isScanning: false,
        error: getErrorMessage(
          error instanceof Error ? error.message : "Scanning failed"
        ),
      }));
    }
  }, [getErrorMessage]);

  // Start scanning when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("👁️ [BluetoothSearch] Screen focused, starting scan...");
      startScanning();

      return () => {
        console.log("👁️ [BluetoothSearch] Screen unfocused, stopping scan...");
        // Stop scanning when screen loses focus
        bleService.stopScanning();
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
      };
    }, [startScanning])
  );

  // Monitor app state to stop scanning when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log("📱 [BluetoothSearch] App state changed:", { nextAppState });
      if (nextAppState !== "active") {
        console.log("📱 [BluetoothSearch] App backgrounded, stopping scan...");
        bleService.stopScanning();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, []);

  const handleBack = () => {
    console.log("⬅️ [BluetoothSearch] Back button pressed, cleaning up...");
    bleService.stopScanning();
    navigation.goBack();
  };

  const handleDeviceSelect = async (device: BleDevice) => {
    console.log("👆 [BluetoothSearch] Device selected for connection:", {
      deviceId: device.id,
      deviceName: device.name,
      rssi: device.rssi,
      timestamp: new Date().toISOString(),
    });

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      connectingDeviceId: device.id,
      error: null,
    }));

    console.log("🛑 [BluetoothSearch] Stopping scan before connection...");
    bleService.stopScanning();

    try {
      console.log("🔗 [BluetoothSearch] Initiating connection...");
      await bleService.connectToDevice(device.id, (isConnected: boolean) => {
        console.log("🔄 [BluetoothSearch] Connection state changed:", {
          deviceId: device.id,
          deviceName: device.name,
          isConnected,
          timestamp: new Date().toISOString(),
        });

        if (isConnected) {
          console.log(
            "🎉 [BluetoothSearch] Connection successful! Navigating to WiFi provisioning..."
          );
          // Success - go to WiFi provisioning screen
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            connectingDeviceId: null,
          }));

          console.log(
            "📡 [BluetoothSearch] Redirecting to WiFi provisioning..."
          );
          setTimeout(() => {
            (navigation as any).navigate("WiFiProvisioning", {
              connectedDevice: device,
            });
          }, 1000);
        } else {
          console.log("🔌 [BluetoothSearch] Connection lost unexpectedly");
          // Connection lost
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            connectingDeviceId: null,
            error: "Connection lost. Please try again.",
          }));
        }
      });
    } catch (error) {
      console.error("💥 [BluetoothSearch] Connection failed:", {
        deviceId: device.id,
        deviceName: device.name,
        error: error instanceof Error ? error.message : "Connection failed",
        timestamp: new Date().toISOString(),
      });

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        connectingDeviceId: null,
        error: getErrorMessage(
          error instanceof Error ? error.message : "Connection failed"
        ),
      }));
    }
  };

  const handleRescan = () => {
    console.log(
      "🔄 [BluetoothSearch] Rescan requested, clearing errors and restarting..."
    );
    setState((prev) => ({
      ...prev,
      error: null,
    }));
    startScanning();
  };

  const getDeviceStatus = (device: BleDevice) => {
    if (state.connectingDeviceId === device.id) {
      return "Connecting...";
    }
    return "Available for pairing";
  };

  const getDeviceStatusColor = (device: BleDevice) => {
    if (state.connectingDeviceId === device.id) {
      return "$orange10";
    }
    return "$color10";
  };

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
    >
      {/* Header with back button */}
      <XStack
        alignItems="center"
        paddingHorizontal="$4"
        paddingVertical="$3"
        space="$3"
      >
        <Button
          size="$3"
          circular
          variant="outlined"
          onPress={handleBack}
          icon={<Ionicons name="chevron-back" size={20} color="$color12" />}
          disabled={state.isConnecting}
        />
        <H1 flex={1} fontSize="$7" color="$color12">
          Add Device
        </H1>
      </XStack>

      {/* Main content */}
      <YStack flex={1} paddingHorizontal="$4" space="$6">
        {/* Search status */}
        <YStack alignItems="center" space="$4" paddingTop="$8">
          {state.isScanning ? (
            <>
              <Spinner size="large" color="$accentColor" />
              <YStack alignItems="center" space="$2">
                <Text fontSize="$5" fontWeight="600" color="$color12">
                  Searching for devices...
                </Text>
                <Paragraph fontSize="$3" color="$color10" textAlign="center">
                  Make sure your device is in pairing mode
                </Paragraph>
              </YStack>
            </>
          ) : state.isConnecting ? (
            <>
              <Spinner size="large" color="$accentColor" />
              <YStack alignItems="center" space="$2">
                <Text fontSize="$5" fontWeight="600" color="$color12">
                  Connecting to device...
                </Text>
                <Paragraph fontSize="$3" color="$color10" textAlign="center">
                  Please wait while we establish connection
                </Paragraph>
              </YStack>
            </>
          ) : (
            <YStack alignItems="center" space="$2">
              <Text fontSize="$5" fontWeight="600" color="$color12">
                Found {state.devices.length} device
                {state.devices.length !== 1 ? "s" : ""}
              </Text>
              <Paragraph fontSize="$3" color="$color10" textAlign="center">
                Tap a device to connect
              </Paragraph>
            </YStack>
          )}
        </YStack>

        {/* Error display */}
        {state.error && (
          <Card
            backgroundColor="$red2"
            borderColor="$red6"
            borderWidth={1}
            borderRadius="$4"
            padding="$4"
          >
            <XStack alignItems="center" space="$3">
              <YStack
                width={40}
                height={40}
                backgroundColor="$red10"
                borderRadius="$2"
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="alert" size={20} color="white" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="600" color="$red11">
                  Error
                </Text>
                <Text fontSize="$3" color="$red10">
                  {state.error}
                </Text>
              </YStack>
            </XStack>
          </Card>
        )}

        {/* Device list */}
        {!state.isScanning &&
          !state.isConnecting &&
          state.devices.length > 0 && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <YStack space="$3">
                {state.devices.map((device) => (
                  <Card
                    key={device.id}
                    backgroundColor="$gray1"
                    borderColor="$gray5"
                    borderWidth={1}
                    borderRadius="$4"
                    padding="$4"
                    pressStyle={{ backgroundColor: "$gray2" }}
                    onPress={() => handleDeviceSelect(device)}
                    disabled={state.isConnecting}
                    opacity={state.isConnecting ? 0.6 : 1}
                  >
                    <XStack alignItems="center" space="$3">
                      <YStack
                        width={40}
                        height={40}
                        backgroundColor="$accentColor"
                        borderRadius="$2"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {state.connectingDeviceId === device.id ? (
                          <Spinner size="small" color="white" />
                        ) : (
                          <Ionicons name="bluetooth" size={20} color="white" />
                        )}
                      </YStack>
                      <YStack flex={1}>
                        <Text fontSize="$4" fontWeight="600" color="$color12">
                          {device.name || "Unknown Device"}
                        </Text>
                        <Text
                          fontSize="$2"
                          color={getDeviceStatusColor(device)}
                        >
                          {getDeviceStatus(device)}
                        </Text>
                        <Text fontSize="$1" color="$color8">
                          Signal: {device.rssi} dBm
                        </Text>
                      </YStack>
                      {state.connectingDeviceId !== device.id && (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="$color10"
                        />
                      )}
                    </XStack>
                  </Card>
                ))}
              </YStack>
            </ScrollView>
          )}

        {/* No devices found */}
        {!state.isScanning &&
          !state.isConnecting &&
          state.devices.length === 0 &&
          !state.error && (
            <YStack alignItems="center" space="$4" paddingTop="$8">
              <YStack
                width={60}
                height={60}
                backgroundColor="$gray3"
                borderRadius="$4"
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="bluetooth-outline" size={30} color="$color10" />
              </YStack>
              <YStack alignItems="center" space="$2">
                <Text fontSize="$5" fontWeight="600" color="$color12">
                  No devices found
                </Text>
                <Paragraph fontSize="$3" color="$color10" textAlign="center">
                  Make sure your device is turned on and in pairing mode
                </Paragraph>
              </YStack>
            </YStack>
          )}

        {/* Action buttons */}
        <YStack
          flex={1}
          justifyContent="flex-end"
          space="$3"
          paddingBottom="$4"
        >
          {!state.isScanning && !state.isConnecting && (
            <Button
              size="$4"
              backgroundColor="$accentColor"
              color="white"
              onPress={handleRescan}
            >
              Search Again
            </Button>
          )}

          <Button
            size="$4"
            variant="outlined"
            onPress={handleBack}
            disabled={state.isConnecting}
          >
            Cancel
          </Button>
        </YStack>
      </YStack>
    </YStack>
  );
};
