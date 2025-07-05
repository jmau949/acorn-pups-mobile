import { wifiProvisioningService } from "@/services/wifiProvisioningService";
import { DeviceSetupModalParamList } from "@/types/navigation";
import { WiFiCredentials, WiFiProvisioningState } from "@/types/wifi";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
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

  const [provisioningState, setProvisioningState] =
    useState<WiFiProvisioningState>({
      isProvisioning: false,
      isComplete: false,
      error: null,
      progress: null,
    });

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

      return () => clearTimeout(provisionTimer);
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
    if (provisioningState.isProvisioning) {
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

  const handleAutomaticProvision = async () => {
    if (!connectedDevice) {
      setProvisioningState((prev) => ({
        ...prev,
        error: "No device connected.",
      }));
      return;
    }

    setProvisioningState((prev) => ({
      ...prev,
      isProvisioning: true,
      error: null,
      progress: "Initializing WiFi provisioning...",
    }));

    try {
      console.log(
        "🚀 [WiFiScreen] Starting automatic WiFi provisioning with credentials:",
        {
          ssid: automaticCredentials.ssid,
          passwordLength: automaticCredentials.password.length,
        }
      );

      // Initialize WiFi provisioning service
      setProvisioningState((prev) => ({
        ...prev,
        progress: "Connecting to device services...",
      }));

      await wifiProvisioningService.initialize(connectedDevice.id);

      // Send WiFi credentials
      setProvisioningState((prev) => ({
        ...prev,
        progress: "Sending WiFi credentials...",
      }));

      await wifiProvisioningService.sendWiFiCredentials(automaticCredentials);

      // Success!
      setProvisioningState((prev) => ({
        ...prev,
        isProvisioning: false,
        isComplete: true,
        progress: "WiFi credentials sent successfully!",
      }));

      console.log(
        "✅ [WiFiScreen] Automatic WiFi provisioning completed successfully"
      );

      // Auto-close after success
      setTimeout(() => {
        handleSkip();
      }, 2000);
    } catch (error) {
      console.error("💥 [WiFiScreen] WiFi provisioning failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      setProvisioningState((prev) => ({
        ...prev,
        isProvisioning: false,
        error: wifiProvisioningService.getErrorMessage(errorMessage),
      }));
    }
  };

  const handleRetry = () => {
    console.log("🔄 [WiFiScreen] Retrying WiFi provisioning");
    handleAutomaticProvision();
  };

  const getProgressText = () => {
    if (provisioningState.isComplete) {
      return "✅ WiFi Setup Complete!";
    }
    if (provisioningState.error) {
      return "❌ WiFi Setup Failed";
    }
    if (provisioningState.isProvisioning) {
      return "📡 Setting up WiFi...";
    }
    return "🔄 Preparing WiFi Setup...";
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
          disabled={provisioningState.isProvisioning}
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
          disabled={provisioningState.isProvisioning}
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

          {/* Status Card */}
          <Card
            padding="$6"
            width="100%"
            borderRadius="$4"
            backgroundColor={
              provisioningState.isComplete
                ? "$green2"
                : provisioningState.error
                ? "$red2"
                : "$blue2"
            }
            borderColor={
              provisioningState.isComplete
                ? "$green6"
                : provisioningState.error
                ? "$red6"
                : "$blue6"
            }
            borderWidth={1}
          >
            <YStack space="$4" alignItems="center">
              {/* Status Icon */}
              <YStack alignItems="center" space="$2">
                {provisioningState.isProvisioning ? (
                  <Spinner size="large" color="$blue10" />
                ) : provisioningState.isComplete ? (
                  <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                ) : provisioningState.error ? (
                  <Ionicons name="close-circle" size={48} color="#ef4444" />
                ) : (
                  <Ionicons name="wifi" size={48} color="#3b82f6" />
                )}

                <Text
                  fontSize="$5"
                  fontWeight="600"
                  textAlign="center"
                  color={
                    provisioningState.isComplete
                      ? "$green11"
                      : provisioningState.error
                      ? "$red11"
                      : "$blue11"
                  }
                >
                  {getProgressText()}
                </Text>
              </YStack>

              {/* Progress Text */}
              {provisioningState.progress && (
                <Text
                  fontSize="$3"
                  textAlign="center"
                  color="$color11"
                  opacity={0.8}
                >
                  {provisioningState.progress}
                </Text>
              )}

              {/* Error Message */}
              {provisioningState.error && (
                <YStack space="$3" alignItems="center">
                  <Text
                    fontSize="$3"
                    textAlign="center"
                    color="$red11"
                    backgroundColor="$red3"
                    padding="$3"
                    borderRadius="$2"
                  >
                    {provisioningState.error}
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
              {provisioningState.isComplete && (
                <Text fontSize="$3" textAlign="center" color="$green11">
                  Your device should now be connected to WiFi. Returning to
                  device list...
                </Text>
              )}
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  );
};
