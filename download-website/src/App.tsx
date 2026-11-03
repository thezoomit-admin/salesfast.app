import { DownloadSection } from './components/DownloadSection';
import { FAQ } from './components/FAQ';
import { Features } from './components/Features';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { InstallGuide } from './components/InstallGuide';
import { useLatestRelease } from './hooks/useLatestRelease';

export default function App() {
  const { release, loading } = useLatestRelease();

  return (
    <div className="min-h-svh bg-wash text-ink antialiased">
      <Header release={release} />
      <main>
        <Hero release={release} loading={loading} />
        <DownloadSection release={release} loading={loading} />
        <Features release={release} />
        <InstallGuide />
        <FAQ release={release} />
      </main>
      <Footer release={release} />
    </div>
  );
}
