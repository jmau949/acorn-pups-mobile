import { AppStackParamList } from "@/types/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useState } from "react";
import { Dimensions, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, XStack, YStack, ZStack } from "tamagui";

type CameraScreenNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  "Camera"
>;

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Scan area dimensions - make it bigger (80% of screen width)
const SCAN_AREA_SIZE = Math.min(screenWidth * 0.8, 300);

export const CameraScreen: React.FC = () => {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleManualAdd = () => {
    console.log("Manual add button pressed");

    // Get the parent navigation to handle the transition properly
    const parentNavigation = navigation.getParent();

    // First dismiss the camera modal
    navigation.goBack();

    // Then navigate to Bluetooth search using parent navigation
    setTimeout(() => {
      if (parentNavigation) {
        parentNavigation.navigate("BluetoothSearch");
      } else {
        navigation.navigate("BluetoothSearch");
      }
    }, 100);
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
      >
        <Text>Loading camera...</Text>
      </YStack>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
        space="$4"
        padding="$4"
      >
        <Text textAlign="center" fontSize="$5" color="$color12">
          Camera permission is required to scan devices
        </Text>
        <Button
          onPress={requestPermission}
          backgroundColor="$accentColor"
          color="white"
        >
          Grant Permission
        </Button>
        <Button onPress={handleClose} variant="outlined">
          Cancel
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="black">
      {/* Camera View - Full Screen */}
      <ZStack flex={1}>
        <CameraView
          style={styles.camera}
          facing={facing}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417"],
          }}
        />

        {/* Overlay Container */}
        <YStack flex={1} pointerEvents="box-none">
          {/* Top overlay */}
          <YStack
            style={[
              styles.overlay,
              {
                height: (screenHeight - SCAN_AREA_SIZE) / 2,
              },
            ]}
          />

          {/* Middle section with scan area */}
          <XStack flex={0} height={SCAN_AREA_SIZE}>
            {/* Left overlay */}
            <YStack
              style={styles.overlay}
              width={(screenWidth - SCAN_AREA_SIZE) / 2}
            />

            {/* Scan area - transparent without border */}
            <YStack
              width={SCAN_AREA_SIZE}
              height={SCAN_AREA_SIZE}
              style={styles.scanArea}
            />

            {/* Right overlay */}
            <YStack
              style={styles.overlay}
              width={(screenWidth - SCAN_AREA_SIZE) / 2}
            />
          </XStack>

          {/* Bottom overlay */}
          <YStack
            style={[
              styles.overlay,
              {
                height: (screenHeight - SCAN_AREA_SIZE) / 2,
              },
            ]}
            flex={1}
          />
        </YStack>

        {/* Back Button - Positioned absolutely */}
        <YStack
          position="absolute"
          top={insets.top + 16}
          left={16}
          zIndex={20}
          pointerEvents="box-none"
        >
          <Button
            size="$4"
            circular
            backgroundColor="rgba(0, 0, 0, 0.5)"
            onPress={handleClose}
            pressStyle={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </Button>
        </YStack>

        {/* Instructions - Positioned absolutely */}
        <YStack
          position="absolute"
          top={insets.top + 80}
          left={0}
          right={0}
          alignItems="center"
          zIndex={20}
          pointerEvents="none"
        >
          <Text color="white" fontSize="$5" fontWeight="600" textAlign="center">
            Scan Device QR Code
          </Text>
          <Text color="$gray10" fontSize="$3" textAlign="center" marginTop="$2">
            Position the QR code within the frame
          </Text>
        </YStack>
      </ZStack>

      {/* Bottom section with manual add button - Outside ZStack */}
      <YStack
        position="absolute"
        bottom={insets.bottom + 40}
        left={0}
        right={0}
        alignItems="center"
        zIndex={30}
        paddingHorizontal="$4"
      >
        <Button
          onPress={handleManualAdd}
          backgroundColor="rgba(255, 255, 255, 0.2)"
          borderColor="rgba(255, 255, 255, 0.4)"
          borderWidth={1}
          color="white"
          size="$4"
          minWidth={180}
          fontSize="$3"
          pressStyle={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
        >
          or add manually
        </Button>
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  scanArea: {
    backgroundColor: "transparent",
  },
});
