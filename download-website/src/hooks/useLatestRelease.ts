import { useEffect, useState } from 'react';
import {
  fetchLatestRelease,
  type ResolvedRelease,
} from '../lib/githubReleases';
import { appConfig } from '../config/app';

type ReleaseState = {
  release: ResolvedRelease;
  loading: boolean;
};

const initial: ResolvedRelease = {
  ...appConfig,
  source: 'fallback',
  available: false,
  unavailableReason: 'Checking GitHub Releases…',
};

export function useLatestRelease(): ReleaseState {
  const [state, setState] = useState<ReleaseState>({
    release: initial,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchLatestRelease(controller.signal).then((release) => {
      if (!active) return;
      setState({ release, loading: false });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return state;
}
