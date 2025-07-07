import { deviceUtils, useUserDevices } from "@/hooks/useUserDevices";
import { useAuthContext } from "@/providers/AuthProvider";
import { Device } from "@/types/devices";
import { AppStackParamList } from "@/types/navigation";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, H1, H3, Spinner, Text, XStack, YStack } from "tamagui";

type DevicesScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

export const DevicesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DevicesScreenNavigationProp>();
  const { user } = useAuthContext();

  // Use the custom hook to fetch devices
  const {
    data: devicesData,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    isRefetching,
  } = useUserDevices(user?.user_id || "");

  const devices = devicesData?.devices || [];
  const deviceUsers = devicesData?.device_users || [];

  // Process devices with new schema
  const sortedDevices = deviceUtils.sortDevicesByLastSeen(devices);
  const statusCounts = deviceUtils.getDeviceStatusCounts(devices);
  const onlineCount = statusCounts.online;
  const totalCount = statusCounts.total;

  const handleAddDevice = () => {
    console.log("Add device button pressed");
    navigation.navigate("DeviceSetupModal");
  };

  const handleRefresh = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Failed to refresh devices:", error);
    }
  };

  /**
   * Get device status text
   */
  const getDeviceStatusText = (device: Device): string => {
    if (!device.is_active) return "Inactive";
    if (device.is_online) return "Online • Connected";
    return "Offline";
  };

  /**
   * Get user's nickname for device or default name
   */
  const getDeviceDisplayName = (device: Device): string => {
    const deviceUser = deviceUsers.find(
      (du) => du.device_id === device.device_id && du.user_id === user?.user_id
    );
    return deviceUser?.device_nickname || device.device_name;
  };

  /**
   * Check if user can manage device settings
   */
  const canManageDevice = (device: Device): boolean => {
    const deviceUser = deviceUsers.find(
      (du) => du.device_id === device.device_id && du.user_id === user?.user_id
    );
    return (
      deviceUser?.settings_permission || device.owner_user_id === user?.user_id
    );
  };

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingTop: 20,
          paddingBottom: 72 + 20, // Tab bar height (72px) + content padding (20px)
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack space="$6" flex={1}>
          {/* Header */}
          <YStack alignItems="center" space="$4">
            <H1 textAlign="center" color="$color12">
              My Devices
            </H1>
            <Text color="$color10" textAlign="center">
              {totalCount > 0
                ? `${onlineCount} of ${totalCount} devices online`
                : "Manage and monitor your connected devices"}
            </Text>

            {/* Refresh Button */}
            {!isLoading && (
              <Button
                size="$3"
                variant="outlined"
                onPress={handleRefresh}
                disabled={isFetching}
                opacity={isFetching ? 0.5 : 1}
              >
                {isRefetching ? (
                  <XStack space="$2" alignItems="center">
                    <Spinner size="small" />
                    <Text>Refreshing...</Text>
                  </XStack>
                ) : (
                  "Refresh"
                )}
              </Button>
            )}
          </YStack>

          {/* Loading State */}
          {isLoading && (
            <YStack space="$4" alignItems="center" paddingVertical="$8">
              <Spinner size="large" />
              <Text color="$color10" textAlign="center">
                Loading your devices...
              </Text>
            </YStack>
          )}

          {/* Error State */}
          {isError && !isLoading && (
            <YStack space="$4" alignItems="center" paddingVertical="$8">
              <Text color="$red10" fontSize="$6" fontWeight="600">
                Failed to Load Devices
              </Text>
              <Text color="$color10" textAlign="center">
                {error?.message || "Something went wrong. Please try again."}
              </Text>
              <Button
                size="$4"
                backgroundColor="$accentColor"
                color="white"
                onPress={handleRefresh}
              >
                Try Again
              </Button>
            </YStack>
          )}

          {/* Empty State */}
          {!isLoading && !isError && sortedDevices.length === 0 && (
            <YStack space="$4" alignItems="center" paddingVertical="$8">
              <H3 color="$color11">No Devices Found</H3>
              <Text color="$color10" textAlign="center">
                You haven't added any devices yet. Get started by adding your
                first device.
              </Text>
            </YStack>
          )}

          {/* Device Cards */}
          {!isLoading && !isError && sortedDevices.length > 0 && (
            <YStack space="$4">
              {sortedDevices.map((device) => (
                <Card
                  key={device.device_id}
                  backgroundColor="$gray1"
                  borderColor="$gray5"
                  borderWidth={1}
                  borderRadius="$6"
                  padding="$5"
                  elevate
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => {
                    // Navigate to device details (implement as needed)
                    console.log("Device pressed:", device.device_id);
                  }}
                >
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack space="$2" flex={1}>
                      <XStack
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Text fontSize="$6" fontWeight="600" color="$color12">
                          {getDeviceDisplayName(device)}
                        </Text>
                        {device.owner_user_id === user?.user_id && (
                          <Text fontSize="$2" color="$color10" fontWeight="500">
                            OWNER
                          </Text>
                        )}
                      </XStack>
                      <Text
                        color={deviceUtils.getDeviceStatusColor(device)}
                        fontSize="$4"
                        fontWeight="500"
                      >
                        {getDeviceStatusText(device)}
                      </Text>
                      <Text color="$color10" fontSize="$3">
                        Last seen:{" "}
                        {deviceUtils.formatLastSeen(device.last_seen)}
                      </Text>
                      <Text color="$color10" fontSize="$3">
                        📶{" "}
                        {deviceUtils.formatSignalStrength(
                          device.signal_strength
                        )}
                      </Text>
                      {device.wifi_ssid && (
                        <Text color="$color10" fontSize="$3">
                          📡 {device.wifi_ssid}
                        </Text>
                      )}
                      {device.firmware_version && (
                        <Text color="$color10" fontSize="$3">
                          🔧 v{device.firmware_version}
                        </Text>
                      )}
                    </YStack>
                    <YStack alignItems="center" space="$2">
                      <YStack
                        width={12}
                        height={12}
                        backgroundColor={deviceUtils.getDeviceStatusColor(
                          device
                        )}
                        borderRadius="$round"
                      />
                      {canManageDevice(device) && (
                        <Text fontSize="$1" color="$color10">
                          ⚙️
                        </Text>
                      )}
                    </YStack>
                  </XStack>
                </Card>
              ))}
            </YStack>
          )}

          {/* Add Device Button */}
          <YStack flex={1} justifyContent="flex-end">
            <Button
              size="$5"
              backgroundColor="$accentColor"
              color="white"
              onPress={handleAddDevice}
            >
              Add New Device
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
};
