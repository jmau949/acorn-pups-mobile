// Common component and utility types
export interface BaseComponentProps {
  children?: React.ReactNode;
  testID?: string;
}

// Form types
export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
}

// API types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}
