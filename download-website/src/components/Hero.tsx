import { ArrowDown, Smartphone } from 'lucide-react';
import type { ResolvedRelease } from '../lib/githubReleases';

type Props = {
  release: ResolvedRelease;
  loading: boolean;
};

export function Hero({ release, loading }: Props) {
  return (
    <section
      id="top"
      className="relative isolate min-h-[100svh] overflow-hidden bg-ink text-white"
    >
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-hero-glow opacity-90"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-24 h-[420px] w-[420px] rounded-full bg-brand/20 blur-3xl animate-float"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-10 h-[320px] w-[320px] rounded-full bg-navy-soft/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 pb-16 pt-28 sm:px-6 lg:pb-24">
        <div className="max-w-2xl animate-rise">
          <div className="mb-8 flex items-center gap-4">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt={`${release.appName} logo`}
              className="h-16 w-16 rounded-2xl object-cover shadow-2xl shadow-brand/40 ring-1 ring-white/15 sm:h-20 sm:w-20"
            />
            <div>
              <p className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {release.appName}
              </p>
              <p className="mt-1 text-sm text-white/55">Official Android download</p>
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {release.tagline}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            {release.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#download"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-brand/30 transition hover:bg-brand-muted"
            >
              <Smartphone className="h-4 w-4" />
              Download for Android
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/10"
            >
              Explore features
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/45">
            <span>Package · {release.packageName}</span>
            <span>
              {loading
                ? 'Checking latest release…'
                : release.available && release.version
                  ? `Latest · v${release.version}`
                  : 'Release pending'}
            </span>
            <span>Requires · {release.minAndroidVersion}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
