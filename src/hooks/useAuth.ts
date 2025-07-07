import { authService } from "@/services/auth";
import { AuthUser } from "@/types/auth";
import { useCallback, useEffect, useState } from "react";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  /**
   * Initialize authentication state on app start
   * Amplify handles persistent authentication automatically
   */
  const initializeAuth = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Simply check if user is authenticated - Amplify handles token refresh
      const isAuthenticated = await authService.isAuthenticated();
      const user = isAuthenticated ? await authService.getCurrentUser() : null;

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated,
        error: null,
      });
    } catch (error) {
      console.error("Auth initialization failed:", error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      });
    }
  }, []);

  /**
   * Sign in user
   */
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setAuthState((prev) => ({ ...prev, error: null }));

      const user = await authService.signIn({ email, password });

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      console.error("useAuth: Sign in failed:", error);
      setAuthState((prev) => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : "Sign in failed",
      }));
      throw error;
    }
  }, []);

  /**
   * Sign up user
   */
  const signUp = useCallback(
    async (email: string, password: string, full_name?: string) => {
      try {
        setAuthState((prev) => ({ ...prev, error: null }));

        await authService.signUp({ email, password, full_name });

        setAuthState((prev) => ({
          ...prev,
          error: null,
        }));
      } catch (error) {
        console.error("useAuth: Sign up failed:", error);
        setAuthState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Sign up failed",
        }));
        throw error;
      }
    },
    []
  );

  /**
   * Sign out user
   */
  const signOut = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      await authService.signOut();

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error("useAuth: Sign out failed:", error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Sign out failed",
      }));
      throw error;
    }
  }, []);

  /**
   * Confirm sign up with verification code
   */
  const confirmSignUp = useCallback(async (email: string, code: string) => {
    try {
      setAuthState((prev) => ({ ...prev, error: null }));

      await authService.confirmSignUp(email, code);

      setAuthState((prev) => ({
        ...prev,
        error: null,
      }));
    } catch (error) {
      console.error("useAuth: Confirm sign up failed:", error);
      setAuthState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Email confirmation failed",
      }));
      throw error;
    }
  }, []);

  /**
   * Resend confirmation code
   */
  const resendConfirmationCode = useCallback(async (email: string) => {
    try {
      setAuthState((prev) => ({ ...prev, error: null }));

      await authService.resendConfirmationCode(email);

      setAuthState((prev) => ({
        ...prev,
        error: null,
      }));
    } catch (error) {
      console.error("useAuth: Resend confirmation code failed:", error);
      setAuthState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to resend confirmation code",
      }));
      throw error;
    }
  }, []);

  /**
   * Auto-send verification code for unverified users
   */
  const autoSendVerificationCode = useCallback(async (email: string) => {
    try {
      setAuthState((prev) => ({ ...prev, error: null }));

      await authService.autoSendVerificationCode(email);

      setAuthState((prev) => ({
        ...prev,
        error: null,
      }));
    } catch (error) {
      console.error("useAuth: Auto-send verification code failed:", error);
      setAuthState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send verification code",
      }));
      throw error;
    }
  }, []);

  /**
   * Request password reset
   */
  const forgotPassword = useCallback(async (email: string) => {
    try {
      setAuthState((prev) => ({ ...prev, error: null }));

      await authService.forgotPassword({ email });

      setAuthState((prev) => ({
        ...prev,
        error: null,
      }));
    } catch (error) {
      console.error("useAuth: Forgot password failed:", error);
      setAuthState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Password reset failed",
      }));
      throw error;
    }
  }, []);

  /**
   * Confirm password reset
   */
  const confirmResetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      try {
        setAuthState((prev) => ({ ...prev, error: null }));

        await authService.confirmForgotPassword({ email, code, newPassword });

        setAuthState((prev) => ({
          ...prev,
          error: null,
        }));
      } catch (error) {
        console.error("useAuth: Confirm reset password failed:", error);
        setAuthState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Password reset confirmation failed",
        }));
        throw error;
      }
    },
    []
  );

  /**
   * Refresh user data - only when explicitly needed
   */
  const refreshUser = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser();
      const isAuthenticated = await authService.isAuthenticated();

      setAuthState((prev) => ({
        ...prev,
        user,
        isAuthenticated,
      }));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, []);

  /**
   * Clear auth state - useful for debugging
   */
  const clearAuth = useCallback(async () => {
    try {
      await authService.signOut();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error("Error clearing auth:", error);
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    resendConfirmationCode,
    autoSendVerificationCode,
    forgotPassword,
    confirmResetPassword,
    refreshUser,
    initializeAuth,
    clearAuth,
  };
};
