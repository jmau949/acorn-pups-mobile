import { AppStackParamList } from "@/types/navigation";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, H1, Text, XStack, YStack } from "tamagui";

type DevicesScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

export const DevicesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DevicesScreenNavigationProp>();

  const handleAddDevice = () => {
    navigation.navigate("Camera");
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
              Manage and monitor your connected devices
            </Text>
          </YStack>

          {/* Device Cards */}
          <YStack space="$4">
            <Card
              backgroundColor="$gray1"
              borderColor="$gray5"
              borderWidth={1}
              borderRadius="$6"
              padding="$5"
              elevate
            >
              <XStack justifyContent="space-between" alignItems="center">
                <YStack space="$2" flex={1}>
                  <Text fontSize="$6" fontWeight="600" color="$color12">
                    Living Room Hub
                  </Text>
                  <Text color="$green10" fontSize="$4">
                    Online • Connected
                  </Text>
                  <Text color="$color10" fontSize="$3">
                    Last seen: 2 minutes ago
                  </Text>
                </YStack>
                <YStack
                  width={12}
                  height={12}
                  backgroundColor="$green10"
                  borderRadius="$round"
                />
              </XStack>
            </Card>

            <Card
              backgroundColor="$gray1"
              borderColor="$gray5"
              borderWidth={1}
              borderRadius="$6"
              padding="$5"
              elevate
            >
              <XStack justifyContent="space-between" alignItems="center">
                <YStack space="$2" flex={1}>
                  <Text fontSize="$6" fontWeight="600" color="$color12">
                    Bedroom Sensor
                  </Text>
                  <Text color="$orange10" fontSize="$4">
                    Offline • Reconnecting...
                  </Text>
                  <Text color="$color10" fontSize="$3">
                    Last seen: 1 hour ago
                  </Text>
                </YStack>
                <YStack
                  width={12}
                  height={12}
                  backgroundColor="$orange10"
                  borderRadius="$round"
                />
              </XStack>
            </Card>
          </YStack>

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
