import { configureAmplify } from "@/config/aws-config";
import {
  AuthUser,
  ConfirmResetPasswordData,
  LoginCredentials,
  ResetPasswordData,
  SignUpCredentials,
} from "@/types/auth";
import {
  AuthUser as CognitoAuthUser,
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from "aws-amplify/auth";
import * as SecureStore from "expo-secure-store";

// Initialize Amplify
configureAmplify();

/**
 * Simple authentication utilities - lets AWS Amplify handle token management
 */
export const authService = {
  /**
   * Convert Cognito user to our AuthUser type
   */
  async cognitoUserToAuthUser(cognitoUser: CognitoAuthUser): Promise<AuthUser> {
    // Get additional user attributes from Cognito
    let fullName: string | undefined;

    try {
      // Try to get user attributes to extract the name
      const session = await fetchAuthSession();
      const userAttributes = session.tokens?.idToken?.payload;
      fullName = userAttributes?.name as string;
    } catch (error) {
      // If we can't get attributes, that's ok - name will be undefined
      console.log("Could not fetch user attributes:", error);
    }

    return {
      user_id: cognitoUser.userId,
      email: cognitoUser.signInDetails?.loginId || "",
      cognito_sub: cognitoUser.userId,
      email_verified: true, // Cognito handles email verification
      full_name: fullName,
    };
  },

  /**
   * Check if user is authenticated - Amplify handles token refresh automatically
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      return !!session.tokens?.accessToken;
    } catch {
      return false;
    }
  },

  /**
   * Get current user if authenticated
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const cognitoUser = await getCurrentUser();
      return await this.cognitoUserToAuthUser(cognitoUser);
    } catch {
      return null;
    }
  },

  /**
   * Sign up a new user
   */
  async signUp(
    credentials: SignUpCredentials
  ): Promise<{ success: boolean; message: string }> {
    try {
      await signUp({
        username: credentials.email,
        password: credentials.password,
        options: {
          userAttributes: {
            email: credentials.email,
            ...(credentials.full_name && { name: credentials.full_name }),
            ...(credentials.phone && {
              phone_number: credentials.phone,
            }),
          },
        },
      });

      return {
        success: true,
        message: "Verification code sent to your email",
      };
    } catch (error) {
      throw this.formatError(error);
    }
  },

  /**
   * Confirm sign up with verification code
   */
  async confirmSignUp(
    email: string,
    code: string
  ): Promise<{ success: boolean }> {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
      return { success: true };
    } catch (error) {
      throw this.formatError(error);
    }
  },

  /**
   * Resend confirmation code
   */
  async resendConfirmationCode(email: string): Promise<{ success: boolean }> {
    try {
      await resendSignUpCode({ username: email });
      return { success: true };
    } catch (error) {
      throw this.formatError(error);
    }
  },

  /**
   * Sign in user
   */
  async signIn(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      const result = await signIn({
        username: credentials.email,
        password: credentials.password,
      });

      // Check if user needs email verification based on the nextStep
      if (
        !result.isSignedIn &&
        result.nextStep?.signInStep === "CONFIRM_SIGN_UP"
      ) {
        // Create a specific error type for unverified users
        const unverifiedError = new Error("User email not verified");
        (unverifiedError as any).code = "UserNotConfirmedException";
        (unverifiedError as any).email = credentials.email;
        (unverifiedError as any).password = credentials.password; // Store for auto-login after verification
        throw unverifiedError;
      }

      if (!result.isSignedIn) {
        throw new Error("Sign in was not completed");
      }

      const cognitoUser = await getCurrentUser();
      const user = await this.cognitoUserToAuthUser(cognitoUser);

      return user;
    } catch (error) {
      console.error("Sign in failed:", error);

      // If we already created the unverified user error, just re-throw it
      if ((error as any)?.code === "UserNotConfirmedException") {
        throw error;
      }

      // Check if user needs email verification (fallback for older error format)
      if ((error as any)?.name === "UserNotConfirmedException") {
        // Create a specific error type for unverified users
        const unverifiedError = new Error("User email not verified");
        (unverifiedError as any).code = "UserNotConfirmedException";
        (unverifiedError as any).email = credentials.email;
        (unverifiedError as any).password = credentials.password; // Store for auto-login after verification
        throw unverifiedError;
      }

      const formattedError = this.formatError(error);
      throw formattedError;
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut();
      // Clear any cached user data
      await SecureStore.deleteItemAsync("cached_user_data").catch(() => {});
    } catch (error) {
      throw this.formatError(error);
    }
  },

  /**
   * Request password reset
   */
  async forgotPassword(
    data: ResetPasswordData
  ): Promise<{ success: boolean; message: string }> {
    try {
      await resetPassword({ username: data.email });
      return {
        success: true,
        message: "Password reset code sent to your email",
      };
    } catch (error) {
      throw this.formatError(error);
    }
  },

  /**
   * Confirm password reset with code
   */
  async confirmForgotPassword(
    data: ConfirmResetPasswordData
  ): Promise<{ success: boolean }> {
    try {
      await confirmResetPassword({
        username: data.email,
        confirmationCode: data.code,
        newPassword: data.newPassword,
      });
      return { success: true };
    } catch (error) {
      throw this.formatError(error);
    }
  },

  /**
   * Change password for authenticated user
   */
  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    try {
      await updatePassword({ oldPassword, newPassword });
      return { success: true };
    } catch (error) {
      throw this.formatError(error);
    }
  },

  /**
   * Get current session - Amplify handles refresh automatically
   */
  async getSession() {
    try {
      return await fetchAuthSession();
    } catch (error) {
      throw this.formatError(error);
    }
  },

  /**
   * Auto-send verification code for unverified users
   */
  async autoSendVerificationCode(email: string): Promise<{ success: boolean }> {
    try {
      await resendSignUpCode({ username: email });
      return { success: true };
    } catch (error) {
      throw this.formatError(error);
    }
  },

  /**
   * Format error messages for user-friendly display
   */
  formatError(error: any): Error {
    const errorCode = error.code || error.name;

    const errorMessages: Record<string, string> = {
      UserNotFoundException:
        "No account found with this email address. Please check your email or create a new account.",
      NotAuthorizedException:
        "Incorrect email or password. Please check your credentials and try again.",
      UserNotConfirmedException:
        "Please verify your email address before signing in. Check your inbox for a verification code.",
      CodeMismatchException:
        "The verification code you entered is incorrect. Please check the code and try again.",
      ExpiredCodeException:
        "Your verification code has expired. Please request a new code to continue.",
      LimitExceededException:
        "Too many sign-in attempts. Please wait a few minutes before trying again.",
      UsernameExistsException:
        "An account with this email address already exists. Please sign in instead.",
      InvalidPasswordException:
        "Password doesn't meet the requirements. Please use at least 8 characters with a mix of letters and numbers.",
      TooManyRequestsException:
        "Too many requests sent. Please wait a moment before trying again.",
      NetworkError:
        "Network connection issue. Please check your internet connection and try again.",
      TooManyFailedAttemptsException:
        "Account temporarily locked due to too many failed attempts. Please try again later.",
      InvalidParameterException:
        "Invalid information provided. Please check your input and try again.",
      ResourceNotFoundException:
        "Service temporarily unavailable. Please try again in a few moments.",
    };

    const message =
      errorMessages[errorCode] ||
      error.message ||
      "Something unexpected happened. Please try again or contact support if the problem continues.";
    return new Error(message);
  },
};
