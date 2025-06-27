const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add Tamagui to Metro resolver
config.resolver.alias = {
  ...config.resolver.alias,
  '@': './src',
  '@/components': './src/components',
  '@/screens': './src/screens',
  '@/hooks': './src/hooks',
  '@/utils': './src/utils',
  '@/types': './src/types',
  '@/constants': './src/constants',
  '@/services': './src/services',
  '@/navigation': './src/navigation',
};

// Tamagui specific configuration
config.transformer.minifierConfig = {
  // Disable minification of Tamagui styles in development for better debugging
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config; 