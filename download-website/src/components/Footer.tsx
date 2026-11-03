import { Mail } from 'lucide-react';
import { GITHUB_RELEASES_PAGE } from '../config/app';
import type { ResolvedRelease } from '../lib/githubReleases';

type Props = { release: ResolvedRelease };

export function Footer({ release }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt=""
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="font-display text-lg font-semibold">
              {release.appName}
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
            Official Android download portal. APKs are hosted on GitHub Releases
            — never from third-party mirror sites.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
            Product
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>
              <a href="#download" className="hover:text-white">
                Download APK
              </a>
            </li>
            <li>
              <a href="#install" className="hover:text-white">
                Installation guide
              </a>
            </li>
            <li>
              <a
                href={GITHUB_RELEASES_PAGE}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                GitHub Releases
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
            Support
          </p>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>
              <a
                href={`mailto:${release.supportEmail}`}
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <Mail className="h-4 w-4" />
                {release.supportEmail}
              </a>
            </li>
            <li>
              <a
                href={release.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                {release.websiteUrl.replace(/^https?:\/\//, '')}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {year} {release.shortName}. All rights reserved.
          </p>
          <p>Package ID · {release.packageName}</p>
        </div>
      </div>
    </footer>
  );
}
