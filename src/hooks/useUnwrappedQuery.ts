/**
 * Unwrapped Query Hook Utilities
 *
 * Generic utilities for unwrapping ApiResponse in React Query hooks.
 * This allows UI components to access data directly without needing to go through .data.data
 */

import { ApiResponse, UnwrappedApiResponse } from "@/types/common";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";

/**
 * Generic hook that unwraps ApiResponse<T> and returns T directly
 *
 * @param options - Standard React Query options where queryFn returns ApiResponse<T>
 * @returns UseQueryResult where data is T (unwrapped) instead of ApiResponse<T>
 */
export function useUnwrappedQuery<
  TQueryFnData extends ApiResponse<any>,
  TError = Error,
  TData = UnwrappedApiResponse<TQueryFnData>,
  TQueryKey extends ReadonlyArray<unknown> = ReadonlyArray<unknown>
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
    queryFn: () => Promise<TQueryFnData>;
  }
): UseQueryResult<TData, TError> {
  return useQuery({
    ...options,
    select: (data: TQueryFnData) => {
      // Extract the actual data from the ApiResponse wrapper
      return data.data as TData;
    },
  });
}

/**
 * Type-safe unwrapped query hook with automatic data extraction
 *
 * Usage example:
 * ```typescript
 * const { data, isLoading, error } = useUnwrappedQuery({
 *   queryKey: ['users', userId, 'devices'],
 *   queryFn: () => apiClient.get<UserDevicesApiResponse>(`/users/${userId}/devices`),
 *   staleTime: 5 * 60 * 1000,
 * });
 *
 * // Now data is UserDevicesData directly, not ApiResponse<UserDevicesData>
 * // You can access data.devices and data.total directly
 * ```
 */
export function useTypedUnwrappedQuery<
  TApiResponse extends ApiResponse<any>,
  TError = Error,
  TQueryKey extends ReadonlyArray<unknown> = ReadonlyArray<unknown>
>(
  options: UseQueryOptions<
    TApiResponse,
    TError,
    UnwrappedApiResponse<TApiResponse>,
    TQueryKey
  > & {
    queryFn: () => Promise<TApiResponse>;
  }
): UseQueryResult<UnwrappedApiResponse<TApiResponse>, TError> {
  return useQuery({
    ...options,
    select: (data: TApiResponse) => {
      // Extract the actual data from the ApiResponse wrapper
      return data.data as UnwrappedApiResponse<TApiResponse>;
    },
  });
}

/**
 * Utility function to manually unwrap ApiResponse
 * Useful for data transformations or when you need to unwrap outside of React Query
 */
export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  return response.data;
}

/**
 * Utility function to check if a response is an ApiResponse
 */
export function isApiResponse<T>(response: any): response is ApiResponse<T> {
  return (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    "requestId" in response
  );
}

/**
 * Helper type for extracting the unwrapped data type from a query function
 */
export type ExtractUnwrappedData<T> = T extends () => Promise<
  ApiResponse<infer U>
>
  ? U
  : T extends () => Promise<infer U>
  ? U
  : never;
