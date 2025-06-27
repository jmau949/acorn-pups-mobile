import { useAuth } from "@/providers/AuthProvider";
import type { AuthStackParamList } from "@/types/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H2, Input, Paragraph, Text, XStack, YStack } from "tamagui";

// Enhanced email validation pattern
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

interface FormData {
  email: string;
}

interface FormErrors {
  email?: string;
  general?: string;
}

interface FormState {
  isSubmitting: boolean;
  isSuccess: boolean;
  errors: FormErrors;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { forgotPassword } = useAuth();
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<FormData>({
    email: "",
  });

  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    isSuccess: false,
    errors: {},
  });

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formState.errors[field]) {
      setFormState((prev) => ({
        ...prev,
        errors: { ...prev.errors, [field]: undefined },
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailPattern.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setFormState({
      isSubmitting: true,
      isSuccess: false,
      errors: {},
    });

    try {
      await forgotPassword(formData.email);

      setFormState({
        isSubmitting: false,
        isSuccess: true,
        errors: {},
      });

      // Navigate to confirm reset password screen after showing success state briefly
      setTimeout(() => {
        navigation.navigate("ConfirmResetPassword", { email: formData.email });
      }, 1500);
    } catch (error: any) {
      console.error("Reset password error:", error);

      setFormState({
        isSubmitting: false,
        isSuccess: false,
        errors: {
          general:
            error instanceof Error
              ? error.message
              : "Failed to send reset email. Please try again.",
        },
      });
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
          justifyContent: "center",
          paddingHorizontal: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingVertical: 20,
          paddingBottom: Platform.OS === "android" ? 60 : 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <YStack space="$3" width="100%" maxWidth={400} alignSelf="center">
          {/* Header */}
          <YStack alignItems="center" space="$1">
            <H2 textAlign="center">Reset Password</H2>
            <Paragraph color="$color10" textAlign="center" fontSize="$3">
              Enter your email address and we'll send you a link to reset your
              password.
            </Paragraph>
          </YStack>

          {/* Form */}
          <YStack space="$3">
            {/* Email Field */}
            <YStack space="$2">
              <Input
                placeholder="Email address"
                value={formData.email}
                onChangeText={(text) =>
                  updateFormData("email", text.toLowerCase())
                }
                borderColor={formState.errors.email ? "$red7" : "$borderColor"}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
                disabled={formState.isSubmitting || formState.isSuccess}
              />
              {formState.errors.email && (
                <Text color="$red11" fontSize="$2">
                  {formState.errors.email}
                </Text>
              )}
            </YStack>

            {/* Submit Button */}
            <Button
              size="$4"
              theme="blue"
              onPress={handleResetPassword}
              disabled={formState.isSubmitting || formState.isSuccess}
              opacity={formState.isSubmitting || formState.isSuccess ? 0.6 : 1}
            >
              {formState.isSubmitting
                ? "Sending..."
                : formState.isSuccess
                ? "Email Sent!"
                : "Send Reset Link"}
            </Button>

            {/* Back to Login Link */}
            <XStack justifyContent="center" alignItems="center" space="$2">
              <Text color="$color10" fontSize="$3">
                Remember your password?
              </Text>
              <Button
                variant="outlined"
                size="$2"
                onPress={() => navigation.navigate("Login")}
                chromeless
                disabled={formState.isSubmitting || formState.isSuccess}
              >
                <Text color="$blue10" fontSize="$3">
                  Back to Login
                </Text>
              </Button>
            </XStack>
          </YStack>

          {/* Fixed space container for general error to prevent layout shifts */}
          <YStack height={80} justifyContent="flex-start">
            {formState.errors.general && (
              <YStack
                backgroundColor="$red2"
                borderColor="$red7"
                borderWidth={1}
                borderRadius="$3"
                padding="$3"
              >
                <Text color="$red11" fontSize="$3" textAlign="center">
                  {formState.errors.general}
                </Text>
              </YStack>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
};
