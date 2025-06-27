# React Native Template Setup Script
# This script helps you configure the template for your specific project

param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$true)]
    [string]$AppSlug,
    
    [Parameter(Mandatory=$false)]
    [string]$AppDescription = "A React Native app with Expo, Tamagui, and AWS Cognito authentication",
    
    [Parameter(Mandatory=$false)]
    [string]$AppEmoji = "🐶",
    
    [Parameter(Mandatory=$false)]
    [string]$IOSBundleId = "com.yourcompany.yourapp",
    
    [Parameter(Mandatory=$false)]
    [string]$AndroidPackage = "com.yourcompany.yourapp",
    
    [Parameter(Mandatory=$false)]
    [string]$CompanyName = "Your Company",
    
    [Parameter(Mandatory=$false)]
    [string]$DeveloperName = "Your Name"
)

Write-Host "Setting up React Native Template for: $AppName" -ForegroundColor Green
Write-Host ""

# Update template.config.ts
Write-Host "Updating template configuration..." -ForegroundColor Yellow

$templateConfig = @"
// Template configuration file
// This file defines the placeholders and default values for the template
export const TEMPLATE_CONFIG = {
  // App Information
  APP_NAME: "$AppName",
  APP_SLUG: "$AppSlug",
  APP_DESCRIPTION: "$AppDescription",
  APP_VERSION: "1.0.0",
  
  // App Icon/Branding
  APP_EMOJI: "$AppEmoji", // Default app emoji
  APP_COLOR: "`$blue9", // Default Tamagui color
  
  // Bundle Identifiers (you'll need to replace these)
  IOS_BUNDLE_ID: "$IOSBundleId",
  ANDROID_PACKAGE: "$AndroidPackage",
  
  // Company/Developer Info
  COMPANY_NAME: "$CompanyName",
  
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
  EAS_PROJECT_ID,
  AWS_REGION,
  AWS_USER_POOL_ID,
  AWS_USER_POOL_CLIENT_ID,
  REPO_URL,
} = TEMPLATE_CONFIG;
"@

$templateConfig | Out-File -FilePath "template.config.ts" -Encoding UTF8
Write-Host "Updated template.config.ts" -ForegroundColor Green

# Update app.json
Write-Host "Updating app.json..." -ForegroundColor Yellow

$appJson = Get-Content "app.json" | ConvertFrom-Json
$appJson.expo.name = $AppName
$appJson.expo.slug = $AppSlug
$appJson.expo.ios.bundleIdentifier = $IOSBundleId
# Note: Android package is typically set in app.json as well, but it is usually in android.package
# For now, we'll keep the structure as is since Expo manages this

$appJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "app.json" -Encoding UTF8
Write-Host "Updated app.json" -ForegroundColor Green

# Update package.json
Write-Host "Updating package.json..." -ForegroundColor Yellow

$packageJson = Get-Content "package.json" | ConvertFrom-Json
$packageJson.name = $AppSlug
$packageJson.description = $AppDescription

$packageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "package.json" -Encoding UTF8
Write-Host "Updated package.json" -ForegroundColor Green

Write-Host ""
Write-Host "Template setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Replace app icons in the assets/ folder"
Write-Host "2. Set up AWS Cognito (see docs/AUTHENTICATION_GUIDE.md)"
Write-Host "3. Run 'eas build:configure' to set up EAS builds"
Write-Host "4. Start developing: 'npm start'"
Write-Host ""
Write-Host "Happy coding!" -ForegroundColor Green 