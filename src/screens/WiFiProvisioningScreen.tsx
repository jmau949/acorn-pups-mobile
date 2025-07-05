import { wifiProvisioningService } from "@/services/wifiProvisioningService";
import { DeviceSetupModalParamList } from "@/types/navigation";
import { WiFiProvisioningStatus } from "@/types/wifi";
import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H4,
  Input,
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

interface WiFiFormData {
  ssid: string;
  password: string;
}

interface WiFiFormErrors {
  ssid?: string;
  password?: string;
  general?: string;
}

interface WiFiFormState {
  isSubmitting: boolean;
  errors: WiFiFormErrors;
}

export const WiFiProvisioningScreen: React.FC = () => {
  // Add error boundary for debugging
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const navigation = useNavigation<WiFiProvisioningNavigationProp>();
  const route = useRoute<WiFiProvisioningRouteProp>();
  const insets = useSafeAreaInsets();

  // Safe parameter access
  const connectedDevice = route.params?.connectedDevice;

  // WiFi form state
  const [wifiFormData, setWifiFormData] = useState<WiFiFormData>({
    ssid: "",
    password: "",
  });

  const [wifiFormState, setWifiFormState] = useState<WiFiFormState>({
    isSubmitting: false,
    errors: {},
  });

  const [isDetectingWiFi, setIsDetectingWiFi] = useState(false);

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

  // WiFi form handlers
  const updateWifiFormData = (field: keyof WiFiFormData, value: string) => {
    setWifiFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (wifiFormState.errors[field]) {
      setWifiFormState((prev) => ({
        ...prev,
        errors: { ...prev.errors, [field]: undefined },
      }));
    }
  };

  const validateWifiForm = (): boolean => {
    const newErrors: WiFiFormErrors = {};

    if (!wifiFormData.ssid.trim()) {
      newErrors.ssid = "WiFi network name (SSID) is required";
    }

    if (!wifiFormData.password.trim()) {
      newErrors.password = "WiFi password is required";
    } else if (wifiFormData.password.length < 8) {
      newErrors.password = "WiFi password must be at least 8 characters";
    }

    setWifiFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Detect current WiFi network
  const detectCurrentWiFi = async () => {
    try {
      setIsDetectingWiFi(true);
      console.log(
        "🔍 [WiFiScreen] Attempting to detect current WiFi network..."
      );

      // Configure NetInfo to fetch WiFi SSID
      NetInfo.configure({
        shouldFetchWiFiSSID: true,
      });

      const netInfo = await NetInfo.fetch("wifi");

      if (netInfo.type === "wifi" && netInfo.details?.ssid) {
        console.log(
          "✅ [WiFiScreen] Detected WiFi SSID:",
          netInfo.details.ssid
        );
        setWifiFormData((prev) => ({
          ...prev,
          ssid: netInfo.details.ssid || "",
        }));
      } else {
        console.log("⚠️ [WiFiScreen] Could not detect current WiFi network");
      }
    } catch (error) {
      console.log("⚠️ [WiFiScreen] Error detecting WiFi:", error);
    } finally {
      setIsDetectingWiFi(false);
    }
  };

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

      // Try to detect current WiFi network
      detectCurrentWiFi();

      return () => {
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

  const handleWiFiProvisioning = async () => {
    if (!validateWifiForm()) return;

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

    setWifiFormState({ isSubmitting: true, errors: {} });

    try {
      console.log(
        "🚀 [WiFiScreen] Starting WiFi provisioning with user credentials:",
        {
          ssid: wifiFormData.ssid,
          passwordLength: wifiFormData.password.length,
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
      await wifiProvisioningService.sendWiFiCredentials(wifiFormData);

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
    } finally {
      setWifiFormState({ isSubmitting: false, errors: {} });
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
      handleWiFiProvisioning();
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

  // Show WiFi setup form if not yet provisioning
  const showForm = status.phase === "scanning" || status.isError;

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

          {/* WiFi Credentials Form */}
          {showForm && (
            <Card padding="$4" width="100%" borderRadius="$4">
              <YStack space="$4">
                <YStack space="$2" alignItems="center">
                  <H4 color="$color12">WiFi Network Credentials</H4>
                  <Text fontSize="$3" color="$color11" textAlign="center">
                    Enter your WiFi network credentials to provision your device
                  </Text>
                </YStack>

                {/* Auto-detect WiFi button */}
                <Button
                  size="$3"
                  variant="outlined"
                  onPress={detectCurrentWiFi}
                  disabled={isDetectingWiFi}
                  icon={
                    isDetectingWiFi ? (
                      <Spinner size="small" />
                    ) : (
                      <Ionicons name="search" size={16} />
                    )
                  }
                >
                  {isDetectingWiFi ? "Detecting..." : "Detect Current WiFi"}
                </Button>

                {/* WiFi SSID Field */}
                <YStack space="$2">
                  <Text fontSize="$3" color="$color11" fontWeight="500">
                    Network Name (SSID) *
                  </Text>
                  <Input
                    placeholder="Enter WiFi network name"
                    value={wifiFormData.ssid}
                    onChangeText={(text) => updateWifiFormData("ssid", text)}
                    borderColor={
                      wifiFormState.errors.ssid ? "$red7" : "$borderColor"
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    disabled={wifiFormState.isSubmitting}
                  />
                  {wifiFormState.errors.ssid && (
                    <Text color="$red11" fontSize="$2">
                      {wifiFormState.errors.ssid}
                    </Text>
                  )}
                </YStack>

                {/* WiFi Password Field */}
                <YStack space="$2">
                  <Text fontSize="$3" color="$color11" fontWeight="500">
                    Password *
                  </Text>
                  <Input
                    placeholder="Enter WiFi password"
                    value={wifiFormData.password}
                    onChangeText={(text) =>
                      updateWifiFormData("password", text)
                    }
                    borderColor={
                      wifiFormState.errors.password ? "$red7" : "$borderColor"
                    }
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleWiFiProvisioning}
                    disabled={wifiFormState.isSubmitting}
                  />
                  {wifiFormState.errors.password && (
                    <Text color="$red11" fontSize="$2">
                      {wifiFormState.errors.password}
                    </Text>
                  )}
                </YStack>

                {/* General Error */}
                {wifiFormState.errors.general && (
                  <Text color="$red11" fontSize="$3" textAlign="center">
                    {wifiFormState.errors.general}
                  </Text>
                )}

                {/* Submit Button */}
                <Button
                  size="$4"
                  backgroundColor="$blue10"
                  color="white"
                  onPress={handleWiFiProvisioning}
                  disabled={wifiFormState.isSubmitting}
                  opacity={wifiFormState.isSubmitting ? 0.6 : 1}
                >
                  {wifiFormState.isSubmitting
                    ? "Connecting..."
                    : "Connect to WiFi"}
                </Button>
              </YStack>
            </Card>
          )}

          {/* Status Card with Progress */}
          {!showForm && (
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

                {/* Network Info */}
                {wifiFormData.ssid && (
                  <YStack space="$2" alignItems="center">
                    <Text fontSize="$3" color="$color11" fontWeight="500">
                      Network: {wifiFormData.ssid}
                    </Text>
                  </YStack>
                )}

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
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
};
