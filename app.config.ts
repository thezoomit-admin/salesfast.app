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
  name: 'Salesfast- Real estate CRM',
  slug: 'salesfast',
  version: '1.0.0',
  owner: 'ibnabdullah01',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'salesfast',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.salesfastcrm',
  },
  android: {
    package: 'com.salesfastcrm',
    adaptiveIcon: {
      backgroundColor: '#0F3D3E',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
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
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0F3D3E',
      },
    ],
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/images/android-icon-monochrome.png',
        color: '#0F3D3E',
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
          extraProguardRules: [
            '-keep class expo.modules.androidcalllog.** { *; }',
            '-keep class com.facebook.react.** { *; }',
            '-dontwarn com.facebook.react.**',
          ].join('\n'),
        },
      },
    ],
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

