import {
  AlertTriangle,
  Calendar,
  Download,
  ExternalLink,
  FileArchive,
  Hash,
  Loader2,
} from 'lucide-react';
import { GITHUB_RELEASES_PAGE } from '../config/app';
import type { ReleaseApkItem, ReleaseChannel, ResolvedRelease } from '../lib/githubReleases';

type Props = {
  release: ResolvedRelease;
  loading: boolean;
};

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-brand/10 p-2 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function channelLabel(channel: ReleaseChannel): string {
  if (channel === 'production') return 'Production';
  if (channel === 'preview') return 'Preview';
  return 'Other';
}

function channelClass(channel: ReleaseChannel): string {
  if (channel === 'production') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (channel === 'preview') return 'bg-amber-50 text-amber-900 ring-amber-200';
  return 'bg-ink/5 text-ink/70 ring-ink/10';
}

function ReleaseCard({ item }: { item: ReleaseApkItem }) {
  return (
    <div className="rounded-2xl border border-ink/8 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-base font-bold text-ink">
              {item.title}
            </h4>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${channelClass(item.channel)}`}
            >
              {channelLabel(item.channel)}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink/50">
            {item.apkFileName}
            {item.apkFileSize ? ` · ${item.apkFileSize}` : ''}
            {item.releaseDate ? ` · ${item.releaseDate}` : ''}
          </p>
        </div>
        <a
          href={item.apkDownloadUrl}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/20 transition hover:bg-brand-muted"
          rel="noopener noreferrer"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>
      {item.releaseNotes.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-ink/6 pt-3">
          {item.releaseNotes.slice(0, 3).map((note) => (
            <li
              key={note}
              className="flex gap-2 text-sm leading-relaxed text-ink/65"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DownloadSection({ release, loading }: Props) {
  const canDownload =
    !loading &&
    release.available &&
    Boolean(release.apkDownloadUrl) &&
    release.apkDownloadUrl.startsWith('https://');

  const allReleases = release.allReleases ?? [];

  return (
    <section id="download" className="relative scroll-mt-20 bg-wash py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Download
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Get the official APK
          </h2>
          <p className="mt-3 text-base text-ink/60">
            Distributed via GitHub Releases over HTTPS. Production and preview
            builds are both listed here when published.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-[0_24px_60px_-28px_rgba(21,32,44,0.35)]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-ink/6 p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-4">
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover"
                />
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">
                    {release.appName}
                  </h3>
                  <p className="text-sm text-ink/50">{release.packageName}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <MetaItem
                  icon={Hash}
                  label="Latest version"
                  value={
                    loading
                      ? 'Loading…'
                      : release.version
                        ? `v${release.version}${
                            release.versionCode != null
                              ? ` (${release.versionCode})`
                              : ''
                          }`
                        : 'Not published'
                  }
                />
                <MetaItem
                  icon={FileArchive}
                  label="APK size"
                  value={
                    loading
                      ? 'Loading…'
                      : release.apkFileSize || 'Unavailable'
                  }
                />
                <MetaItem
                  icon={Calendar}
                  label="Release date"
                  value={
                    loading
                      ? 'Loading…'
                      : release.releaseDate || 'Unavailable'
                  }
                />
                <MetaItem
                  icon={Download}
                  label="Source"
                  value={
                    release.source === 'github'
                      ? 'GitHub Releases (live)'
                      : 'Static fallback'
                  }
                />
              </div>

              <div className="mt-8">
                {loading ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink/10 px-6 py-4 text-sm font-semibold text-ink/50 sm:w-auto"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking latest release…
                  </button>
                ) : canDownload ? (
                  <a
                    href={release.apkDownloadUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-muted sm:w-auto"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Download latest
                    {release.version ? ` · v${release.version}` : ''}
                    {release.channel ? ` (${channelLabel(release.channel)})` : ''}
                  </a>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-semibold text-amber-900">
                          APK not available yet
                        </p>
                        <p className="mt-1 text-sm text-amber-800/80">
                          {release.unavailableReason ||
                            'No APK has been published to GitHub Releases.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <a
                  href={release.releasePageUrl || GITHUB_RELEASES_PAGE}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 transition hover:text-brand"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View GitHub Releases
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {!loading && allReleases.length > 0 && (
                <div className="mt-10">
                  <h4 className="font-display text-lg font-bold text-ink">
                    All builds
                  </h4>
                  <p className="mt-1 text-sm text-ink/50">
                    Every published APK from GitHub Releases.
                  </p>
                  <div className="mt-4 space-y-3">
                    {allReleases.map((item) => (
                      <ReleaseCard key={item.tagName + item.apkFileName} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div id="whats-new" className="bg-ink/[0.02] p-6 sm:p-8">
              <h4 className="font-display text-lg font-bold text-ink">
                What&apos;s new
              </h4>
              {loading ? (
                <p className="mt-4 text-sm text-ink/45">Loading release notes…</p>
              ) : release.releaseNotes.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {release.releaseNotes.map((note) => (
                    <li
                      key={note}
                      className="flex gap-2 text-sm leading-relaxed text-ink/70"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      {note}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-ink/50">
                  Release notes will appear here once an APK is published to
                  GitHub Releases.
                </p>
              )}

              <div className="mt-8 rounded-2xl border border-ink/8 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">
                  Trust &amp; security
                </p>
                <ul className="mt-3 space-y-2 text-sm text-ink/65">
                  <li>HTTPS download from GitHub Releases only</li>
                  <li>Production and preview builds are labeled clearly</li>
                  <li>Not verified by Google Play (sideloaded)</li>
                  <li>Android may show an unknown-source warning — that is expected</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
