# React Native Template - Authentication Guide

Complete authentication documentation for this React Native template using AWS Cognito.

## Table of Contents

1. [Quick Start](#quick-start)
2. [AWS Cognito Setup](#aws-cognito-setup)
3. [Authentication System Architecture](#authentication-system-architecture)
4. [Persistent Authentication](#persistent-authentication)
5. [System Refactoring](#system-refactoring)
6. [Troubleshooting](#troubleshooting)
7. [Security Considerations](#security-considerations)

---

## Quick Start

### Prerequisites

- AWS Account
- Node.js and npm installed
- Expo CLI

### Environment Setup

1. Copy `env.example.js` to `env.js`
2. Update with your AWS Cognito configuration:

```javascript
export const ENV_CONFIG = {
  AWS_REGION: "us-east-1",
  AWS_USER_POOL_ID: "us-east-1_xxxxxxxxx",
  AWS_USER_POOL_CLIENT_ID: "xxxxxxxxxxxxxxxxxxxxxxxxxx",
  APP_ENV: "development",
};
```

3. Update `template.config.ts` with your app details
4. Run the app: `npm start`

---

## AWS Cognito Setup

### Step 1: Create a Cognito User Pool

1. Open the AWS Console and navigate to **Amazon Cognito**
2. Click **Create user pool**
3. Configure the following settings:

#### Authentication providers

- **Cognito user pool sign-in options**: Select "Email"

#### Security requirements

- **Password policy**:
  - Minimum length: 8 characters only
  - No other requirements (uppercase, lowercase, numbers, symbols)

#### Sign-up experience

- **Self-service sign-up**: Enable
- **Cognito-assisted verification and confirmation**: Enable
- **Allow Cognito to automatically send messages to verify and confirm**: Enable
- **Attributes to verify**: Email
- **Verifying attribute changes**: Keep existing attribute value active when an update is pending
- **Active attribute values when an update is pending**: Email

#### Required attributes

- Email (already selected)
- Name (optional, select if you want to collect user names)

#### Message delivery

- **Email provider**: Send email with Cognito
- **FROM email address**: Use default
- **Reply-to email address**: Use default

### Step 2: Configure App Client

1. In the user pool settings, go to **App integration**
2. Create an **App client**:
   - **App type**: Public client
   - **App client name**: `your-app-name`
   - **Client secret**: Don't generate (not recommended for mobile apps)
   - **Auth flows**:
     - ✅ ALLOW_USER_SRP_AUTH
     - ✅ ALLOW_REFRESH_TOKEN_AUTH
   - **Prevent user existence errors**: Enable
   - **Refresh token expiration**: Set to 3650 days (10 years) for persistent login
   - **Access token expiration**: Keep default (1 hour)
   - **ID token expiration**: Keep default (1 hour)

### Step 3: Create Identity Pool (Optional)

If you need AWS service access:

1. Go to **Federated Identities**
2. Click **Create new identity pool**
3. **Identity pool name**: `your_app_identity_pool`
4. **Unauthenticated identities**: Enable if needed
5. **Authentication providers**:
   - Choose Cognito
   - User Pool ID: [Your User Pool ID]
   - App Client ID: [Your App Client ID]

### Step 4: Find Your Configuration Values

#### User Pool ID

1. Go to Amazon Cognito > User pools
2. Click on your user pool
3. Copy the **Pool Id** from the user pool overview

#### App Client ID

1. In your user pool, go to **App integration**
2. Scroll down to **App clients and analytics**
3. Click on your app client
4. Copy the **Client ID**

#### Identity Pool ID (if using)

1. Go to Amazon Cognito > Federated identities
2. Click on your identity pool
3. Copy the **Identity pool ID**

#### Region

- Use the AWS region where you created your resources (e.g., `us-east-1`, `us-west-2`)

---

## Authentication System Architecture

### Overview

The app uses a **simplified, performance-optimized authentication system** that trusts AWS Amplify's built-in capabilities for token management and persistent authentication.

### Core Components

1. **AuthService** (`src/services/auth.ts`) - Simple object with direct Amplify calls
2. **useAuth Hook** (`src/hooks/useAuth.ts`) - React hook for state management
3. **AuthProvider** (`src/providers/AuthProvider.tsx`) - Context provider
4. **AppLifecycleManager** (`src/components/AppLifecycleManager.tsx`) - App state monitoring

### Key Features

#### ✅ What the System Does

- **Simple Authentication**: Direct calls to AWS Amplify
- **Persistent Login**: Users stay logged in indefinitely (up to 10 years)
- **Automatic Token Refresh**: Handled transparently by Amplify
- **React Integration**: Modern hook-based state management
- **Error Handling**: User-friendly error messages

#### ❌ What the System Doesn't Do (By Design)

- No background timers
- No manual token parsing
- No complex storage operations
- No custom token management
- No singleton patterns

### Implementation Pattern

```typescript
// Simple, direct approach
export const authService = {
  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      return !!session.tokens?.accessToken;
    } catch {
      return false;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const cognitoUser = await getCurrentUser();
      return this.cognitoUserToUser(cognitoUser);
    } catch {
      return null;
    }
  },
};
```

---

## Persistent Authentication

### How It Works

The app provides **seamless persistent authentication** where users remain logged in across:

- App restarts
- Device reboots
- Long periods of inactivity (months/years)
- App updates

### Implementation Details

#### AWS Amplify Handles Automatically:

1. **Token Refresh**: Access tokens refreshed before expiration
2. **Session Storage**: Refresh tokens stored securely
3. **Session Recovery**: Automatic restoration on app start
4. **Background Sync**: Token lifecycle managed in background

#### App-Level Implementation:

1. **Simple State Checks**: Direct authentication status queries
2. **Reactive Updates**: Auth state updated only when needed
3. **Foreground Refresh**: User data refreshed when app becomes active

### Configuration

- **Refresh Tokens**: Valid for 10 years (configurable in Cognito)
- **Access Tokens**: Valid for 1 hour (automatically refreshed)
- **Password Requirements**: 8 characters minimum only

### User Experience

Users experience:

- **Sign in once** → **Stay logged in forever**
- No loading screens for authentication
- Instant app access
- No re-authentication prompts

---

#### 🔋 Battery Life

- No background processing
- No periodic token checks
- Reduced CPU usage

#### 🚀 Performance

- Faster app startup
- Smoother UI interactions
- Instant authentication checks

#### 🔧 Maintainability

- Simpler codebase
- Fewer bugs
- Easier testing
- Modern React patterns

---

## Troubleshooting

### Common Issues

#### "User pool does not exist"

- Check that `AWS_USER_POOL_ID` is correct
- Verify you're using the right AWS region

#### "Invalid client id"

- Check that `AWS_USER_POOL_CLIENT_ID` is correct
- Ensure the app client exists in the user pool

#### "User is not confirmed"

- Make sure the user has verified their email
- Check spam folder for verification emails

#### Network errors

- Verify internet connection
- Check if AWS services are accessible

#### Tamagui Configuration Error

- Run: `npx @tamagui/cli check`
- Ensure all Tamagui dependencies use the same version

### Debug Commands

```bash
# Check Tamagui dependencies
npx @tamagui/cli check

# Type check
npm run type-check

# Start app
npm start
```

### Development vs Production

#### For Production:

1. Use custom domain for email sending
2. Set up proper IAM roles for Identity Pool
3. Configure custom email templates
4. Set up monitoring and logging
5. Review security settings

---

## Security Considerations

### Password Policy

- **Requirement**: 8 characters minimum only
- **No complexity requirements**: For better UX
- **Configurable**: Can be changed in Cognito settings

### Token Security

- **Access Tokens**: Short-lived (1 hour), frequently refreshed
- **Refresh Tokens**: Long-lived (10 years) but securely managed by AWS
- **Storage**: No sensitive tokens stored locally (managed by Amplify)

### Session Management

- **Automatic Cleanup**: Failed refresh attempts clear stored data
- **Secure Storage**: User data encrypted with device security
- **Network Security**: All communication over HTTPS with AWS

### Privacy

- **User Control**: Users can explicitly sign out
- **Data Minimization**: Only necessary user data stored locally
- **Encryption**: All stored data encrypted at rest

### Best Practices

1. Never commit `env.js` to version control
2. Use different User Pools for different environments
3. Regularly review and rotate credentials
4. Enable MFA for admin accounts
5. Monitor authentication events through CloudWatch

---

## Testing

### Test the Setup

1. Run the app: `npm start`
2. Try to sign up with a new email address
3. Check your email for the verification code
4. Complete the sign-up process
5. Try signing in with your credentials
6. Close the app and reopen it - you should remain logged in

### Test Scenarios

- **Fresh Install**: First-time user experience
- **App Restart**: Persistent session recovery
- **Long Inactivity**: Authentication after extended periods
- **Network Issues**: Offline/online transitions
- **Device Restart**: Session persistence across reboots

---

## Future Enhancements

### Planned Features

1. **Biometric Authentication**: Face ID/Touch ID support
2. **Social Sign-In**: Google, Apple, Facebook login
3. **Multi-Device Sessions**: Sync across devices
4. **Session Analytics**: Track authentication patterns

### Implementation Roadmap

1. Add `expo-local-authentication` package
2. Configure social identity providers in Cognito
3. Implement biometric flows
4. Add session management UI

---

## Conclusion

This template uses a **simplified, high-performance authentication system** that:

- ✅ **Trusts AWS Amplify** for what it does best
- ✅ **Provides persistent authentication** for seamless UX
- ✅ **Optimizes performance** with minimal background processing
- ✅ **Maintains security** with enterprise-grade token management
- ✅ **Simplifies maintenance** with clean, modern code

**Key Takeaway**: Stop fighting the framework. Trust AWS Amplify to handle authentication properly, and focus on building great user experiences.
