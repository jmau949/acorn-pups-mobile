import { useAuth } from "@/providers/AuthProvider";
import type { AuthStackParamList } from "@/types/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Form,
  H2,
  Input,
  Paragraph,
  ScrollView,
  Text,
  YStack,
} from "tamagui";

type Props = NativeStackScreenProps<AuthStackParamList, "EmailVerification">;

interface FormState {
  isSubmitting: boolean;
  isResending: boolean;
  isSuccess: boolean;
  errors: {
    code?: string;
    general?: string;
  };
  successMessage?: string;
}

export const EmailVerificationScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { email, password, context, autoSent } = route.params;
  const { confirmSignUp, resendConfirmationCode, signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");

  // Context-aware messaging
  const isSignupFlow = context === "signup";
  const title = isSignupFlow
    ? "Verify Your Email"
    : "Email Verification Required";
  const subtitle = isSignupFlow
    ? "We sent a verification code to complete your account setup"
    : "Please verify your email address to continue signing in";
  const buttonText = isSignupFlow ? "Complete Setup" : "Verify & Sign In";
  const backText = isSignupFlow ? "Back to Sign Up" : "Back to Sign In";
  const backAction = () =>
    navigation.navigate(isSignupFlow ? "SignUp" : "Login");

  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    isResending: false,
    isSuccess: false,
    errors: {},
    successMessage: autoSent ? "Code sent" : undefined,
  });

  // Clear the auto-sent message after a few seconds
  useEffect(() => {
    if (autoSent && formState.successMessage) {
      const timer = setTimeout(() => {
        setFormState((prev) => ({
          ...prev,
          successMessage: undefined,
        }));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [autoSent, formState.successMessage]);

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setFormState((prev) => ({
        ...prev,
        errors: { code: "Enter the 6-digit code" },
      }));
      return;
    }

    if (code.length !== 6) {
      setFormState((prev) => ({
        ...prev,
        errors: { code: "Code must be 6 digits" },
      }));
      return;
    }

    setFormState({
      isSubmitting: true,
      isResending: false,
      isSuccess: false,
      errors: {},
    });

    try {
      // Step 1: Confirm the user's email
      await confirmSignUp(email, code.trim());

      setFormState((prev) => ({
        ...prev,
        successMessage: "Verified! Signing you in...",
      }));

      // Step 2: Automatically sign in the user
      try {
        await signIn(email, password);

        setFormState({
          isSubmitting: false,
          isResending: false,
          isSuccess: true,
          errors: {},
          successMessage: isSignupFlow ? "Welcome!" : "Welcome back!",
        });

        // Navigation will be handled automatically by RootNavigator based on auth state
      } catch (signInError) {
        console.error("Auto sign-in failed after verification:", signInError);

        // If auto sign-in fails, show success but redirect to login
        setFormState({
          isSubmitting: false,
          isResending: false,
          isSuccess: false,
          errors: {
            general: "Verified! Please sign in to continue.",
          },
        });

        // Navigate to login after a brief delay
        setTimeout(() => {
          navigation.navigate("Login");
        }, 2000);
      }
    } catch (error) {
      console.error("Email verification failed:", error);
      setFormState({
        isSubmitting: false,
        isResending: false,
        isSuccess: false,
        errors: {
          general:
            error instanceof Error
              ? error.message
              : "Invalid code. Please try again.",
        },
      });
    }
  };

  const handleResendCode = async () => {
    setFormState((prev) => ({
      ...prev,
      isResending: true,
      errors: {},
    }));

    try {
      await resendConfirmationCode(email);
      setFormState((prev) => ({
        ...prev,
        isResending: false,
        successMessage: "New code sent",
      }));

      // Clear success message after a few seconds
      setTimeout(() => {
        setFormState((prev) => ({
          ...prev,
          successMessage: undefined,
        }));
      }, 3000);
    } catch (error) {
      setFormState((prev) => ({
        ...prev,
        isResending: false,
        errors: {
          general:
            error instanceof Error
              ? error.message
              : "Failed to resend. Try again.",
        },
      }));
    }
  };

  const clearCodeError = () => {
    if (formState.errors.code) {
      setFormState((prev) => ({
        ...prev,
        errors: { ...prev.errors, code: undefined },
      }));
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
        flex={1}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingVertical: 20,
          paddingTop: 60,
          paddingBottom: Platform.OS === "android" ? 60 : 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <YStack flex={1} width="100%" maxWidth={400} alignSelf="center">
          {/* Header */}
          <YStack alignItems="center" paddingTop="$12">
            <H2 textAlign="center">{title}</H2>
          </YStack>

          <YStack flex={1} justifyContent="center" space="$6">
            {/* Fixed height message container to prevent layout shift */}
            <YStack height={60} justifyContent="center">
              {/* Success Message */}
              {(formState.isSuccess || formState.successMessage) && (
                <YStack paddingVertical="$3">
                  <Text
                    color="$green10"
                    textAlign="center"
                    fontWeight="500"
                    fontSize="$4"
                  >
                    ✓ {formState.successMessage || "Success!"}
                  </Text>
                </YStack>
              )}

              {/* Error Message */}
              {formState.errors.general && (
                <YStack paddingVertical="$3">
                  <Text color="$red10" textAlign="center" fontSize="$4">
                    {formState.errors.general}
                  </Text>
                </YStack>
              )}
            </YStack>

            {/* Form */}
            <YStack space="$6" paddingBottom="$6">
              <Form onSubmit={handleVerifyCode}>
                <YStack space="$6" paddingBottom="$6">
                  {/* Code Input */}
                  <YStack space="$4" alignItems="center">
                    <Input
                      placeholder="000000"
                      value={code}
                      onChangeText={(value: string) => {
                        // Only allow numbers and limit to 6 digits
                        const numericValue = value
                          .replace(/[^0-9]/g, "")
                          .slice(0, 6);
                        setCode(numericValue);
                        clearCodeError();
                      }}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      textAlign="center"
                      fontSize="$7"
                      fontWeight="600"
                      letterSpacing={8}
                      size="$6"
                      maxLength={6}
                      width={200}
                      borderWidth={0}
                      backgroundColor="$gray2"
                      focusStyle={{
                        backgroundColor: "$gray3",
                        borderWidth: 0,
                      }}
                      disabled={formState.isSubmitting || formState.isSuccess}
                    />

                    {/* Fixed height container for code error to prevent layout shift */}
                    <YStack height={24} justifyContent="center">
                      {formState.errors.code && (
                        <Text fontSize="$3" color="$red10" textAlign="center">
                          {formState.errors.code}
                        </Text>
                      )}
                    </YStack>
                  </YStack>

                  {/* Verify Button */}
                  <YStack paddingTop="$2">
                    <Button
                      size="$5"
                      backgroundColor="$blue9"
                      color="white"
                      borderRadius="$6"
                      fontWeight="500"
                      disabled={
                        formState.isSubmitting ||
                        code.length !== 6 ||
                        formState.isSuccess
                      }
                      opacity={
                        formState.isSubmitting ||
                        code.length !== 6 ||
                        formState.isSuccess
                          ? 0.5
                          : 1
                      }
                      onPress={handleVerifyCode}
                      pressStyle={{
                        backgroundColor: "$blue10",
                        scale: 0.98,
                      }}
                    >
                      {formState.isSubmitting
                        ? "Verifying..."
                        : formState.isSuccess
                        ? "Verified!"
                        : buttonText}
                    </Button>
                  </YStack>
                </YStack>
              </Form>
            </YStack>

            {/* Resend Code */}
            <YStack space="$4" alignItems="center" paddingTop="$4">
              <Paragraph fontSize="$3" color="$gray10" textAlign="center">
                Didn't receive it?
              </Paragraph>
              <Button
                size="$4"
                backgroundColor="transparent"
                color="$blue10"
                fontWeight="500"
                onPress={handleResendCode}
                disabled={
                  formState.isResending ||
                  formState.isSubmitting ||
                  formState.isSuccess
                }
                opacity={
                  formState.isResending ||
                  formState.isSubmitting ||
                  formState.isSuccess
                    ? 0.5
                    : 1
                }
                pressStyle={{
                  backgroundColor: "$gray2",
                  scale: 0.98,
                }}
              >
                {formState.isResending ? "Sending..." : "Send new code"}
              </Button>
            </YStack>

            {/* Back Button */}
            <YStack alignItems="center" paddingTop="$6">
              <Button
                size="$3"
                backgroundColor="transparent"
                color="$gray10"
                fontWeight="400"
                onPress={backAction}
                disabled={formState.isSubmitting || formState.isSuccess}
                pressStyle={{
                  backgroundColor: "$gray2",
                  scale: 0.98,
                }}
              >
                {backText}
              </Button>
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
};
