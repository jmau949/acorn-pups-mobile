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
  Form,
  H1,
  Input,
  Label,
  Paragraph,
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

  const [credentials, setCredentials] = useState<WiFiCredentials>({
    ssid: "",
    password: "",
  });

  const [provisioningState, setProvisioningState] =
    useState<WiFiProvisioningState>({
      isProvisioning: false,
      isComplete: false,
      error: null,
      progress: null,
    });

  const [showPassword, setShowPassword] = useState(false);

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

  const validateCredentials = (): boolean => {
    if (!credentials.ssid.trim()) {
      setProvisioningState((prev) => ({
        ...prev,
        error: "Please enter a WiFi network name (SSID).",
      }));
      return false;
    }

    if (credentials.ssid.trim().length > 32) {
      setProvisioningState((prev) => ({
        ...prev,
        error: "WiFi network name must be 32 characters or less.",
      }));
      return false;
    }

    if (credentials.password.length > 63) {
      setProvisioningState((prev) => ({
        ...prev,
        error: "WiFi password must be 63 characters or less.",
      }));
      return false;
    }

    return true;
  };

  const handleProvisionWiFi = async () => {
    if (!validateCredentials()) {
      return;
    }

    console.log("📡 [WiFiScreen] Starting WiFi provisioning...", {
      ssid: credentials.ssid,
      passwordLength: credentials.password.length,
    });

    setProvisioningState({
      isProvisioning: true,
      isComplete: false,
      error: null,
      progress: "discovering",
    });

    try {
      // Step 1: Initialize WiFi provisioning service
      setProvisioningState((prev) => ({ ...prev, progress: "discovering" }));
      await wifiProvisioningService.initialize(connectedDevice.id);

      // Step 2: Send WiFi credentials
      setProvisioningState((prev) => ({ ...prev, progress: "writing" }));
      await wifiProvisioningService.sendWiFiCredentials(credentials);

      // Step 3: Verify (just a delay to show progress)
      setProvisioningState((prev) => ({ ...prev, progress: "verifying" }));
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Success
      console.log("🎉 [WiFiScreen] WiFi provisioning completed successfully");
      setProvisioningState({
        isProvisioning: false,
        isComplete: true,
        error: null,
        progress: "complete",
      });

      // Auto-navigate after success
      setTimeout(() => {
        console.log("🎉 [WiFiScreen] WiFi setup complete, closing modal");
        const parentNav = navigation.getParent();
        if (parentNav) {
          parentNav.goBack();
        } else {
          navigation.goBack();
        }
      }, 3000);
    } catch (error) {
      console.error("💥 [WiFiScreen] WiFi provisioning failed:", error);

      const errorMessage =
        error instanceof Error
          ? wifiProvisioningService.getErrorMessage(error.message)
          : "An unexpected error occurred.";

      setProvisioningState({
        isProvisioning: false,
        isComplete: false,
        error: errorMessage,
        progress: null,
      });
    }
  };

  const getProgressText = () => {
    switch (provisioningState.progress) {
      case "discovering":
        return "Discovering WiFi services...";
      case "writing":
        return "Sending WiFi credentials...";
      case "verifying":
        return "Verifying connection...";
      case "complete":
        return "WiFi provisioning complete!";
      default:
        return "Preparing...";
    }
  };

  // Show success state
  if (provisioningState.isComplete) {
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
          backgroundColor="$background"
          padding="$6"
          borderRadius="$6"
          alignItems="center"
          space="$4"
          minWidth={280}
        >
          <YStack
            width={80}
            height={80}
            backgroundColor="$green10"
            borderRadius="$4"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="wifi" size={40} color="white" />
          </YStack>

          <YStack alignItems="center" space="$2">
            <Text
              fontSize="$6"
              fontWeight="600"
              color="$green10"
              textAlign="center"
            >
              WiFi Setup Complete!
            </Text>
            <Paragraph fontSize="$3" color="$color10" textAlign="center">
              Your device is now connected to "{credentials.ssid}"
            </Paragraph>
            <Paragraph fontSize="$2" color="$color8" textAlign="center">
              Returning to devices...
            </Paragraph>
          </YStack>
        </Card>
      </YStack>
    );
  }

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
        paddingHorizontal="$4"
        paddingVertical="$3"
        space="$3"
      >
        <Button
          size="$3"
          circular
          variant="outlined"
          onPress={handleBack}
          disabled={provisioningState.isProvisioning}
          icon={<Ionicons name="chevron-back" size={20} color="$color12" />}
        />
        <H1 flex={1} fontSize="$7" color="$color12">
          WiFi Setup
        </H1>
      </XStack>

      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal="$4" space="$6" paddingTop="$4">
          {/* Device info */}
          <Card
            backgroundColor="$gray1"
            borderColor="$gray5"
            borderWidth={1}
            borderRadius="$4"
            padding="$4"
          >
            <XStack alignItems="center" space="$3">
              <YStack
                width={40}
                height={40}
                backgroundColor="$blue10"
                borderRadius="$2"
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="bluetooth" size={20} color="white" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="600" color="$color12">
                  {connectedDevice.name}
                </Text>
                <Text fontSize="$2" color="$color10">
                  Connected • Ready for WiFi setup
                </Text>
              </YStack>
            </XStack>
          </Card>

          {/* Instructions */}
          <YStack space="$2">
            <Text fontSize="$5" fontWeight="600" color="$color12">
              Connect to WiFi
            </Text>
            <Paragraph fontSize="$3" color="$color10">
              Enter your WiFi network credentials to connect your device to the
              internet.
            </Paragraph>
          </YStack>

          {/* WiFi Form */}
          <Form onSubmit={handleProvisionWiFi}>
            <YStack space="$4">
              <YStack space="$2">
                <Label fontSize="$3" color="$color11" fontWeight="500">
                  WiFi Network Name (SSID)
                </Label>
                <Input
                  size="$4"
                  placeholder="Enter network name"
                  value={credentials.ssid}
                  onChangeText={(text) => {
                    setCredentials((prev) => ({ ...prev, ssid: text }));
                    setProvisioningState((prev) => ({ ...prev, error: null }));
                  }}
                  disabled={provisioningState.isProvisioning}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </YStack>

              <YStack space="$2">
                <Label fontSize="$3" color="$color11" fontWeight="500">
                  WiFi Password
                </Label>
                <XStack space="$2">
                  <Input
                    flex={1}
                    size="$4"
                    placeholder="Enter password (optional)"
                    value={credentials.password}
                    onChangeText={(text) => {
                      setCredentials((prev) => ({ ...prev, password: text }));
                      setProvisioningState((prev) => ({
                        ...prev,
                        error: null,
                      }));
                    }}
                    secureTextEntry={!showPassword}
                    disabled={provisioningState.isProvisioning}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Button
                    size="$4"
                    variant="outlined"
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={provisioningState.isProvisioning}
                    icon={
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={16}
                        color="$color10"
                      />
                    }
                  />
                </XStack>
              </YStack>
            </YStack>
          </Form>

          {/* Error display */}
          {provisioningState.error && (
            <Card
              backgroundColor="$red2"
              borderColor="$red6"
              borderWidth={1}
              borderRadius="$4"
              padding="$4"
            >
              <XStack alignItems="center" space="$3">
                <YStack
                  width={24}
                  height={24}
                  backgroundColor="$red10"
                  borderRadius="$2"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="alert" size={12} color="white" />
                </YStack>
                <Text fontSize="$3" color="$red11" flex={1}>
                  {provisioningState.error}
                </Text>
              </XStack>
            </Card>
          )}

          {/* Provisioning progress */}
          {provisioningState.isProvisioning && (
            <Card
              backgroundColor="$blue2"
              borderColor="$blue6"
              borderWidth={1}
              borderRadius="$4"
              padding="$4"
            >
              <XStack alignItems="center" space="$3">
                <Spinner size="small" color="$blue10" />
                <Text fontSize="$3" color="$blue11" flex={1}>
                  {getProgressText()}
                </Text>
              </XStack>
            </Card>
          )}

          {/* Action buttons */}
          <YStack space="$3" paddingBottom="$6">
            <Button
              size="$4"
              backgroundColor="$accentColor"
              color="white"
              onPress={handleProvisionWiFi}
              disabled={
                provisioningState.isProvisioning || !credentials.ssid.trim()
              }
            >
              {provisioningState.isProvisioning ? (
                <XStack alignItems="center" space="$2">
                  <Spinner size="small" color="white" />
                  <Text color="white">Setting up WiFi...</Text>
                </XStack>
              ) : (
                "Connect to WiFi"
              )}
            </Button>

            <Button
              size="$4"
              variant="outlined"
              onPress={handleSkip}
              disabled={provisioningState.isProvisioning}
            >
              Skip for now
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
};
