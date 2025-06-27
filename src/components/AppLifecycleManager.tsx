import { useAuthContext } from "@/providers/AuthProvider";
import React, { useEffect } from "react";
import { AppState } from "react-native";

export const AppLifecycleManager: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { refreshUser, isAuthenticated } = useAuthContext();

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      // Simple: just check when app becomes active
      if (nextAppState === "active" && isAuthenticated) {
        await refreshUser();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [isAuthenticated, refreshUser]);

  return <>{children}</>;
};
