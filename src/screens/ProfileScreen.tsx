import { useAuth } from "@/providers/AuthProvider";
import React from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  H1,
  Separator,
  Text,
  XStack,
  YStack,
} from "tamagui";

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
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
          {/* Profile Header */}
          <YStack alignItems="center" space="$4">
            <Avatar circular size="$8" backgroundColor="$accentColor">
              <Avatar.Image src="https://via.placeholder.com/120" />
              <Avatar.Fallback backgroundColor="$accentColor">
                <Text color="white" fontSize="$8" fontWeight="600">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </Text>
              </Avatar.Fallback>
            </Avatar>

            <YStack alignItems="center" space="$2">
              <H1 textAlign="center" color="$color12">
                {user?.full_name || "User"}
              </H1>
              <Text color="$color10" textAlign="center" fontSize="$4">
                {user?.email}
              </Text>
            </YStack>
          </YStack>

          {/* Account Information */}
          <Card
            backgroundColor="$gray1"
            borderColor="$gray5"
            borderWidth={1}
            borderRadius="$6"
            padding="$5"
            elevate
          >
            <YStack space="$4">
              <Text fontSize="$6" fontWeight="600" color="$color12">
                Account Information
              </Text>

              <Separator />

              <YStack space="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color10" fontSize="$4">
                    Name
                  </Text>
                  <Text fontWeight="500" color="$color12">
                    {user?.full_name || "Not provided"}
                  </Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color10" fontSize="$4">
                    Email
                  </Text>
                  <Text fontWeight="500" color="$color12">
                    {user?.email || "Not provided"}
                  </Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color10" fontSize="$4">
                    Member since
                  </Text>
                  <Text fontWeight="500" color="$color12">
                    December 2024
                  </Text>
                </XStack>
              </YStack>
            </YStack>
          </Card>

          {/* Settings */}
          <Card
            backgroundColor="$gray1"
            borderColor="$gray5"
            borderWidth={1}
            borderRadius="$6"
            padding="$5"
            elevate
          >
            <YStack space="$4">
              <Text fontSize="$6" fontWeight="600" color="$color12">
                Settings
              </Text>

              <Separator />

              <YStack space="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color12" fontSize="$4">
                    Notifications
                  </Text>
                  <Text color="$color10">Enabled</Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color12" fontSize="$4">
                    Privacy
                  </Text>
                  <Text color="$color10">Standard</Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color12" fontSize="$4">
                    Theme
                  </Text>
                  <Text color="$color10">System</Text>
                </XStack>
              </YStack>
            </YStack>
          </Card>

          {/* Sign Out Button */}
          <YStack flex={1} justifyContent="flex-end">
            <Button
              size="$5"
              theme="red"
              onPress={handleSignOut}
              backgroundColor="$red10"
              color="white"
            >
              Sign Out
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
};
