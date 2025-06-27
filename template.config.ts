// Template configuration file
// This file defines the placeholders and default values for the template
export const TEMPLATE_CONFIG = {
  // App Information
  APP_NAME: "My React Native App",
  APP_SLUG: "my-react-native-app",
  APP_DESCRIPTION:
    "A React Native app with Expo, Tamagui, and AWS Cognito authentication",
  APP_VERSION: "1.0.0",

  // App Icon/Branding
  APP_EMOJI: "📱", // Default app emoji
  APP_COLOR: "$blue9", // Default Tamagui color

  // Bundle Identifiers (you'll need to replace these)
  IOS_BUNDLE_ID: "com.yourcompany.yourapp",
  ANDROID_PACKAGE: "com.yourcompany.yourapp",

  // Company/Developer Info
  COMPANY_NAME: "Your Company",
  DEVELOPER_NAME: "Your Name",

  // EAS Project (you'll need to run eas build:configure)
  EAS_PROJECT_ID: "your-eas-project-id",

  // AWS Cognito (you'll need to set these up)
  AWS_REGION: "us-east-1",
  AWS_USER_POOL_ID: "us-east-1_xxxxxxxxx",
  AWS_USER_POOL_CLIENT_ID: "xxxxxxxxxxxxxxxxxxxxxxxxxx",

  // Git Repository
  REPO_URL: "https://github.com/yourusername/your-repo",
} as const;

// Export individual values for easier imports
export const {
  APP_NAME,
  APP_SLUG,
  APP_DESCRIPTION,
  APP_VERSION,
  APP_EMOJI,
  APP_COLOR,
  IOS_BUNDLE_ID,
  ANDROID_PACKAGE,
  COMPANY_NAME,
  DEVELOPER_NAME,
  EAS_PROJECT_ID,
  AWS_REGION,
  AWS_USER_POOL_ID,
  AWS_USER_POOL_CLIENT_ID,
  REPO_URL,
} = TEMPLATE_CONFIG;
