import { useAuth } from "@/providers/AuthProvider";
import type { AuthStackParamList } from "@/types/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H2, Input, Paragraph, Text, XStack, YStack } from "tamagui";
import { APP_NAME } from "../../../template.config";

// Enhanced email validation pattern
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

interface FormState {
  isSubmitting: boolean;
  isSuccess: boolean;
  errors: FormErrors;
}

export const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
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

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailPattern.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setFormState({
      isSubmitting: true,
      isSuccess: false,
      errors: {},
    });

    try {
      await signUp(formData.email, formData.password, formData.name);

      setFormState({
        isSubmitting: false,
        isSuccess: true,
        errors: {},
      });

      // Navigate to email verification screen after showing success state briefly
      setTimeout(() => {
        navigation.navigate("EmailVerification", {
          email: formData.email,
          password: formData.password,
          context: "signup" as const,
        });
      }, 1500);
    } catch (error: any) {
      console.error("Sign up error:", error);

      // Enhanced error handling with better error messages
      let errorMessage = "Failed to create account. Please try again.";

      if (error.name === "UsernameExistsException") {
        errorMessage = "An account with this email already exists.";
        setFormState({
          isSubmitting: false,
          isSuccess: false,
          errors: { email: errorMessage },
        });
        return;
      }

      if (error.name === "InvalidParameterException") {
        if (error.message?.includes("email")) {
          errorMessage = "Please enter a valid email address.";
          setFormState({
            isSubmitting: false,
            isSuccess: false,
            errors: { email: errorMessage },
          });
          return;
        }
        if (error.message?.includes("password")) {
          errorMessage = "Password does not meet requirements.";
          setFormState({
            isSubmitting: false,
            isSuccess: false,
            errors: { password: errorMessage },
          });
          return;
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
            <H2 textAlign="center">Create Account</H2>
            <Paragraph color="$color10" textAlign="center" fontSize="$3">
              Join the {APP_NAME} community
            </Paragraph>
          </YStack>

          {/* Form */}
          <YStack space="$3">
            {/* Name Field */}
            <YStack space="$2">
              <Input
                placeholder="Full name"
                value={formData.name}
                onChangeText={(text) => updateFormData("name", text)}
                borderColor={formState.errors.name ? "$red7" : "$borderColor"}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                disabled={formState.isSubmitting || formState.isSuccess}
              />
              {formState.errors.name && (
                <Text color="$red11" fontSize="$2">
                  {formState.errors.name}
                </Text>
              )}
            </YStack>

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
                placeholder="Password (8+ characters)"
                value={formData.password}
                onChangeText={(text) => updateFormData("password", text)}
                borderColor={
                  formState.errors.password ? "$red7" : "$borderColor"
                }
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                disabled={formState.isSubmitting || formState.isSuccess}
              />
              {formState.errors.password && (
                <Text color="$red11" fontSize="$2">
                  {formState.errors.password}
                </Text>
              )}
            </YStack>

            {/* Confirm Password Field */}
            <YStack space="$2">
              <Input
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData("confirmPassword", text)}
                borderColor={
                  formState.errors.confirmPassword ? "$red7" : "$borderColor"
                }
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
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
              onPress={handleSignUp}
              disabled={formState.isSubmitting || formState.isSuccess}
              opacity={formState.isSubmitting || formState.isSuccess ? 0.6 : 1}
            >
              {formState.isSubmitting
                ? "Creating Account..."
                : formState.isSuccess
                ? "Account Created!"
                : "Create Account"}
            </Button>

            {/* Login Link */}
            <XStack justifyContent="center" alignItems="center" space="$2">
              <Text color="$color10" fontSize="$3">
                Already have an account?
              </Text>
              <Button
                variant="outlined"
                size="$2"
                onPress={() => navigation.navigate("Login")}
                chromeless
                disabled={formState.isSubmitting || formState.isSuccess}
              >
                <Text color="$blue10" fontSize="$3">
                  Sign In
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
