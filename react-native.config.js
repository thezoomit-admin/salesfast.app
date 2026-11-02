const isDevClientBuild = process.env.EAS_BUILD_PROFILE === 'development';

/** Native modules that must not be linked into the app. */
const notLinked = (names) =>
  Object.fromEntries(
    names.map((name) => [name, { platforms: { android: null, ios: null } }])
  );

module.exports = {
  dependencies: {
    // Heavy debug-only native modules: excluded from preview/production APKs.
    ...(isDevClientBuild
      ? {}
      : notLinked([
          'expo-dev-client',
          'expo-dev-launcher',
          'expo-dev-menu',
          'expo-dev-menu-interface',
        ])),
    // Installed only as peers of expo-router's drawer layout, which this app
    // does not use; no bundled JS imports them (checked against the release
    // bundle's source map). Linking them adds ~2 MB of native code to the APK.
    // Remove an entry here before using a drawer, JS stack, or reanimated.
    ...notLinked([
      'react-native-reanimated',
      'react-native-worklets',
      'react-native-gesture-handler',
    ]),
  },
};
