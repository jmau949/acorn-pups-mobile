/**
 * Auth-specific User type (minimal info from Cognito)
 */
export interface AuthUser {
  user_id: string;
  email: string;
  cognito_sub: string;
  email_verified: boolean;
  full_name?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface ConfirmResetPasswordData {
  email: string;
  code: string;
  newPassword: string;
}

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  EmailVerification: {
    email: string;
    password: string;
    context: "signup" | "login";
    autoSent?: boolean;
  };
  ForgotPassword: undefined;
  ConfirmResetPassword: { email: string };
};

export type AppStackParamList = {
  MainTabs: undefined;
};
