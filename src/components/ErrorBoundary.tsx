import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button, Card, Text, YStack } from "tamagui";
import {
  ErrorBoundaryState,
  ErrorCategory,
  ErrorSeverity,
} from "../types/errors";
import { errorLogger } from "../utils/errorLogger";

interface Props {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<{
    error: Error;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // Whether to isolate this boundary to prevent error propagation
}

export class TamaguiErrorBoundary extends Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with context
    const errorId = errorLogger.logError(
      error,
      ErrorCategory.UI_ERROR,
      ErrorSeverity.HIGH,
      {
        userAction: "component_render",
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: "TamaguiErrorBoundary",
        },
      }
    );

    this.setState({
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.handleRetry}
          />
        );
      }

      // Default fallback UI with Tamagui components
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackUIProps {
  error: Error;
  errorId?: string;
  onRetry: () => void;
}

const ErrorFallbackUI = React.memo<ErrorFallbackUIProps>(
  ({ error, errorId, onRetry }) => {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        padding="$4"
        backgroundColor="$background"
      >
        <Card
          padding="$4"
          borderRadius="$4"
          backgroundColor="$backgroundHover"
          borderWidth={1}
          borderColor="$borderColor"
          maxWidth={400}
          width="100%"
        >
          <YStack space="$3" alignItems="center">
            {/* Error Icon */}
            <YStack
              width={60}
              height={60}
              borderRadius={30}
              backgroundColor="$red2"
              justifyContent="center"
              alignItems="center"
            >
              <Text fontSize="$8" color="$red10">
                ⚠️
              </Text>
            </YStack>

            {/* Error Title */}
            <Text
              fontSize="$6"
              fontWeight="600"
              color="$color"
              textAlign="center"
            >
              Something went wrong
            </Text>

            {/* Error Message */}
            <Text
              fontSize="$4"
              color="$color11"
              textAlign="center"
              lineHeight="$1"
            >
              We encountered an unexpected error. Please try again.
            </Text>

            {/* Development Info */}
            {__DEV__ && (
              <YStack
                padding="$3"
                backgroundColor="$gray2"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$gray6"
                width="100%"
              >
                <Text fontSize="$2" color="$gray11" fontFamily="$mono">
                  {error.message}
                </Text>
                {errorId && (
                  <Text fontSize="$1" color="$gray10" marginTop="$1">
                    Error ID: {errorId}
                  </Text>
                )}
              </YStack>
            )}

            {/* Retry Button */}
            <Button
              onPress={onRetry}
              backgroundColor="$blue9"
              borderRadius="$3"
              paddingHorizontal="$4"
              paddingVertical="$3"
              width="100%"
              pressStyle={{
                backgroundColor: "$blue10",
              }}
            >
              <Text color="white" fontWeight="600">
                Try Again
              </Text>
            </Button>

            {/* Secondary Actions */}
            <YStack space="$2" width="100%">
              <Button
                onPress={() => {
                  // TODO: Add proper navigation to home or support
                  alert(
                    "Please restart the app or contact support if the issue persists."
                  );
                }}
                backgroundColor="transparent"
                borderWidth={1}
                borderColor="$borderColor"
                borderRadius="$3"
                paddingHorizontal="$4"
                paddingVertical="$3"
              >
                <Text color="$color11">Go to Home</Text>
              </Button>
            </YStack>
          </YStack>
        </Card>
      </YStack>
    );
  }
);

ErrorFallbackUI.displayName = "ErrorFallbackUI";

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <TamaguiErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </TamaguiErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithErrorBoundaryComponent;
};

// Lightweight error boundary for smaller components
export const ErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  return (
    <TamaguiErrorBoundary
      fallbackComponent={fallback ? () => <>{fallback}</> : undefined}
    >
      {children}
    </TamaguiErrorBoundary>
  );
};
