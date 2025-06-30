const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// ⬇️ temporary workaround for the “stream” / Node core‑module error
config.resolver.unstable_enablePackageExports = false;

module.exports = config;