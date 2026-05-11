const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Block PushNotificationIOS native module that crashes in Expo Go on iOS
// The module is lazily exported from react-native/index.js but Metro's
// importAll triggers all getters, causing a crash when the native module
// is not available in Expo Go runtime.
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.includes('NativePushNotificationManagerIOS') ||
    (moduleName.includes('PushNotificationIOS') && !moduleName.includes('node_modules'))
  ) {
    return { type: 'empty' };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
