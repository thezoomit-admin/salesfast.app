import type { ExpoConfig, ConfigContext } from 'expo/config';
// app.config runs in Node, but the app tsconfig has no @types/node.
// @ts-ignore
import { existsSync } from 'node:fs';

const isDevClientBuild = process.env.EAS_BUILD_PROFILE === 'development';

/**
 * Firebase config for Android push (FCM). On EAS it can come from a
 * file env var (GOOGLE_SERVICES_JSON) so the file never needs to be committed.
 */
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  (existsSync('./google-services.json')
    ? './google-services.json'
    : undefined);

if (
  process.env.EAS_BUILD === 'true' &&
  process.env.EAS_BUILD_PLATFORM === 'android' &&
  !isDevClientBuild &&
  !googleServicesFile
) {
  throw new Error(
    'google-services.json is missing, so this APK could not receive push ' +
      'notifications. Add it to salesfast.app/ or set the GOOGLE_SERVICES_JSON ' +
      'EAS file variable (Firebase Android app com.salesfast.crm).'
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Salesfast- CRM',
  slug: 'salesfast',
  version: '1.0.2',
  owner: 'zoomits-team',
  orientation: 'portrait',
  icon: './assets/images/salesfast-app-logo.png',
  scheme: 'salesfast',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.salesfastcrm',
    buildNumber: '7',
  },
  android: {
    package: 'com.salesfast.crm',
    versionCode: 7,
    adaptiveIcon: {
      backgroundColor: '#3A83F7',
      foregroundImage: './assets/images/salesfast-app-logo.png',
      monochromeImage: './assets/images/favicon.png',
    },
    predictiveBackGestureEnabled: false,
    ...(googleServicesFile ? { googleServicesFile } : {}),
    permissions: [
      'READ_CALL_LOG',
      'READ_PHONE_STATE',
      'READ_CONTACTS',
      'POST_NOTIFICATIONS',
      'RECORD_AUDIO',
      'MODIFY_AUDIO_SETTINGS',
    ],
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
          buildArchs: ['arm64-v8a'],
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          enablePngCrunchInReleaseBuilds: true,
          useLegacyPackaging: true,
          networkInspector: isDevClientBuild,
          extraProguardRules: [
            '-keep class expo.modules.androidcalllog.** { *; }',
            '-keep class expo.modules.swiperefresh.** { *; }',
            '-keepclassmembers class expo.modules.swiperefresh.** { public <init>(...); }',
            '-dontwarn com.facebook.react.**',
          ].join('\n'),
        },
      },
    ],
    './plugins/withAndroidReleaseSize.js',
    './plugins/withSalesFastApkName.js',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL ??
      'https://salesfastapi-dev.thezoomit.com/api',
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ?? '46fc7cfe-7e09-4e83-8129-1e101cc3ae3f',
    },
  },
});
