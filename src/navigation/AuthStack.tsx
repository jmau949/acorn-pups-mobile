import { ConfirmResetPasswordScreen } from "@/screens/auth/ConfirmResetPasswordScreen";
import { EmailVerificationScreen } from "@/screens/auth/EmailVerificationScreen";
import { ForgotPasswordScreen } from "@/screens/auth/ForgotPasswordScreen";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { SignUpScreen } from "@/screens/auth/SignUpScreen";
import { WelcomeScreen } from "@/screens/auth/WelcomeScreen";
import type { AuthStackParamList } from "@/types/auth";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="ConfirmResetPassword"
        component={ConfirmResetPasswordScreen}
      />
    </Stack.Navigator>
  );
};
