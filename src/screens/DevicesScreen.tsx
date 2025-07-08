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

  // Use the custom hook to fetch devices - now returns unwrapped data
  const {
    data: devicesData,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    isRefetching,
  } = useUserDevices(user?.user_id || "");

  // Access unwrapped data directly
  const devices = devicesData?.devices || [];
  const totalCount = devicesData?.total || 0;

  // Process devices with new schema
  const sortedDevices = deviceUtils.sortDevicesByLastSeen(devices);
  const statusCounts = deviceUtils.getDeviceStatusCounts(devices);
  const onlineCount = statusCounts.online;

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
   * Get device display name - use device name directly since custom nicknames
   * would be part of the Device interface in the new schema
   */
  const getDeviceDisplayName = (device: Device): string => {
    return device.deviceName;
  };

  /**
   * Check if user can manage device settings
   * Uses device permissions from the new schema
   */
  const canManageDevice = (device: Device): boolean => {
    return device.permissions?.settings || device.ownerId === user?.user_id;
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
                  key={device.deviceId}
                  backgroundColor="$gray1"
                  borderColor="$gray5"
                  borderWidth={1}
                  borderRadius="$6"
                  padding="$5"
                  elevate
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => {
                    // Navigate to device details
                    navigation.navigate("DeviceDetail", {
                      deviceId: device.deviceId,
                      deviceName: device.deviceName,
                    });
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
                        {device.ownerId === user?.user_id && (
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
                        {deviceUtils.getDeviceStatusText(device)}
                      </Text>
                      <Text color="$color10" fontSize="$3">
                        Last seen: {deviceUtils.formatLastSeen(device.lastSeen)}
                      </Text>
                      {/* Optional fields with proper null checking */}
                      {device.firmwareVersion && (
                        <Text color="$color10" fontSize="$3">
                          🔧 v{device.firmwareVersion}
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
