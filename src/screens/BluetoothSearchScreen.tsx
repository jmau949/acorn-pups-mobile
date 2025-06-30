import { AppStackParamList } from "@/types/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H1,
  Paragraph,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";

type BluetoothSearchNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  "BluetoothSearch"
>;

export const BluetoothSearchScreen: React.FC = () => {
  const navigation = useNavigation<BluetoothSearchNavigationProp>();
  const insets = useSafeAreaInsets();
  const [isSearching, setIsSearching] = useState(true);
  const [foundDevices, setFoundDevices] = useState<string[]>([]);

  useEffect(() => {
    // Simulate Bluetooth search
    const searchTimer = setTimeout(() => {
      setFoundDevices([
        "Acorn Device - Living Room",
        "Acorn Sensor - Kitchen",
        "Acorn Hub - Bedroom",
      ]);
      setIsSearching(false);
    }, 3000);

    return () => clearTimeout(searchTimer);
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleDeviceSelect = (deviceName: string) => {
    // Handle device selection - for now just go back to devices screen
    navigation.navigate("MainTabs");
  };

  const handleRescan = () => {
    setIsSearching(true);
    setFoundDevices([]);

    // Restart search
    setTimeout(() => {
      setFoundDevices([
        "Acorn Device - Living Room",
        "Acorn Sensor - Kitchen",
        "Acorn Hub - Bedroom",
      ]);
      setIsSearching(false);
    }, 3000);
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
        />
        <H1 flex={1} fontSize="$7" color="$color12">
          Add Device
        </H1>
      </XStack>

      {/* Main content */}
      <YStack flex={1} paddingHorizontal="$4" space="$6">
        {/* Search status */}
        <YStack alignItems="center" space="$4" paddingTop="$8">
          {isSearching ? (
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
          ) : (
            <YStack alignItems="center" space="$2">
              <Text fontSize="$5" fontWeight="600" color="$color12">
                Found {foundDevices.length} device
                {foundDevices.length !== 1 ? "s" : ""}
              </Text>
              <Paragraph fontSize="$3" color="$color10" textAlign="center">
                Tap a device to connect
              </Paragraph>
            </YStack>
          )}
        </YStack>

        {/* Device list */}
        {!isSearching && foundDevices.length > 0 && (
          <YStack space="$3">
            {foundDevices.map((device, index) => (
              <Card
                key={index}
                backgroundColor="$gray1"
                borderColor="$gray5"
                borderWidth={1}
                borderRadius="$4"
                padding="$4"
                pressStyle={{ backgroundColor: "$gray2" }}
                onPress={() => handleDeviceSelect(device)}
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
                    <Ionicons name="bluetooth" size={20} color="white" />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="600" color="$color12">
                      {device}
                    </Text>
                    <Text fontSize="$2" color="$color10">
                      Available for pairing
                    </Text>
                  </YStack>
                  <Ionicons name="chevron-forward" size={16} color="$color10" />
                </XStack>
              </Card>
            ))}
          </YStack>
        )}

        {/* No devices found */}
        {!isSearching && foundDevices.length === 0 && (
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
          {!isSearching && (
            <Button
              size="$4"
              backgroundColor="$accentColor"
              color="white"
              onPress={handleRescan}
            >
              Search Again
            </Button>
          )}

          <Button size="$4" variant="outlined" onPress={handleBack}>
            Cancel
          </Button>
        </YStack>
      </YStack>
    </YStack>
  );
};
