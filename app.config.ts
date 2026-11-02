import { ExpoConfig, ConfigContext } from 'expo/config';

// app.config runs in Node, but the app tsconfig has no @types/node.
declare const require: (id: 'fs') => { existsSync: (path: string) => boolean };
const { existsSync } = require('fs');

const isDevClientBuild = process.env.EAS_BUILD_PROFILE === 'development';

/**
 * Firebase config for Android push (FCM). Download it from the Firebase
 * console (Android app id com.salesfastcrm). On EAS it can come from a
 * file env var (GOOGLE_SERVICES_JSON) so the file never needs to be committed.
 */
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  // Expo evaluates app config with the project root as cwd.
  (existsSync('./google-services.json')
    ? './google-services.json'
    : undefined);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Salesfast- CRM',
  slug: 'salesfast',
  version: '1.0.0',
  // Android versionCode / iOS buildNumber — shown on App info.
  // Bump with each store / APK release.
  owner: 'ibnabdullah01',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'salesfast',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.salesfastcrm',
    buildNumber: '1',
  },
  android: {
    package: 'com.salesfastcrm',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      // Status-bar / themed icon — Salesfast mark on black plate.
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    ...(googleServicesFile ? { googleServicesFile } : {}),
    permissions: ['READ_CALL_LOG', 'POST_NOTIFICATIONS'],
    // Dev API is http:// — required for device → local backend.
    // Expo Android typings omit this field on some SDK versions.
    ...({ usesCleartextTraffic: true } as object),
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
    ],
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/images/android-icon-monochrome.png',
        color: '#F2461C',
        defaultChannel: 'default',
      },
    ],
    ...(isDevClientBuild ? (['expo-dev-client'] as const) : []),
    [
      'expo-build-properties',
      {
        android: {
          // Keep APK small: one ABI + R8 + resource shrink + compress native libs
          buildArchs: ['arm64-v8a'],
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          enablePngCrunchInReleaseBuilds: true,
          useLegacyPackaging: true,
          // Network inspector is a dev-client debugging aid only.
          networkInspector: isDevClientBuild,
          // React Native ships its own consumer R8 rules; a blanket keep on
          // com.facebook.react.** stopped R8 from shrinking the whole RN layer.
          extraProguardRules: [
            '-keep class expo.modules.androidcalllog.** { *; }',
            '-dontwarn com.facebook.react.**',
          ].join('\n'),
        },
      },
    ],
    // No GIF/WebP decoders, English-only resources (see plugin).
    './plugins/withAndroidReleaseSize.js',
    // APK/AAB → SalesFast-CRM-v{version}.apk (version from app.config.ts)
    './plugins/withSalesFastApkName.js',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Installed APKs (EAS) use staging. Local Expo Go can override via .env.
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL ??
      'https://salesfastapi-dev.thezoomit.com/api',
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ?? '37dc35d5-a2b1-476e-bb6c-721668bc7473',
    },
  },
});

