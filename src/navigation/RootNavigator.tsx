import { useAuth } from "@/providers/AuthProvider";
import { NavigationContainer } from "@react-navigation/native";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";
import React, { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { AppStack } from "./AppStack";
import { AuthStack } from "./AuthStack";

// Memoize the stacks to prevent unnecessary re-renders
const MemoizedAuthStack = React.memo(AuthStack);
const MemoizedAppStack = React.memo(AppStack);

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Auth state monitoring
  useEffect(() => {
    // Keep this effect for potential future debugging needs
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
        space="$4"
      >
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text fontSize="$4" color="$color10" fontWeight="500">
          Loading...
        </Text>
      </YStack>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MemoizedAppStack /> : <MemoizedAuthStack />}
    </NavigationContainer>
  );
};
