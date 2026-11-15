#!/usr/bin/env node
/**
 * One-time: copy the default EAS Android keystore into credentials/android/
 * for local Gradle AAB/APK builds. Does not print secrets.
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const exportDir = join(appDir, '.keystore-export');
const credDir = join(appDir, 'credentials', 'android');

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

if (!existsSync(exportDir)) {
  fail('Run `pnpm keystore:download` first.');
}

// Prefer the current default used by EAS production: "Play upload key 2026-11-12"
const files = readdirSync(exportDir);
const preferred = files.find(
  (f) => f.includes('com_salesfast_crm__Play upload key') && f.endsWith('.jks')
);
const fallback = files.find(
  (f) => f.startsWith('com_salesfast_crm__') && f.endsWith('.jks')
);
const jksName = preferred || fallback;
if (!jksName) fail('No com.salesfast.crm .jks found in .keystore-export/');

const base = jksName.replace(/\.jks$/i, '');
const txtName = files.find((f) => f === `${base}.txt` || f.startsWith(base) && f.endsWith('.txt'));
// download script writes passwords into REPORT or sibling .txt — check both patterns
let metaPath = join(exportDir, `${base}.txt`);
if (!existsSync(metaPath)) {
  const alt = files.find((f) => f.includes('Play upload key') && f.endsWith('.txt'));
  if (alt) metaPath = join(exportDir, alt);
}

// Parsers for the download script output format
function parseMeta(text) {
  const get = (key) => {
    const m = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'mi'));
    return m ? m[1].trim() : '';
  };
  return {
    keystorePassword: get('keystorePassword') || get('storePassword'),
    keyPassword: get('keyPassword'),
    keyAlias: get('keyAlias') || get('alias'),
  };
}

if (!existsSync(metaPath)) {
  // Fallback: JSON sidecars if present
  const jsonName = files.find((f) => f.includes('Play upload key') && f.endsWith('.json'));
  if (!jsonName) {
    fail(
      `Could not find password file for ${jksName}. Open .keystore-export/ and fill keystore.properties manually.`
    );
  }
  const json = JSON.parse(readFileSync(join(exportDir, jsonName), 'utf8'));
  mkdirSync(credDir, { recursive: true });
  copyFileSync(join(exportDir, jksName), join(credDir, 'upload-keystore.jks'));
  writeFileSync(
    join(credDir, 'keystore.properties'),
    [
      'storeFile=../credentials/android/upload-keystore.jks',
      `storePassword=${json.keystorePassword}`,
      `keyAlias=${json.keyAlias}`,
      `keyPassword=${json.keyPassword}`,
      '',
    ].join('\n'),
    { mode: 0o600 }
  );
  console.log(`✔ Copied ${jksName}`);
  console.log('✔ Wrote credentials/android/keystore.properties (gitignored)');
  process.exit(0);
}

const meta = parseMeta(readFileSync(metaPath, 'utf8'));
if (!meta.keystorePassword || !meta.keyAlias || !meta.keyPassword) {
  fail(`Could not parse passwords from ${metaPath}. Fill keystore.properties manually from that file.`);
}

mkdirSync(credDir, { recursive: true });
copyFileSync(join(exportDir, jksName), join(credDir, 'upload-keystore.jks'));
writeFileSync(
  join(credDir, 'keystore.properties'),
  [
    'storeFile=../credentials/android/upload-keystore.jks',
    `storePassword=${meta.keystorePassword}`,
    `keyAlias=${meta.keyAlias}`,
    `keyPassword=${meta.keyPassword}`,
    '',
  ].join('\n'),
  { mode: 0o600 }
);

console.log(`✔ Copied ${jksName} → credentials/android/upload-keystore.jks`);
console.log('✔ Wrote credentials/android/keystore.properties (gitignored)');
console.log('\nNext: pnpm build-aab\n');
