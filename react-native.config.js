const isDevClientBuild = process.env.EAS_BUILD_PROFILE === 'development';

/** Exclude heavy debug-only native modules from preview/production APKs. */
module.exports = {
  dependencies: {
    ...(isDevClientBuild
      ? {}
      : {
          'expo-dev-client': { platforms: { android: null, ios: null } },
          'expo-dev-launcher': { platforms: { android: null, ios: null } },
          'expo-dev-menu': { platforms: { android: null, ios: null } },
          'expo-dev-menu-interface': { platforms: { android: null, ios: null } },
        }),
  },
};
