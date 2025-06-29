import { DevicesScreen } from "@/screens/DevicesScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { BottomTabParamList } from "@/types/navigation";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "@tamagui/core";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack } from "tamagui";

const Tab = createBottomTabNavigator<BottomTabParamList>();

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
  iconName: keyof typeof Ionicons.glyphMap;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({
  focused,
  color,
  iconName,
}) => {
  return (
    <YStack alignItems="center" justifyContent="center">
      <Ionicons
        name={iconName}
        size={24}
        color={color}
        style={{
          opacity: focused ? 1 : 0.7,
          transform: [{ scale: focused ? 1.1 : 1 }],
        }}
      />
    </YStack>
  );
};

interface TabBarLabelProps {
  focused: boolean;
  color: string;
  children: string;
}

const TabBarLabel: React.FC<TabBarLabelProps> = ({
  focused,
  color,
  children,
}) => {
  return (
    <Text
      fontSize="$2"
      color={color}
      fontWeight={focused ? "600" : "400"}
      opacity={focused ? 1 : 0.7}
    >
      {children}
    </Text>
  );
};

export const BottomTabNavigator: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: theme.shadowColor?.val || "#000",
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          backgroundColor: theme.background?.val || "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: theme.gray5?.val || "#E5E7EB",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: insets.bottom + 8,
          paddingTop: 12,
          height: 72 + insets.bottom,
          paddingHorizontal: 16,
        },
        tabBarActiveTintColor:
          theme.accentColor?.val || theme.blue10?.val || "#3B82F6",
        tabBarInactiveTintColor: theme.color10?.val || "#6B7280",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          borderRadius: 12,
          marginHorizontal: 8,
        },
      }}
    >
      <Tab.Screen
        name="Devices"
        component={DevicesScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon
              focused={focused}
              color={color}
              size={size}
              iconName={focused ? "home" : "home-outline"}
            />
          ),
          tabBarLabel: ({ focused, color }) => (
            <TabBarLabel focused={focused} color={color}>
              Devices
            </TabBarLabel>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon
              focused={focused}
              color={color}
              size={size}
              iconName={focused ? "person" : "person-outline"}
            />
          ),
          tabBarLabel: ({ focused, color }) => (
            <TabBarLabel focused={focused} color={color}>
              Profile
            </TabBarLabel>
          ),
        }}
      />
    </Tab.Navigator>
  );
};
