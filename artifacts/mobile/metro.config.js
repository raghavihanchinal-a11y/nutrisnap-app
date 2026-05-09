const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Block Metro from watching temp directories created during react-native-purchases install
config.resolver = {
  ...config.resolver,
  blockList: [
    /.*_tmp_\d+.*/,
    /.*\/node_modules\/.*\/_tmp_.*/,
  ],
  // On web, react-native-google-mobile-ads uses codegenNativeComponent which is
  // not supported. Return an empty module so the web bundle still works.
  resolveRequest: (context, moduleName, platform) => {
    if (
      platform === "web" &&
      moduleName === "react-native-google-mobile-ads"
    ) {
      return { type: "empty" };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
