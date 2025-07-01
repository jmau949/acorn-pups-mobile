import { wifiProvisioningService } from "@/services/wifiProvisioningService";
import { DeviceSetupModalParamList } from "@/types/navigation";
import { WiFiCredentials, WiFiProvisioningStatus } from "@/types/wifi";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  ScrollView,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";

type WiFiProvisioningNavigationProp = NativeStackNavigationProp<
  DeviceSetupModalParamList,
  "WiFiProvisioning"
>;

type WiFiProvisioningRouteProp = RouteProp<
  DeviceSetupModalParamList,
  "WiFiProvisioning"
>;

export const WiFiProvisioningScreen: React.FC = () => {
  // Add error boundary for debugging
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const navigation = useNavigation<WiFiProvisioningNavigationProp>();
  const route = useRoute<WiFiProvisioningRouteProp>();
  const insets = useSafeAreaInsets();

  // Safe parameter access
  const connectedDevice = route.params?.connectedDevice;

  // Automatic WiFi credentials (you can customize these)
  const automaticCredentials: WiFiCredentials = {
    ssid: "x", // Your WiFi network name
    password: "x", // Your WiFi password
  };

  // Use the new status system instead of the old state
  const [status, setStatus] = useState<WiFiProvisioningStatus>({
    phase: "scanning",
    progress: 0,
    message: "🔄 Preparing WiFi Setup...",
    isComplete: false,
    isError: false,
  });

  // Ref to track current status for timeouts
  const statusRef = useRef(status);
  statusRef.current = status;

  // Early error check
  useEffect(() => {
    try {
      if (!connectedDevice) {
        console.error(
          "❌ [WiFiScreen] No connected device provided in route params"
        );
        setHasError(true);
        setErrorDetails("No device information provided");
        return;
      }

      console.log(
        "📡 [WiFiScreen] WiFi provisioning screen opened for device:",
        {
          deviceId: connectedDevice.id,
          deviceName: connectedDevice.name,
          timestamp: new Date().toISOString(),
        }
      );

      // Log screen mount for debugging
      console.log(
        "🎯 [WiFiScreen] WiFi provisioning screen successfully mounted and ready"
      );

      // Start automatic WiFi provisioning after a short delay
      const provisionTimer = setTimeout(() => {
        handleAutomaticProvision();
      }, 1000);

      return () => {
        clearTimeout(provisionTimer);
        // Cleanup service when component unmounts
        wifiProvisioningService.cleanup();
      };
    } catch (error) {
      console.error(
        "💥 [WiFiScreen] Error during screen initialization:",
        error
      );
      setHasError(true);
      setErrorDetails(error instanceof Error ? error.message : "Unknown error");
    }
  }, [connectedDevice]);

  // Handle mounting errors
  if (hasError || !connectedDevice) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        paddingTop={insets.top}
        paddingBottom={insets.bottom}
        justifyContent="center"
        alignItems="center"
        paddingHorizontal="$4"
      >
        <Card
          backgroundColor="$red2"
          borderColor="$red6"
          borderWidth={1}
          borderRadius="$4"
          padding="$6"
          alignItems="center"
          space="$4"
        >
          <Text
            fontSize="$5"
            fontWeight="600"
            color="$red11"
            textAlign="center"
          >
            Screen Loading Error
          </Text>
          <Text fontSize="$3" color="$red10" textAlign="center">
            {errorDetails || "Unable to load WiFi provisioning screen"}
          </Text>
          <Button
            size="$4"
            backgroundColor="$red10"
            color="white"
            onPress={() => {
              console.log("🔙 [WiFiScreen] Error case - closing modal");
              const parentNav = navigation.getParent();
              if (parentNav) {
                parentNav.goBack();
              } else {
                navigation.goBack();
              }
            }}
          >
            Go Back to Devices
          </Button>
        </Card>
      </YStack>
    );
  }

  const handleBack = () => {
    if (status.phase === "sending" || status.phase === "processing") {
      console.log("⚠️ [WiFiScreen] Cannot go back during provisioning");
      return;
    }

    console.log("⬅️ [WiFiScreen] Going back to camera screen");
    navigation.goBack();
  };

  const handleSkip = () => {
    console.log("⏭️ [WiFiScreen] Skipping WiFi provisioning");
    // Close the entire modal and return to main tabs
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.goBack();
    } else {
      navigation.goBack();
    }
  };

  const handleStatusUpdate = (newStatus: WiFiProvisioningStatus) => {
    console.log("📊 [WiFiScreen] Status update received:", newStatus);
    setStatus(newStatus);

    // Auto-close on success
    if (newStatus.isComplete && !newStatus.isError) {
      console.log(
        "✅ [WiFiScreen] Provisioning completed successfully, closing modal in 3 seconds"
      );
      setTimeout(() => {
        handleSkip();
      }, 3000);
    }
  };

  const handleAutomaticProvision = async () => {
    if (!connectedDevice) {
      setStatus({
        phase: "error",
        progress: 0,
        message: "❌ No device connected",
        isComplete: true,
        isError: true,
        error: "No device connected.",
      });
      return;
    }

    try {
      console.log(
        "🚀 [WiFiScreen] Starting automatic WiFi provisioning with credentials:",
        {
          ssid: automaticCredentials.ssid,
          passwordLength: automaticCredentials.password.length,
        }
      );

      // Step 1: Update status to connecting
      setStatus({
        phase: "connecting",
        progress: 10,
        message: "🔧 Setting up WiFi provisioning...",
        isComplete: false,
        isError: false,
      });

      // Initialize WiFi provisioning service
      console.log("📡 [WiFiScreen] Initializing WiFi provisioning service...");
      await wifiProvisioningService.initialize(connectedDevice.id);

      // Step 2: Subscribe to status notifications BEFORE sending credentials
      setStatus({
        phase: "connecting",
        progress: 20,
        message: "📡 Subscribing to device notifications...",
        isComplete: false,
        isError: false,
      });

      console.log("📡 [WiFiScreen] Subscribing to status notifications...");
      await wifiProvisioningService.subscribeToStatus(handleStatusUpdate);

      // Step 3: Send WiFi credentials
      setStatus({
        phase: "sending",
        progress: 25,
        message: "📤 Sending WiFi credentials...",
        isComplete: false,
        isError: false,
      });

      console.log("📤 [WiFiScreen] Sending WiFi credentials...");
      await wifiProvisioningService.sendWiFiCredentials(automaticCredentials);

      console.log(
        "✅ [WiFiScreen] WiFi credentials sent, waiting for device status updates..."
      );

      // Status updates will now be handled by the handleStatusUpdate callback
      // The device will send real-time updates: RECEIVED -> PROCESSING -> STORED -> SUCCESS

      // Fallback: If no status updates received within 5 seconds, show intermediate progress
      setTimeout(() => {
        if (statusRef.current.progress <= 25) {
          setStatus((prev) => ({
            ...prev,
            phase: "processing",
            progress: 50,
            message:
              "🔄 Processing credentials... (no status updates received)",
            warning:
              "Status notifications may not be working, but credentials were sent",
          }));
        }
      }, 5000);

      // Another fallback: If still no updates after 15 seconds, assume success
      setTimeout(() => {
        if (statusRef.current.progress <= 50) {
          setStatus((prev) => ({
            ...prev,
            phase: "complete",
            progress: 100,
            message: "✅ WiFi credentials sent successfully!",
            isComplete: true,
            isError: false,
            warning:
              "No status confirmation received, but device likely connected to WiFi",
          }));
        }
      }, 15000);
    } catch (error) {
      console.error("💥 [WiFiScreen] WiFi provisioning failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      setStatus({
        phase: "error",
        progress: 0,
        message: "❌ WiFi Setup Failed",
        isComplete: true,
        isError: true,
        error: wifiProvisioningService.getErrorMessage(errorMessage),
      });
    }
  };

  const handleRetry = () => {
    console.log("🔄 [WiFiScreen] Retrying WiFi provisioning");
    // Reset status and try again
    setStatus({
      phase: "scanning",
      progress: 0,
      message: "🔄 Preparing WiFi Setup...",
      isComplete: false,
      isError: false,
    });

    setTimeout(() => {
      handleAutomaticProvision();
    }, 500);
  };

  const getStatusIcon = () => {
    if (status.phase === "sending" || status.phase === "processing") {
      return <Spinner size="large" color="$blue10" />;
    }
    if (status.isComplete && !status.isError) {
      return <Ionicons name="checkmark-circle" size={48} color="#22c55e" />;
    }
    if (status.isError) {
      return <Ionicons name="close-circle" size={48} color="#ef4444" />;
    }
    return <Ionicons name="wifi" size={48} color="#3b82f6" />;
  };

  const getStatusColor = () => {
    if (status.isComplete && !status.isError) return "$green";
    if (status.isError) return "$red";
    return "$blue";
  };

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
    >
      {/* Header */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Button
          size="$4"
          variant="outlined"
          onPress={handleBack}
          disabled={status.phase === "sending" || status.phase === "processing"}
          icon={<Ionicons name="chevron-back" size={20} />}
        >
          Back
        </Button>

        <Text fontSize="$6" fontWeight="600">
          WiFi Setup
        </Text>

        <Button
          size="$4"
          variant="outlined"
          onPress={handleSkip}
          disabled={status.phase === "sending" || status.phase === "processing"}
        >
          Skip
        </Button>
      </XStack>

      {/* Content */}
      <ScrollView flex={1} paddingHorizontal="$4" paddingTop="$4">
        <YStack space="$4" alignItems="center">
          {/* Device Info */}
          <Card padding="$4" width="100%" borderRadius="$4">
            <YStack space="$2" alignItems="center">
              <Text fontSize="$4" fontWeight="600" color="$color12">
                Connected Device
              </Text>
              <Text fontSize="$3" color="$color11">
                {connectedDevice?.name || "Unknown Device"}
              </Text>
            </YStack>
          </Card>

          {/* Automatic WiFi Info */}
          <Card padding="$4" width="100%" borderRadius="$4">
            <YStack space="$2" alignItems="center">
              <Text fontSize="$4" fontWeight="600" color="$color12">
                WiFi Network
              </Text>
              <Text fontSize="$3" color="$color11">
                {automaticCredentials.ssid}
              </Text>
              <Text fontSize="$2" color="$color10">
                Credentials will be sent automatically
              </Text>
            </YStack>
          </Card>

          {/* Status Card with Progress */}
          <Card
            padding="$6"
            width="100%"
            borderRadius="$4"
            backgroundColor={`${getStatusColor()}2`}
            borderColor={`${getStatusColor()}6`}
            borderWidth={1}
          >
            <YStack space="$4" alignItems="center">
              {/* Progress Display */}
              <YStack width="100%" space="$2" alignItems="center">
                <Text
                  fontSize="$3"
                  color={`${getStatusColor()}11`}
                  textAlign="center"
                  fontWeight="600"
                >
                  Progress: {status.progress}%
                </Text>
                <XStack
                  width="100%"
                  height={4}
                  backgroundColor={`${getStatusColor()}3`}
                  borderRadius="$2"
                >
                  <YStack
                    width={`${status.progress}%`}
                    height="100%"
                    backgroundColor={`${getStatusColor()}10`}
                    borderRadius="$2"
                  />
                </XStack>
              </YStack>

              {/* Status Icon */}
              <YStack alignItems="center" space="$2">
                {getStatusIcon()}

                <Text
                  fontSize="$5"
                  fontWeight="600"
                  textAlign="center"
                  color={`${getStatusColor()}11`}
                >
                  {status.message}
                </Text>
              </YStack>

              {/* Warning Message */}
              {status.warning && (
                <Text
                  fontSize="$3"
                  textAlign="center"
                  color="$orange11"
                  backgroundColor="$orange3"
                  padding="$3"
                  borderRadius="$2"
                >
                  ⚠️ {status.warning}
                </Text>
              )}

              {/* Error Message */}
              {status.error && (
                <YStack space="$3" alignItems="center">
                  <Text
                    fontSize="$3"
                    textAlign="center"
                    color="$red11"
                    backgroundColor="$red3"
                    padding="$3"
                    borderRadius="$2"
                  >
                    {status.error}
                  </Text>

                  <Button
                    size="$4"
                    backgroundColor="$red10"
                    color="white"
                    onPress={handleRetry}
                  >
                    Try Again
                  </Button>
                </YStack>
              )}

              {/* Success Actions */}
              {status.isComplete && !status.isError && (
                <Text fontSize="$3" textAlign="center" color="$green11">
                  Your device should now be connected to WiFi. Returning to
                  device list in 3 seconds...
                </Text>
              )}
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  );
};
