const STEPS = [
  {
    title: 'Download the APK',
    body: 'Use the official Download button on this page. The file comes from GitHub Releases over HTTPS.',
  },
  {
    title: 'Allow install from this source',
    body: 'Android will ask permission to install from your browser or Files app. This is normal for apps not installed from Google Play — never disable system security permanently.',
  },
  {
    title: 'Open the APK and install',
    body: 'Tap the downloaded file, review the app permissions, then Install. Use only the production build from this site.',
  },
  {
    title: 'Sign in with your agent account',
    body: 'Accounts are provisioned by your SalesFast admin. Contact your administrator if you need access.',
  },
];

export function InstallGuide() {
  return (
    <section id="install" className="scroll-mt-20 bg-wash py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Installation
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Install on Android in four steps
          </h2>
          <p className="mt-3 text-base text-ink/60">
            Sideloading a trusted APK is common for enterprise CRM apps. Follow
            Android prompts carefully — do not bypass security checks.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 lg:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 rounded-3xl bg-white p-6 shadow-[0_18px_40px_-28px_rgba(21,32,44,0.4)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-3xl border border-brand/20 bg-brand/[0.06] p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold text-ink">
            Why Android shows a warning
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/65">
            Google Play Protect warns about apps installed outside the Play Store.
            That does not mean this APK is malicious — it means Android has not
            verified the install through Play. Only download from this official
            page (GitHub Releases). SalesFast CRM is not claiming Google Play
            verification for this distribution channel.
          </p>
        </div>
      </div>
    </section>
  );
}
