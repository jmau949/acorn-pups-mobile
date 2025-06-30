import { BottomTabNavigator } from "@/navigation/BottomTabNavigator";
import { CameraScreen } from "@/screens/CameraScreen";
import { AppStackParamList } from "@/types/navigation";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

const Stack = createNativeStackNavigator<AppStackParamList>();

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
        name="Camera"
        component={CameraScreen}
        options={{
          presentation: "fullScreenModal",
        }}
      />
    </Stack.Navigator>
  );
};
