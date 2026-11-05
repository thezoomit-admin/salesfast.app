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

/**
 * An Android build without Firebase still installs and shows the in-app inbox,
 * but it can never get a push token, so no notification reaches the phone.
 * Stop that build on EAS instead of shipping it. Checked only on the build
 * server, where GOOGLE_SERVICES_JSON is available; dev clients may skip push.
 */
if (
  process.env.EAS_BUILD === 'true' &&
  process.env.EAS_BUILD_PLATFORM === 'android' &&
  !isDevClientBuild &&
  !googleServicesFile
) {
  throw new Error(
    'google-services.json is missing, so this APK could not receive push ' +
      'notifications. Add it to salesfast.app/ or set the GOOGLE_SERVICES_JSON ' +
      'EAS file variable (Firebase Android app com.salesfastcrm).'
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Salesfast- CRM',
  slug: 'salesfast',
  version: '1.0.1',
  // Android versionCode / iOS buildNumber — shown on App info.
  // Bump with each store / APK release.
  owner: 'zoomits-team',
  orientation: 'portrait',
  icon: './assets/images/salesfast-app-logo.png',
  scheme: 'salesfast',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.salesfastcrm',
    buildNumber: '3',
  },
  android: {
    package: 'com.salesfastcrm',
    versionCode: 3,
    adaptiveIcon: {
      // Match the orange plate in salesfast-app-logo.png (corners under Android mask).
      backgroundColor: '#F2461C',
      foregroundImage: './assets/images/salesfast-app-logo.png',
      monochromeImage: './assets/images/favicon.png',
    },
    predictiveBackGestureEnabled: false,
    ...(googleServicesFile ? { googleServicesFile } : {}),
    permissions: [
      'READ_CALL_LOG',
      'POST_NOTIFICATIONS',
      'RECORD_AUDIO',
      'MODIFY_AUDIO_SETTINGS',
    ],
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
      'expo-audio',
      {
        microphonePermission:
          'Allow Salesfast to record voice notes for leads.',
        recordAudioAndroid: true,
      },
    ],
    'expo-document-picker',
    [
      'expo-splash-screen',
      {
        image: './assets/images/favicon.png',
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
    ],
    'expo-secure-store',
    [
      // Transparent system nav (edge-to-edge). Don't force a contrast scrim
      // so the brand strip under AppTabBar stays visible (bKash-style).
      'expo-navigation-bar',
      {
        enforceContrast: false,
        style: 'light',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/favicon.png',
        color: '#3A83F7',
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
        process.env.EAS_PROJECT_ID ?? '46fc7cfe-7e09-4e83-8129-1e101cc3ae3f',
    },
  },
});

