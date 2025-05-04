const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add cjs extension to sourceExts
config.resolver.sourceExts.push("cjs");

// Disable package exports
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
