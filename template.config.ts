// Template configuration file
// This file defines the placeholders and default values for the template
export const TEMPLATE_CONFIG = {
  // App Information
  APP_NAME: "Acorn Pups",
  APP_SLUG: "acorn-pups-mobile",
  APP_DESCRIPTION:
    "A React Native app with Expo, Tamagui, and AWS Cognito authentication",
  APP_VERSION: "1.0.0",

  // App Icon/Branding
  APP_EMOJI: "ðŸ¶", // Default app emoji
  APP_COLOR: "$blue9", // Default Tamagui color

  // Bundle Identifiers (you'll need to replace these)
  IOS_BUNDLE_ID: "com.acornpups.yourapp",
  ANDROID_PACKAGE: "com.acornpups.yourapp",

  // Company/Developer Info
  COMPANY_NAME: "Acorn Pups",

  // EAS Project (you'll need to run eas build:configure)
  EAS_PROJECT_ID: "your-eas-project-id",

  // Git Repository
  REPO_URL: "https://github.com/jmau949/acorn-pups-mobile",
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
  EAS_PROJECT_ID,
  REPO_URL,
} = TEMPLATE_CONFIG;
