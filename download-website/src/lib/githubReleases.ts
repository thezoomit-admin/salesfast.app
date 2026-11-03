import {
  appConfig,
  GITHUB_OWNER,
  GITHUB_RELEASES_API,
  GITHUB_REPO,
  type AppReleaseConfig,
} from '../config/app';

type GitHubAsset = {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
  state: string;
};

type GitHubRelease = {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  assets: GitHubAsset[];
};

export type ReleaseChannel = 'production' | 'preview' | 'other';

export type ReleaseApkItem = {
  version: string;
  tagName: string;
  title: string;
  channel: ReleaseChannel;
  prerelease: boolean;
  apkDownloadUrl: string;
  apkFileName: string;
  apkFileSize: string;
  releaseDate: string;
  releaseNotes: string[];
  releasePageUrl: string;
};

export type ResolvedRelease = AppReleaseConfig & {
  /** Where the version metadata came from. */
  source: 'github' | 'fallback';
  /** Optional GitHub release page URL. */
  releasePageUrl?: string;
  /** Human-readable status when download is blocked. */
  unavailableReason?: string;
  /** Channel of the primary (latest) APK. */
  channel?: ReleaseChannel;
  /** All published APKs from GitHub Releases (newest first). */
  allReleases?: ReleaseApkItem[];
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function isApkAsset(asset: GitHubAsset): boolean {
  return (
    asset.state === 'uploaded' &&
    asset.name.toLowerCase().endsWith('.apk') &&
    asset.browser_download_url.startsWith('https://')
  );
}

/** Prefer SalesFast-named APK; otherwise first uploaded APK. */
function pickApkAsset(assets: GitHubAsset[]): GitHubAsset | undefined {
  const apks = assets.filter(isApkAsset);
  if (apks.length === 0) return undefined;
  return apks.find((a) => /SalesFast-CRM/i.test(a.name)) ?? apks[0];
}

function detectChannel(
  release: GitHubRelease,
  apkName: string,
): ReleaseChannel {
  const label = `${release.tag_name} ${release.name ?? ''} ${apkName}`;
  if (
    release.prerelease ||
    /preview|dev(elopment)?|staging|internal|beta|rc\b/i.test(label)
  ) {
    return 'preview';
  }
  if (/debug|unsigned/i.test(label)) return 'other';
  return 'production';
}

function parseVersionFromTag(tag: string): string {
  return tag.replace(/^v/i, '').trim();
}

function parseReleaseNotes(body: string | null): string[] {
  if (!body?.trim()) return [];
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s*#\-]+/, '').trim())
    .filter(Boolean)
    .filter((l) => !/^what's new$/i.test(l));
  return lines.slice(0, 8);
}

function toReleaseItem(release: GitHubRelease): ReleaseApkItem | null {
  if (release.draft) return null;
  const apk = pickApkAsset(release.assets ?? []);
  if (!apk) return null;

  const notes = parseReleaseNotes(release.body);
  return {
    version: parseVersionFromTag(release.tag_name) || release.tag_name,
    tagName: release.tag_name,
    title: release.name?.trim() || release.tag_name,
    channel: detectChannel(release, apk.name),
    prerelease: release.prerelease,
    apkDownloadUrl: apk.browser_download_url,
    apkFileName: apk.name,
    apkFileSize: formatBytes(apk.size),
    releaseDate: formatIsoDate(release.published_at),
    releaseNotes: notes,
    releasePageUrl: release.html_url,
  };
}

function fallbackUnavailable(reason: string): ResolvedRelease {
  return {
    ...appConfig,
    source: 'fallback',
    available: false,
    unavailableReason: reason,
    allReleases: [],
  };
}

/**
 * Resolve APKs from GitHub Releases — production, preview, and prereleases.
 * Falls back to static `appConfig` when the API fails.
 */
export async function fetchLatestRelease(
  signal?: AbortSignal,
): Promise<ResolvedRelease> {
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (res.status === 404) {
      return fallbackUnavailable(
        'No GitHub Releases found yet. Publish an APK release to make downloads available.',
      );
    }

    if (!res.ok) {
      if (appConfig.available && appConfig.apkDownloadUrl) {
        return { ...appConfig, source: 'fallback', allReleases: [] };
      }
      return fallbackUnavailable(
        `Could not reach GitHub Releases (HTTP ${res.status}). Try again later.`,
      );
    }

    const payload = (await res.json()) as GitHubRelease[] | GitHubRelease;
    const releases = Array.isArray(payload) ? payload : [payload];
    const allReleases = releases
      .map(toReleaseItem)
      .filter((item): item is ReleaseApkItem => item != null);

    if (allReleases.length === 0) {
      return fallbackUnavailable(
        'GitHub Releases exist, but no APK assets were found yet.',
      );
    }

    const latest = allReleases[0];

    return {
      ...appConfig,
      source: 'github',
      available: true,
      version: latest.version || appConfig.version,
      versionCode: appConfig.versionCode,
      apkDownloadUrl: latest.apkDownloadUrl,
      apkFileSize: latest.apkFileSize,
      releaseDate: latest.releaseDate,
      releaseNotes:
        latest.releaseNotes.length > 0
          ? latest.releaseNotes
          : appConfig.releaseNotes,
      releasePageUrl: latest.releasePageUrl,
      channel: latest.channel,
      allReleases,
    };
  } catch (err) {
    if (signal?.aborted) {
      return fallbackUnavailable('Release lookup was cancelled.');
    }

    if (appConfig.available && appConfig.apkDownloadUrl.startsWith('https://')) {
      return { ...appConfig, source: 'fallback', allReleases: [] };
    }

    const message =
      err instanceof Error ? err.message : 'Unknown network error';
    return fallbackUnavailable(
      `Unable to load releases from GitHub (${GITHUB_OWNER}/${GITHUB_REPO}): ${message}`,
    );
  }
}
