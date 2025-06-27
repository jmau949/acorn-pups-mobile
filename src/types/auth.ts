export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
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
  name?: string;
  phoneNumber?: string;
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
  Home: undefined;
};
