// Loaded with `node --import ./test/register.mjs --test …` (see package.json).
import { register } from 'node:module';

// Metro defines __DEV__; dev-only code paths (perf logging) stay on in tests.
globalThis.__DEV__ = true;
register('./resolve.mjs', import.meta.url);
