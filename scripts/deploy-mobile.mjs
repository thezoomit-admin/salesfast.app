#!/usr/bin/env node
// Usage: node scripts/deploy-mobile.mjs <profile> [platform] [--skip-typecheck] [...extra eas build args]
//
// Checks the API URL baked into the eas.json profile, typechecks, then starts an EAS cloud build.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');

// Profiles that must point at the prod API; everything else must point at dev.
const PROD_API_HOST = 'salesfastapi.thezoomit.com';
const DEV_API_HOST = 'salesfastapi-dev.thezoomit.com';
const PROD_PROFILES = new Set(['production', 'production-apk']);

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

// Single command string + shell so Windows resolves npx.cmd / eas.cmd (passing an args array with shell is deprecated).
const run = (cmd, args) => {
  const line = [cmd, ...args].join(' ');
  console.log(`\n$ ${line}`);
  const { status } = spawnSync(line, { cwd: appDir, stdio: 'inherit', shell: true });
  if (status !== 0) fail(`${cmd} exited with code ${status}`);
};

const [profile, ...rest] = process.argv.slice(2);
const platform = rest[0] && !rest[0].startsWith('-') ? rest.shift() : 'android';
const skipTypecheck = rest.includes('--skip-typecheck');
const extraArgs = rest.filter((a) => a !== '--skip-typecheck');

if (!profile) fail('Usage: node scripts/deploy-mobile.mjs <profile> [platform]');

const eas = JSON.parse(readFileSync(join(appDir, 'eas.json'), 'utf8'));
const buildProfile = eas.build?.[profile];
if (!buildProfile) fail(`Unknown EAS profile "${profile}". Available: ${Object.keys(eas.build ?? {}).join(', ')}`);

// 1. API URL sanity check — a preview build hitting prod (or vice versa) is the mistake this guards against.
const apiUrl = buildProfile.env?.EXPO_PUBLIC_API_URL;
if (!apiUrl) fail(`eas.json build.${profile}.env.EXPO_PUBLIC_API_URL is not set`);

let host;
try {
  const url = new URL(apiUrl);
  if (url.protocol !== 'https:') fail(`API URL must be https: ${apiUrl}`);
  host = url.host;
} catch {
  fail(`API URL is not a valid URL: ${apiUrl}`);
}

const expectedHost = PROD_PROFILES.has(profile) ? PROD_API_HOST : DEV_API_HOST;
if (host !== expectedHost) fail(`Profile "${profile}" should use ${expectedHost}, but eas.json has ${apiUrl}`);

console.log(`✔ ${profile} → ${apiUrl}`);

// Reachability is only a warning: the backend may legitimately be deployed after the app build starts.
try {
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
  console.log(`✔ API reachable (HTTP ${res.status})`);
} catch (err) {
  console.warn(`⚠ API not reachable right now (${err.cause?.code ?? err.name}) — continuing`);
}

// 2. Typecheck locally so a broken build doesn't burn cloud build minutes.
if (!skipTypecheck) run('npx', ['tsc', '--noEmit']);

// 3. Cloud build.
run('eas', ['build', '--platform', platform, '--profile', profile, ...extraArgs]);
