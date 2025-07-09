import { useAuth } from "@/providers/AuthProvider";
import type { AuthStackParamList } from "@/types/auth";
import {
  getPasswordRequirementsText,
  validatePassword,
} from "@/utils/passwordValidation";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H2, Input, Paragraph, Text, XStack, YStack } from "tamagui";

type Props = NativeStackScreenProps<AuthStackParamList, "ConfirmResetPassword">;

interface FormData {
  code: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

interface FormState {
  isSubmitting: boolean;
  isSuccess: boolean;
  errors: FormErrors;
}

export const ConfirmResetPasswordScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { confirmResetPassword } = useAuth();
  const { email } = route.params;
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<FormData>({
    code: "",
    newPassword: "",
    confirmPassword: "",
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

    if (!formData.code.trim()) {
      newErrors.code = "Verification code is required";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        newErrors.newPassword = passwordValidation.errors[0]; // Show first error
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirmReset = async () => {
    if (!validateForm()) return;

    setFormState({
      isSubmitting: true,
      isSuccess: false,
      errors: {},
    });

    try {
      await confirmResetPassword(email, formData.code, formData.newPassword);

      setFormState({
        isSubmitting: false,
        isSuccess: true,
        errors: {},
      });

      // Navigate to login screen after showing success state briefly
      setTimeout(() => {
        navigation.navigate("Login");
      }, 1500);
    } catch (error: any) {
      console.error("Confirm reset password error:", error);

      setFormState({
        isSubmitting: false,
        isSuccess: false,
        errors: {
          general:
            error instanceof Error
              ? error.message
              : "Failed to reset password. Please try again.",
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
            <H2 textAlign="center">Set New Password</H2>
            <Paragraph color="$color10" textAlign="center" fontSize="$3">
              Enter the verification code sent to {email} and your new password.
            </Paragraph>
          </YStack>

          {/* Form */}
          <YStack space="$3">
            {/* Verification Code Field */}
            <YStack space="$2">
              <Input
                placeholder="Verification code"
                value={formData.code}
                onChangeText={(text) => updateFormData("code", text)}
                borderColor={formState.errors.code ? "$red7" : "$borderColor"}
                keyboardType="numeric"
                autoCapitalize="none"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                returnKeyType="next"
                disabled={formState.isSubmitting || formState.isSuccess}
              />
              {formState.errors.code && (
                <Text color="$red11" fontSize="$2">
                  {formState.errors.code}
                </Text>
              )}
            </YStack>

            {/* New Password Field */}
            <YStack space="$2">
              <Input
                placeholder={getPasswordRequirementsText()}
                value={formData.newPassword}
                onChangeText={(text) => updateFormData("newPassword", text)}
                borderColor={
                  formState.errors.newPassword ? "$red7" : "$borderColor"
                }
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                disabled={formState.isSubmitting || formState.isSuccess}
              />
              {formState.errors.newPassword && (
                <Text color="$red11" fontSize="$2">
                  {formState.errors.newPassword}
                </Text>
              )}
            </YStack>

            {/* Confirm New Password Field */}
            <YStack space="$2">
              <Input
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData("confirmPassword", text)}
                borderColor={
                  formState.errors.confirmPassword ? "$red7" : "$borderColor"
                }
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleConfirmReset}
                disabled={formState.isSubmitting || formState.isSuccess}
              />
              {formState.errors.confirmPassword && (
                <Text color="$red11" fontSize="$2">
                  {formState.errors.confirmPassword}
                </Text>
              )}
            </YStack>

            {/* Submit Button */}
            <Button
              size="$4"
              theme="blue"
              onPress={handleConfirmReset}
              disabled={formState.isSubmitting || formState.isSuccess}
              opacity={formState.isSubmitting || formState.isSuccess ? 0.6 : 1}
            >
              {formState.isSubmitting
                ? "Resetting..."
                : formState.isSuccess
                ? "Password Reset!"
                : "Reset Password"}
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
