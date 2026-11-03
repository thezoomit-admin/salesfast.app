import type { ResolvedRelease } from '../lib/githubReleases';
import { FeatureIcon } from './IconBadge';

type Props = { release: ResolvedRelease };

export function Features({ release }: Props) {
  return (
    <section id="features" className="scroll-mt-20 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Features
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Built for sales agents in the field
          </h2>
          <p className="mt-3 text-base text-ink/60">
            Everything your team needs to work leads faster — without leaving the
            phone.
          </p>
        </div>

        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {release.features.map((feature, index) => (
            <li
              key={feature.title}
              className="animate-rise"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <FeatureIcon name={feature.icon} className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
