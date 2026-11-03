import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { ResolvedRelease } from '../lib/githubReleases';

const LINKS = [
  { href: '#download', label: 'Download' },
  { href: '#features', label: 'Features' },
  { href: '#install', label: 'Install' },
  { href: '#faq', label: 'FAQ' },
];

type Props = { release: ResolvedRelease };

export function Header({ release }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            className="h-9 w-9 rounded-xl object-cover shadow-lg shadow-brand/30"
          />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            {release.shortName}
            <span className="ml-1.5 text-sm font-medium text-white/50">CRM</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#download"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-muted"
          >
            Get the app
          </a>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-ink px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
