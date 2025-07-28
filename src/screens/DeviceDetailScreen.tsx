import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertDialog,
  Button,
  Card,
  Circle,
  H1,
  H3,
  H4,
  Input,
  Label,
  Separator,
  Sheet,
  Slider,
  Spinner,
  Switch,
  Text,
  XStack,
  YStack,
} from "tamagui";

import {
  useResetDevice,
  useUpdateDeviceSettings,
} from "@/hooks/useDeviceMutations";
import { deviceUtils, useUserDevices } from "@/hooks/useUserDevices";
import { useAuthContext } from "@/providers/AuthProvider";
import { DeviceSettingsUpdate } from "@/types/devices";
import { AppStackParamList } from "@/types/navigation";

type DeviceDetailScreenNavigationProp =
  NativeStackNavigationProp<AppStackParamList>;
type DeviceDetailScreenRouteProp = RouteProp<AppStackParamList, "DeviceDetail">;

export const DeviceDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DeviceDetailScreenNavigationProp>();
  const route = useRoute<DeviceDetailScreenRouteProp>();
  const { deviceId, deviceName } = route.params;
  const { user } = useAuthContext();

  // State for settings modifications
  const [modifiedSettings, setModifiedSettings] =
    useState<DeviceSettingsUpdate>({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Fetch device data
  const {
    data: devicesData,
    isLoading,
    isError,
    error,
  } = useUserDevices(user?.userId || "");

  // Device mutations
  const updateSettings = useUpdateDeviceSettings(user?.userId || "");
  const resetDevice = useResetDevice(user?.userId || "");

  // Find the specific device
  const device = devicesData?.devices?.find((d) => d.deviceId === deviceId);

  // Check if user is device owner
  const isOwner = device?.ownerId === user?.userId;
  const canManageSettings = device?.permissions?.settings || isOwner;

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleSettingsUpdate = async () => {
    if (!device || Object.keys(modifiedSettings).length === 0) return;

    try {
      await updateSettings.mutateAsync({
        deviceId: device.deviceId,
        settings: modifiedSettings,
      });
      setModifiedSettings({});
      Alert.alert("Success", "Device settings updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update device settings");
    }
  };

  const handleDeviceReset = async () => {
    if (!device) return;

    try {
      await resetDevice.mutateAsync({ deviceId: device.deviceId });
      setShowResetDialog(false);
      Alert.alert("Success", "Device reset initiated successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to reset device");
    }
  };

  if (isLoading) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        justifyContent="center"
        alignItems="center"
        paddingTop={insets.top}
      >
        <Spinner size="large" />
        <Text color="$color10" marginTop="$4">
          Loading device details...
        </Text>
      </YStack>
    );
  }

  if (isError || !device) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        paddingTop={insets.top}
        paddingHorizontal="$6"
        justifyContent="center"
        alignItems="center"
      >
        <Text color="$red10" fontSize="$6" fontWeight="600" textAlign="center">
          Device Not Found
        </Text>
        <Text color="$color10" textAlign="center" marginTop="$2">
          {error?.message || "This device could not be loaded."}
        </Text>
        <Button
          size="$4"
          backgroundColor="$accentColor"
          color="white"
          marginTop="$4"
          onPress={handleBackPress}
        >
          Go Back
        </Button>
      </YStack>
    );
  }

  const hasUnsavedChanges = Object.keys(modifiedSettings).length > 0;

  return (
    <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="$gray5"
      >
        <Button
          size="$3"
          variant="outlined"
          circular
          icon={<Ionicons name="chevron-back" size={20} />}
          onPress={handleBackPress}
        />
        <YStack flex={1} marginLeft="$3">
          <H1 fontSize="$7" color="$color12">
            {device.deviceName}
          </H1>
          <XStack alignItems="center" space="$2">
            <Circle
              size={8}
              backgroundColor={deviceUtils.getDeviceStatusColor(device)}
            />
            <Text color="$color10" fontSize="$3">
              {deviceUtils.getDeviceStatusText(device)}
            </Text>
          </XStack>
        </YStack>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingTop: 20,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack space="$6">
          {/* Device Status Card */}
          <Card backgroundColor="$gray1" borderColor="$gray5" padding="$4">
            <H3 color="$color12" marginBottom="$3">
              Device Information
            </H3>
            <YStack space="$3">
              <XStack justifyContent="space-between">
                <Text color="$color10">Serial Number</Text>
                <Text color="$color12" fontWeight="500">
                  {device.serialNumber}
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$color10">Last Seen</Text>
                <Text color="$color12" fontWeight="500">
                  {deviceUtils.formatLastSeen(device.lastSeen)}
                </Text>
              </XStack>
              {device.firmwareVersion && (
                <XStack justifyContent="space-between">
                  <Text color="$color10">Firmware</Text>
                  <Text color="$color12" fontWeight="500">
                    v{device.firmwareVersion}
                  </Text>
                </XStack>
              )}
              <XStack justifyContent="space-between">
                <Text color="$color10">Owner</Text>
                <Text color="$color12" fontWeight="500">
                  {isOwner ? "You" : "Shared with you"}
                </Text>
              </XStack>
            </YStack>
          </Card>

          {/* Device Settings */}
          {canManageSettings && device.settings && (
            <Card backgroundColor="$gray1" borderColor="$gray5" padding="$4">
              <XStack
                justifyContent="space-between"
                alignItems="center"
                marginBottom="$4"
              >
                <H3 color="$color12">Device Settings</H3>
                <Ionicons name="settings" size={20} color="$color10" />
              </XStack>

              <YStack space="$4">
                {/* Sound Settings */}
                <YStack space="$3">
                  <H4 color="$color11">Sound & Alerts</H4>

                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack flex={1}>
                      <Label color="$color12">Sound Enabled</Label>
                      <Text color="$color10" fontSize="$2">
                        Enable audio alerts when button is pressed
                      </Text>
                    </YStack>
                    <Switch
                      checked={
                        modifiedSettings.soundEnabled ??
                        device.settings.soundEnabled
                      }
                      onCheckedChange={(checked) =>
                        setModifiedSettings((prev) => ({
                          ...prev,
                          soundEnabled: checked,
                        }))
                      }
                    />
                  </XStack>

                  {(modifiedSettings.soundEnabled ??
                    device.settings.soundEnabled) && (
                    <YStack space="$2">
                      <XStack
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Label color="$color12">Volume</Label>
                        <Text color="$color11" fontSize="$3" fontWeight="500">
                          {modifiedSettings.soundVolume ??
                            device.settings.soundVolume}
                        </Text>
                      </XStack>
                      <Slider
                        value={[
                          modifiedSettings.soundVolume ??
                            device.settings.soundVolume,
                        ]}
                        onValueChange={([value]) =>
                          setModifiedSettings((prev) => ({
                            ...prev,
                            soundVolume: Math.round(value),
                          }))
                        }
                        min={1}
                        max={10}
                        step={1}
                      />
                    </YStack>
                  )}
                </YStack>

                <Separator marginVertical="$2" />

                {/* LED Settings */}
                <YStack space="$3">
                  <H4 color="$color11">Visual Indicators</H4>

                  <YStack space="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Label color="$color12">LED Brightness</Label>
                      <Text color="$color11" fontSize="$3" fontWeight="500">
                        {modifiedSettings.ledBrightness ??
                          device.settings.ledBrightness}
                      </Text>
                    </XStack>
                    <Slider
                      value={[
                        modifiedSettings.ledBrightness ??
                          device.settings.ledBrightness,
                      ]}
                      onValueChange={([value]) =>
                        setModifiedSettings((prev) => ({
                          ...prev,
                          ledBrightness: Math.round(value),
                        }))
                      }
                      min={1}
                      max={10}
                      step={1}
                    />
                  </YStack>
                </YStack>

                <Separator marginVertical="$2" />

                {/* Notification Settings */}
                <YStack space="$3">
                  <H4 color="$color11">Notification Control</H4>

                  <YStack space="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Label color="$color12">Cooldown Period</Label>
                      <Text color="$color11" fontSize="$3" fontWeight="500">
                        {modifiedSettings.notificationCooldown ??
                          device.settings.notificationCooldown}
                        s
                      </Text>
                    </XStack>
                    <Text color="$color10" fontSize="$2">
                      Minimum seconds between notifications
                    </Text>
                    <Slider
                      value={[
                        modifiedSettings.notificationCooldown ??
                          device.settings.notificationCooldown,
                      ]}
                      onValueChange={([value]) =>
                        setModifiedSettings((prev) => ({
                          ...prev,
                          notificationCooldown: Math.round(value),
                        }))
                      }
                      min={0}
                      max={300}
                      step={5}
                    />
                  </YStack>
                </YStack>

                <Separator marginVertical="$2" />

                {/* Quiet Hours */}
                <YStack space="$3">
                  <H4 color="$color11">Quiet Hours</H4>

                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack flex={1}>
                      <Label color="$color12">Enable Quiet Hours</Label>
                      <Text color="$color10" fontSize="$2">
                        Disable local sounds during specified times
                      </Text>
                    </YStack>
                    <Switch
                      checked={
                        modifiedSettings.quietHoursEnabled ??
                        device.settings.quietHoursEnabled
                      }
                      onCheckedChange={(checked) =>
                        setModifiedSettings((prev) => ({
                          ...prev,
                          quietHoursEnabled: checked,
                        }))
                      }
                    />
                  </XStack>

                  {(modifiedSettings.quietHoursEnabled ??
                    device.settings.quietHoursEnabled) && (
                    <XStack space="$3">
                      <YStack flex={1}>
                        <Label color="$color12" marginBottom="$2">
                          Start Time
                        </Label>
                        <Input
                          placeholder="22:00"
                          value={
                            modifiedSettings.quietHoursStart ??
                            device.settings.quietHoursStart
                          }
                          onChangeText={(text) =>
                            setModifiedSettings((prev) => ({
                              ...prev,
                              quietHoursStart: text,
                            }))
                          }
                        />
                      </YStack>
                      <YStack flex={1}>
                        <Label color="$color12" marginBottom="$2">
                          End Time
                        </Label>
                        <Input
                          placeholder="07:00"
                          value={
                            modifiedSettings.quietHoursEnd ??
                            device.settings.quietHoursEnd
                          }
                          onChangeText={(text) =>
                            setModifiedSettings((prev) => ({
                              ...prev,
                              quietHoursEnd: text,
                            }))
                          }
                        />
                      </YStack>
                    </XStack>
                  )}
                </YStack>

                {/* Save Settings Button */}
                {hasUnsavedChanges && (
                  <Button
                    size="$4"
                    backgroundColor="$accentColor"
                    color="white"
                    marginTop="$4"
                    onPress={handleSettingsUpdate}
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? (
                      <XStack space="$2" alignItems="center">
                        <Spinner size="small" />
                        <Text color="white">Saving...</Text>
                      </XStack>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                )}
              </YStack>
            </Card>
          )}

          {/* Device Management (Owner Only) */}
          {isOwner && (
            <Card backgroundColor="$gray1" borderColor="$gray5" padding="$4">
              <XStack
                justifyContent="space-between"
                alignItems="center"
                marginBottom="$4"
              >
                <H3 color="$color12">Device Management</H3>
                <Ionicons name="people" size={20} color="$color10" />
              </XStack>

              <YStack space="$3">
                <Button
                  size="$4"
                  variant="outlined"
                  icon={<Ionicons name="people" size={16} />}
                  onPress={() => setShowUserManagement(true)}
                >
                  Manage Users
                </Button>

                <Button
                  size="$4"
                  variant="outlined"
                  backgroundColor="$red2"
                  borderColor="$red7"
                  color="$red11"
                  icon={<Ionicons name="refresh" size={16} />}
                  onPress={() => setShowResetDialog(true)}
                >
                  Reset Device
                </Button>
              </YStack>
            </Card>
          )}
        </YStack>
      </ScrollView>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <AlertDialog.Content
            bordered
            elevate
            key="content"
            animation={[
              "quick",
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            x={0}
            scale={1}
            opacity={1}
            y={0}
          >
            <YStack space="$3">
              <AlertDialog.Title>Reset Device</AlertDialog.Title>
              <AlertDialog.Description>
                This will perform a factory reset of your device. All settings
                will be lost and the device will need to be set up again. This
                action cannot be undone.
              </AlertDialog.Description>

              <XStack space="$3" justifyContent="flex-end">
                <AlertDialog.Cancel asChild>
                  <Button variant="outlined">Cancel</Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button
                    backgroundColor="$red9"
                    color="white"
                    onPress={handleDeviceReset}
                    disabled={resetDevice.isPending}
                  >
                    {resetDevice.isPending ? (
                      <XStack space="$2" alignItems="center">
                        <Spinner size="small" />
                        <Text color="white">Resetting...</Text>
                      </XStack>
                    ) : (
                      "Reset Device"
                    )}
                  </Button>
                </AlertDialog.Action>
              </XStack>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>

      {/* User Management Sheet */}
      <Sheet
        modal
        open={showUserManagement}
        onOpenChange={setShowUserManagement}
        snapPoints={[85]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Sheet.Handle />
        <Sheet.Frame
          padding="$4"
          justifyContent="center"
          alignItems="center"
          space="$5"
        >
          <H3>User Management</H3>
          <Text color="$color10" textAlign="center">
            User invitation and management features will be available soon.
          </Text>
          <Button onPress={() => setShowUserManagement(false)}>Close</Button>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
};
