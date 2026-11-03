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

export type ResolvedRelease = AppReleaseConfig & {
  /** Where the version metadata came from. */
  source: 'github' | 'fallback';
  /** Optional GitHub release page URL. */
  releasePageUrl?: string;
  /** Human-readable status when download is blocked. */
  unavailableReason?: string;
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

/** Prefer a production-looking APK asset; never pick debug builds. */
function pickApkAsset(assets: GitHubAsset[]): GitHubAsset | undefined {
  const apks = assets.filter(
    (a) =>
      a.state === 'uploaded' &&
      a.name.toLowerCase().endsWith('.apk') &&
      !/debug/i.test(a.name),
  );
  if (apks.length === 0) return undefined;

  const preferred = apks.find((a) =>
    /SalesFast-CRM/i.test(a.name),
  );
  return preferred ?? apks[0];
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

function fallbackUnavailable(reason: string): ResolvedRelease {
  return {
    ...appConfig,
    source: 'fallback',
    available: false,
    unavailableReason: reason,
  };
}

/**
 * Resolve the latest stable release from GitHub's public API.
 * Falls back to static `appConfig` on any error or when no APK asset exists.
 */
export async function fetchLatestRelease(
  signal?: AbortSignal,
): Promise<ResolvedRelease> {
  // If the static config already marks a release available with a URL,
  // still try GitHub first so the site stays current.
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
        'No public GitHub Release has been published yet. Check back soon.',
      );
    }

    if (!res.ok) {
      if (appConfig.available && appConfig.apkDownloadUrl) {
        return { ...appConfig, source: 'fallback' };
      }
      return fallbackUnavailable(
        `Could not reach GitHub Releases (HTTP ${res.status}). Try again later.`,
      );
    }

    const release = (await res.json()) as GitHubRelease;

    if (release.draft || release.prerelease) {
      return fallbackUnavailable(
        'The latest GitHub Release is marked as draft or pre-release.',
      );
    }

    const apk = pickApkAsset(release.assets ?? []);
    if (!apk) {
      return fallbackUnavailable(
        'A GitHub Release exists, but no production APK asset was found.',
      );
    }

    if (!apk.browser_download_url.startsWith('https://')) {
      return fallbackUnavailable(
        'APK download URL must use HTTPS from GitHub Releases.',
      );
    }

    const version =
      parseVersionFromTag(release.tag_name) ||
      appConfig.version ||
      release.tag_name;

    return {
      ...appConfig,
      source: 'github',
      available: true,
      version,
      versionCode: appConfig.versionCode,
      apkDownloadUrl: apk.browser_download_url,
      apkFileSize: formatBytes(apk.size),
      releaseDate: formatIsoDate(release.published_at),
      releaseNotes:
        parseReleaseNotes(release.body).length > 0
          ? parseReleaseNotes(release.body)
          : appConfig.releaseNotes,
      releasePageUrl: release.html_url,
    };
  } catch (err) {
    if (signal?.aborted) {
      return fallbackUnavailable('Release lookup was cancelled.');
    }

    if (appConfig.available && appConfig.apkDownloadUrl.startsWith('https://')) {
      return { ...appConfig, source: 'fallback' };
    }

    const message =
      err instanceof Error ? err.message : 'Unknown network error';
    return fallbackUnavailable(
      `Unable to load the latest release from GitHub (${GITHUB_OWNER}/${GITHUB_REPO}): ${message}`,
    );
  }
}
