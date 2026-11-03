/**
 * Node resolve hook for `npm test`: resolves the `@/` alias like Metro, and
 * swaps native-only modules for the in-memory stand-ins in ./stubs. Only the
 * boundaries are stubbed (keystore, file system, RN runtime, config); the
 * modules under test run as written.
 */
import { existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const stub = (name) => new URL(`./stubs/${name}.mjs`, import.meta.url).href;

const STUBS = {
  'react-native': stub('react-native'),
  'expo-file-system': stub('expo-file-system'),
  '@/services/secureStorage': stub('secureStorage'),
  '@/features/auth/savedAccounts': stub('savedAccounts'),
  '@/lib/connectivity': stub('connectivity'),
  '@/constants/config': stub('config'),
};

function aliasTarget(specifier) {
  const base = new URL(`src/${specifier.slice(2)}`, root);
  for (const suffix of ['.ts', '.tsx', '/index.ts']) {
    const candidate = new URL(base.href + suffix);
    if (existsSync(candidate)) return candidate.href;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
  if (specifier.startsWith('@/')) {
    const url = aliasTarget(specifier);
    if (url) return { url, shortCircuit: true };
  }
  return next(specifier, context);
}

