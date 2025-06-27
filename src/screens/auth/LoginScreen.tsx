import { useAuth } from "@/providers/AuthProvider";
import type { AuthStackParamList } from "@/types/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H2, Input, Paragraph, Text, XStack, YStack } from "tamagui";

// Enhanced email validation pattern
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

interface FormState {
  isSubmitting: boolean;
  isSuccess: boolean;
  errors: FormErrors;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { signIn, autoSendVerificationCode } = useAuth();
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
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

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setFormState({
      isSubmitting: true,
      isSuccess: false,
      errors: {},
    });

    try {
      await signIn(formData.email, formData.password);

      setFormState({
        isSubmitting: false,
        isSuccess: true,
        errors: {},
      });

      // The navigation will be handled automatically by RootNavigator based on auth state
    } catch (error: unknown) {
      console.error("Login failed:", error);

      // Check if user needs email verification
      if ((error as any)?.code === "UserNotConfirmedException") {
        setFormState({
          isSubmitting: true,
          isSuccess: false,
          errors: {},
        });

        try {
          // Auto-send verification code in background
          await autoSendVerificationCode(formData.email);

          // Navigate to verification screen with auto-sent flag
          setTimeout(() => {
            navigation.navigate("EmailVerification", {
              email: formData.email,
              password: formData.password,
              context: "login",
              autoSent: true,
            });
          }, 500);

          return;
        } catch (sendError) {
          console.error("Failed to auto-send verification code:", sendError);
          // Fall through to normal error handling
        }
      }

      setFormState({
        isSubmitting: false,
        isSuccess: false,
        errors: {
          general:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred. Please try again.",
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
            <H2 textAlign="center">Welcome Back</H2>
            <Paragraph color="$color10" textAlign="center" fontSize="$3">
              Sign in to your account
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
                returnKeyType="next"
                disabled={formState.isSubmitting || formState.isSuccess}
              />
              {formState.errors.email && (
                <Text color="$red11" fontSize="$2">
                  {formState.errors.email}
                </Text>
              )}
            </YStack>

            {/* Password Field */}
            <YStack space="$2">
              <Input
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) => updateFormData("password", text)}
                borderColor={
                  formState.errors.password ? "$red7" : "$borderColor"
                }
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                disabled={formState.isSubmitting || formState.isSuccess}
              />
              {formState.errors.password && (
                <Text color="$red11" fontSize="$2">
                  {formState.errors.password}
                </Text>
              )}
            </YStack>

            {/* Forgot Password Link */}
            <XStack justifyContent="flex-end">
              <Button
                variant="outlined"
                size="$2"
                onPress={() => navigation.navigate("ForgotPassword")}
                chromeless
                disabled={formState.isSubmitting || formState.isSuccess}
              >
                <Text color="$blue10" fontSize="$3">
                  Forgot Password?
                </Text>
              </Button>
            </XStack>

            {/* Submit Button */}
            <Button
              size="$4"
              theme="blue"
              onPress={handleSignIn}
              disabled={formState.isSubmitting || formState.isSuccess}
              opacity={formState.isSubmitting || formState.isSuccess ? 0.6 : 1}
            >
              {formState.isSubmitting
                ? "Signing In..."
                : formState.isSuccess
                ? "Success!"
                : "Sign In"}
            </Button>

            {/* Sign Up Link */}
            <XStack justifyContent="center" alignItems="center" space="$2">
              <Text color="$color10" fontSize="$3">
                Don't have an account?
              </Text>
              <Button
                variant="outlined"
                size="$2"
                onPress={() => navigation.navigate("SignUp")}
                chromeless
                disabled={formState.isSubmitting || formState.isSuccess}
              >
                <Text color="$blue10" fontSize="$3">
                  Sign Up
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
