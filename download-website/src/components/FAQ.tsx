import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ResolvedRelease } from '../lib/githubReleases';

type Item = { q: string; a: string };

function FaqItem({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-ink/8">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-display text-base font-semibold text-ink">
          {item.q}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-ink/40 transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-ink/60">{item.a}</p>
      )}
    </div>
  );
}

type Props = { release: ResolvedRelease };

export function FAQ({ release }: Props) {
  const items: Item[] = [
    {
      q: 'Is this the official SalesFast CRM app?',
      a: `Yes. This page distributes the official Android package (${release.packageName}) built from the SalesFast CRM Expo project and hosted on the project's GitHub Releases.`,
    },
    {
      q: 'Is this available on Google Play?',
      a: 'This download portal distributes a direct APK via GitHub Releases. It does not claim Google Play verification. Use only the HTTPS link from this site or the GitHub Releases page.',
    },
    {
      q: 'Why does Android warn about unknown apps?',
      a: 'Android protects users by warning when an app is installed outside Google Play. That is expected for enterprise sideloading. Grant install permission only for your browser or Files app when installing this official APK — do not disable security globally.',
    },
    {
      q: 'Which Android versions are supported?',
      a: `SalesFast CRM requires ${release.minAndroidVersion} or newer.`,
    },
    {
      q: 'Are debug APKs used for production?',
      a: 'No. Only production-signed APKs should be published to GitHub Releases and linked from this site. Debug builds must never be used for production distribution.',
    },
    {
      q: 'How do I get a login?',
      a: `Agent accounts are created by your organization admin. Contact ${release.supportEmail} if you need access.`,
    },
    {
      q: 'How are updates delivered?',
      a: 'When a new production APK is published to GitHub Releases, this site resolves the latest stable asset automatically. Download the new APK and install over the previous version (same package name).',
    },
  ];

  return (
    <section id="faq" className="scroll-mt-20 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Common questions
          </h2>
        </div>
        <div className="mt-10">
          {items.map((item) => (
            <FaqItem key={item.q} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
