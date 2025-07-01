import { BottomTabNavigator } from "@/navigation/BottomTabNavigator";
import { BluetoothSearchScreen } from "@/screens/BluetoothSearchScreen";
import { CameraScreen } from "@/screens/CameraScreen";
import { WiFiProvisioningScreen } from "@/screens/WiFiProvisioningScreen";
import {
  AppStackParamList,
  DeviceSetupModalParamList,
} from "@/types/navigation";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

const Stack = createNativeStackNavigator<AppStackParamList>();
const ModalStack = createNativeStackNavigator<DeviceSetupModalParamList>();

// Modal stack for device setup flow
const DeviceSetupModalStack: React.FC = () => {
  return (
    <ModalStack.Navigator
      initialRouteName="Camera"
      screenOptions={{
        headerShown: false,
      }}
    >
      <ModalStack.Screen name="Camera" component={CameraScreen} />
      <ModalStack.Screen
        name="BluetoothSearch"
        component={BluetoothSearchScreen}
      />
      <ModalStack.Screen
        name="WiFiProvisioning"
        component={WiFiProvisioningScreen}
      />
    </ModalStack.Navigator>
  );
};

export const AppStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen
        name="DeviceSetupModal"
        component={DeviceSetupModalStack}
        options={{
          presentation: "fullScreenModal",
        }}
      />
    </Stack.Navigator>
  );
};
