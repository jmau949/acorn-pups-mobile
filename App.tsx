import React from "react";
import "react-native-get-random-values";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { AppLifecycleManager } from "./src/components/AppLifecycleManager";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { configureAmplify } from "./src/config/aws-config";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/providers/AuthProvider";
import { QueryProvider } from "./src/providers/QueryProvider";
import tamaguiConfig from "./src/tamagui.config";

// Configure AWS Amplify
configureAmplify();

export default function App() {
  return (
    <ErrorBoundary>
      <TamaguiProvider config={tamaguiConfig}>
        <SafeAreaProvider>
          <QueryProvider>
            <AuthProvider>
              <AppLifecycleManager>
                <RootNavigator />
              </AppLifecycleManager>
            </AuthProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </TamaguiProvider>
    </ErrorBoundary>
  );
}
