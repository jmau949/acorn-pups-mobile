import { useAuth } from "@/providers/AuthProvider";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, H1, H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { APP_COLOR, APP_EMOJI, APP_NAME } from "../../template.config";

export const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
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
          paddingVertical: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack space="$6" flex={1}>
          {/* Header */}
          <YStack alignItems="center" space="$4">
            <YStack
              width={80}
              height={80}
              backgroundColor={APP_COLOR}
              borderRadius="$round"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={32} color="white">
                {APP_EMOJI}
              </Text>
            </YStack>

            <YStack alignItems="center" space="$2">
              <H1 textAlign="center">Welcome to {APP_NAME}!</H1>
              <Paragraph color="$color10" textAlign="center">
                You're successfully logged in
              </Paragraph>
            </YStack>
          </YStack>

          {/* User Info */}
          <Card
            backgroundColor="$gray1"
            borderColor="$gray5"
            borderWidth={1}
            borderRadius="$4"
            padding="$4"
          >
            <YStack space="$3">
              <Text fontSize="$5" fontWeight="600" color="$color12">
                Account Information
              </Text>

              <YStack space="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color10">Name:</Text>
                  <Text fontWeight="500">{user?.name || "N/A"}</Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color10">Email:</Text>
                  <Text fontWeight="500">{user?.email || "N/A"}</Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color10">User ID:</Text>
                  <Text fontWeight="500" fontSize="$3">
                    {user?.id || "N/A"}
                  </Text>
                </XStack>
              </YStack>
            </YStack>
          </Card>

          {/* Features */}
          <Card
            backgroundColor="$gray1"
            borderColor="$gray5"
            borderWidth={1}
            borderRadius="$4"
            padding="$4"
          >
            <YStack space="$3">
              <H2 fontSize="$5" fontWeight="600" color="$color12">
                Template Features
              </H2>

              <YStack space="$2">
                <XStack alignItems="center" space="$3">
                  <Text fontSize="$4" color="$green10">
                    ✅
                  </Text>
                  <Paragraph>AWS Cognito Authentication</Paragraph>
                </XStack>

                <XStack alignItems="center" space="$3">
                  <Text fontSize="$4" color="$green10">
                    ✅
                  </Text>
                  <Paragraph>Tamagui UI Components</Paragraph>
                </XStack>

                <XStack alignItems="center" space="$3">
                  <Text fontSize="$4" color="$green10">
                    ✅
                  </Text>
                  <Paragraph>React Navigation</Paragraph>
                </XStack>

                <XStack alignItems="center" space="$3">
                  <Text fontSize="$4" color="$green10">
                    ✅
                  </Text>
                  <Paragraph>Error Handling & Logging</Paragraph>
                </XStack>

                <XStack alignItems="center" space="$3">
                  <Text fontSize="$4" color="$green10">
                    ✅
                  </Text>
                  <Paragraph>TypeScript Support</Paragraph>
                </XStack>

                <XStack alignItems="center" space="$3">
                  <Text fontSize="$4" color="$green10">
                    ✅
                  </Text>
                  <Paragraph>EAS Build Configuration</Paragraph>
                </XStack>
              </YStack>
            </YStack>
          </Card>

          {/* Spacer */}
          <YStack flex={1} />

          {/* Sign Out Button */}
          <Button size="$4" theme="red" onPress={handleSignOut}>
            Sign Out
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
};
