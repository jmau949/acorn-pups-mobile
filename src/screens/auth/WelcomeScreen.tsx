import { useAuth } from "@/providers/AuthProvider";
import type { AuthStackParamList } from "@/types/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, H1, Paragraph, Text, XStack, YStack } from "tamagui";
import { APP_COLOR, APP_EMOJI, APP_NAME } from "../../../template.config";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { clearAuth, isAuthenticated, user } = useAuth();

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
      paddingLeft={insets.left + 24}
      paddingRight={insets.right + 24}
      justifyContent="space-between"
      $sm={{
        paddingLeft: insets.left + 16,
        paddingRight: insets.right + 16,
      }}
    >
      {/* Header Section */}
      <YStack flex={1} justifyContent="center" alignItems="center" space="$6">
        {/* App Logo */}
        <YStack alignItems="center" space="$4">
          <YStack
            width={120}
            height={120}
            backgroundColor={APP_COLOR}
            borderRadius="$6"
            alignItems="center"
            justifyContent="center"
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.15}
            shadowRadius={8}
            elevation={4}
            $sm={{ width: 100, height: 100 }}
          >
            <Text fontSize={48} color="white" $sm={{ fontSize: 40 }}>
              {APP_EMOJI}
            </Text>
          </YStack>

          <YStack alignItems="center" space="$2">
            <H1 textAlign="center" $sm={{ fontSize: "$7" }}>
              {APP_NAME}
            </H1>
            <Paragraph
              color="$color10"
              textAlign="center"
              maxWidth={300}
              $sm={{ maxWidth: 280 }}
            >
              Welcome to your companion app for growth and development
            </Paragraph>
          </YStack>
        </YStack>

        {/* Features List */}
        <Card
          backgroundColor="$gray1"
          borderColor="$gray5"
          padding="$4"
          borderRadius="$4"
          width="100%"
          maxWidth={320}
          $sm={{ maxWidth: 300 }}
        >
          <YStack space="$3">
            <XStack alignItems="center" space="$3">
              <Text fontSize="$5" color="$green10">
                ✓
              </Text>
              <Paragraph>Secure authentication</Paragraph>
            </XStack>
            <XStack alignItems="center" space="$3">
              <Text fontSize="$5" color="$green10">
                ✓
              </Text>
              <Paragraph>Biometric login support</Paragraph>
            </XStack>
            <XStack alignItems="center" space="$3">
              <Text fontSize="$5" color="$green10">
                ✓
              </Text>
              <Paragraph>Clean, intuitive design</Paragraph>
            </XStack>
          </YStack>
        </Card>
      </YStack>

      {/* Action Buttons */}
      <YStack space="$3" width="100%">
        <Button
          size="$5"
          theme="blue"
          onPress={() => navigation.navigate("SignUp")}
        >
          Get Started
        </Button>

        <Button
          size="$5"
          variant="outlined"
          onPress={() => navigation.navigate("Login")}
        >
          I already have an account
        </Button>
      </YStack>
    </YStack>
  );
};
