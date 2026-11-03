/**
 * SalesFast CRM — download portal configuration
 *
 * Update this file when publishing a new APK to GitHub Releases,
 * OR rely on the live GitHub Releases API (preferred). This file is the
 * static fallback when the API is unavailable / no release exists yet.
 *
 * Do not invent release data. Leave `available: false` until a real
 * APK is published to GitHub Releases.
 */

export const GITHUB_OWNER = 'thezoomit-admin';
export const GITHUB_REPO = 'salesfast.app';

/** Public API endpoint — lists all releases (including prereleases). */
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

export type AppReleaseConfig = {
  appName: string;
  shortName: string;
  packageName: string;
  tagline: string;
  description: string;
  /** Semantic version shown in the UI (e.g. 1.0.0). Empty when unavailable. */
  version: string;
  /** Android versionCode. Null when unavailable. */
  versionCode: number | null;
  /**
   * HTTPS URL to the primary APK on GitHub Releases.
   * Empty string when no release has been published yet.
   */
  apkDownloadUrl: string;
  /** Human-readable APK size (e.g. "42.5 MB"). Empty when unknown. */
  apkFileSize: string;
  /** ISO date (YYYY-MM-DD) or empty when unavailable. */
  releaseDate: string;
  /** Minimum Android version label, e.g. "Android 7.0 (API 24)". */
  minAndroidVersion: string;
  /** Bullet list shown under What's New. */
  releaseNotes: string[];
  /**
   * When false, the download CTA is disabled and an unavailable state is shown.
   * Set to true after any APK exists on GitHub Releases.
   */
  available: boolean;
  supportEmail: string;
  websiteUrl: string;
  features: Array<{
    title: string;
    description: string;
    icon: 'shield' | 'users' | 'phone' | 'sync' | 'bell' | 'chart';
  }>;
};

/**
 * Static fallback. Currently no GitHub Release exists for this repository,
 * so `available` is false and download fields are empty.
 */
export const appConfig: AppReleaseConfig = {
  appName: 'SalesFast CRM',
  shortName: 'SalesFast',
  packageName: 'com.salesfastcrm',
  tagline: 'Field sales, organized.',
  description:
    'The official Android app for SalesFast CRM — manage leads, follow-ups, activities, and automatic call history from your phone.',
  version: '',
  versionCode: null,
  apkDownloadUrl: '',
  apkFileSize: '',
  releaseDate: '',
  // Expo SDK 58 default minSdk (not overridden in app.config.ts).
  minAndroidVersion: 'Android 7.0 (API 24)',
  releaseNotes: [],
  available: false,
  supportEmail: 'admin@thezoomit.com',
  websiteUrl: 'https://thezoomit.com',
  features: [
    {
      title: 'Secure agent login',
      description:
        'Mobile authentication with encrypted SecureStore tokens — accounts are provisioned by your admin.',
      icon: 'shield',
    },
    {
      title: 'Leads & pipeline',
      description:
        'Browse, search, and update leads with statuses, notes, and follow-up tracking on the go.',
      icon: 'users',
    },
    {
      title: 'Call & WhatsApp',
      description:
        'Start calls or WhatsApp chats directly from lead details with one tap.',
      icon: 'phone',
    },
    {
      title: 'Automatic call sync',
      description:
        'Matched device calls sync into lead Call History (requires call-log permission).',
      icon: 'sync',
    },
    {
      title: 'Push notifications',
      description:
        'Stay on top of assignments and follow-ups with timely Android notifications.',
      icon: 'bell',
    },
    {
      title: 'Agent dashboard',
      description:
        'See today’s priorities, activities, and performance signals at a glance.',
      icon: 'chart',
    },
  ],
};
