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

// API types matching OpenAPI v1.0.0 specification
export interface ApiResponse<T = any> {
  data: T;
  requestId: string;
  success?: boolean; // Optional for backward compatibility
  message?: string; // Optional for backward compatibility
}

// Generic error response type
export interface ApiErrorResponse {
  error: string;
  message: string;
  requestId: string;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

// Helper type to extract data from ApiResponse
export type UnwrappedApiResponse<T> = T extends ApiResponse<infer U> ? U : T;

// Utility type for React Query hooks that unwrap ApiResponse
export type UnwrappedQueryResult<T> = T extends ApiResponse<infer U> ? U : T;
