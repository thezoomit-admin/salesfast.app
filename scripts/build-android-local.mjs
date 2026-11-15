#!/usr/bin/env node
/**
 * Local Android store builds (no EAS cloud).
 *
 *   node scripts/build-android-local.mjs aab
 *   node scripts/build-android-local.mjs apk
 *
 * Output → release/salesfast-crm-v{version}-{versionCode}.{aab|apk}
 *
 * Requires once:
 *   credentials/android/upload-keystore.jks
 *   credentials/android/keystore.properties
 *   google-services.json (project root)
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const credDir = join(appDir, 'credentials', 'android');
const releaseDir = join(appDir, 'release');
const versionCodeFile = join(credDir, 'versionCode');
const PROD_API = 'https://salesfastapi.thezoomit.com/api';
/** Windows NDK+CMake break when ANDROID_HOME has spaces (CLANG_~1 drops libc++). */
const ANDROID_SDK_NOSPACE = 'C:\\AndroidSdk';

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

const resolveAndroidSdkEnv = () => {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
  if (process.platform === 'win32' && (home.includes(' ') || existsSync(ANDROID_SDK_NOSPACE))) {
    if (!existsSync(ANDROID_SDK_NOSPACE)) {
      fail(
        [
          `Android SDK path has a space ("${home}"), which breaks local C++ linking on Windows.`,
          '',
          'One-time fix (Admin not required):',
          `  cmd /c mklink /J ${ANDROID_SDK_NOSPACE} "${home}"`,
          '',
          'Then re-run pnpm build-aab',
        ].join('\n')
      );
    }
    console.log(`✔ ANDROID_HOME → ${ANDROID_SDK_NOSPACE} (avoid path spaces)`);
    return {
      ANDROID_HOME: ANDROID_SDK_NOSPACE,
      ANDROID_SDK_ROOT: ANDROID_SDK_NOSPACE,
    };
  }
  return {};
};

const writeLocalProperties = (sdkEnv) => {
  const sdk = sdkEnv.ANDROID_HOME || process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) return;
  const ndkRoot = join(sdk, 'ndk');
  let ndkDir = '';
  if (existsSync(ndkRoot)) {
    const versions = readdirSync(ndkRoot).filter((n) => existsSync(join(ndkRoot, n, 'source.properties')));
    versions.sort();
    if (versions.length) ndkDir = join(ndkRoot, versions[versions.length - 1]);
  }
  const escape = (p) => p.replace(/\\/g, '\\\\');
  const lines = [`sdk.dir=${escape(sdk)}`];
  if (ndkDir) lines.push(`ndk.dir=${escape(ndkDir)}`);
  writeFileSync(join(appDir, 'android', 'local.properties'), lines.join('\n') + '\n');
};

const run = (cmd, args, opts = {}) => {
  const line = [cmd, ...args].join(' ');
  console.log(`\n$ ${line}`);
  const { status } = spawnSync(line, {
    cwd: opts.cwd ?? appDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...opts.env },
  });
  if (status !== 0) fail(`${cmd} exited with code ${status}`);
};

const kind = (process.argv[2] || '').toLowerCase();
if (kind !== 'aab' && kind !== 'apk' && kind !== 'aad') {
  fail('Usage: node scripts/build-android-local.mjs <aab|apk>');
}
const artifact = kind === 'aad' ? 'aab' : kind;

const keystoreProps = join(credDir, 'keystore.properties');
const keystoreJks = join(credDir, 'upload-keystore.jks');
if (!existsSync(keystoreProps) || !existsSync(keystoreJks)) {
  fail(
    [
      'Play upload keystore missing. One-time setup:',
      '',
      '  1) pnpm keystore:download',
      '  2) Copy the matching .jks to credentials/android/upload-keystore.jks',
      '  3) Fill credentials/android/keystore.properties (see .example)',
      '',
      'Without this, Play Store will reject the upload (wrong signing key).',
    ].join('\n')
  );
}

if (!existsSync(join(appDir, 'google-services.json'))) {
  fail('google-services.json missing at salesfast.app/ (needed for FCM / Play builds).');
}

// Read app version from package.json (kept in sync with app.config version).
const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'));
const versionName = pkg.version;
if (!versionName) fail('package.json version is missing');

// Auto-bump local versionCode (Play requires each upload to be higher).
// Override: ANDROID_VERSION_CODE=7 pnpm build-aab
mkdirSync(credDir, { recursive: true });
let versionCode = 7;
if (process.env.ANDROID_VERSION_CODE && Number(process.env.ANDROID_VERSION_CODE) > 0) {
  versionCode = Number(process.env.ANDROID_VERSION_CODE);
} else if (existsSync(versionCodeFile)) {
  const n = Number(readFileSync(versionCodeFile, 'utf8').trim());
  if (Number.isFinite(n) && n > 0) versionCode = n + 1;
}
writeFileSync(versionCodeFile, String(versionCode) + '\n');
console.log(`✔ versionName ${versionName}  versionCode ${versionCode}`);
console.log(`✔ API ${PROD_API}`);

const sdkEnv = resolveAndroidSdkEnv();
const env = {
  EXPO_PUBLIC_API_URL: PROD_API,
  ANDROID_VERSION_CODE: String(versionCode),
  ...sdkEnv,
};

if (!process.argv.includes('--skip-typecheck')) {
  run('npx', ['tsc', '--noEmit'], { env });
}

const skipPrebuild = process.argv.includes('--skip-prebuild');
const clean = process.argv.includes('--clean');
if (!skipPrebuild) {
  const prebuildArgs = ['expo', 'prebuild', '--platform', 'android'];
  if (clean || !existsSync(join(appDir, 'android'))) prebuildArgs.push('--clean');
  run('npx', prebuildArgs, { env });
}

writeLocalProperties(sdkEnv);

// Keep version in sync even when skipping prebuild (Play + filename both use this).
const appGradle = join(appDir, 'android', 'app', 'build.gradle');
if (existsSync(appGradle)) {
  let gradle = readFileSync(appGradle, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  // Hard-fail if release still points at debug (common plugin-regex footgun).
  if (/buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig signingConfigs\.debug/.test(gradle)) {
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?\bdebug\s*\{[\s\S]*?\}\s*\brelease\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig salesfastKeystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`
    );
  }
  writeFileSync(appGradle, gradle);
  console.log(`✔ android/app/build.gradle → versionCode ${versionCode}, Play release signing`);
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const task = artifact === 'aab' ? 'bundleRelease' : 'assembleRelease';
// Drop stale CMake dirs that may still embed the spaced SDK path.
run(gradlew, ['clean'], { cwd: join(appDir, 'android'), env });
run(gradlew, [task], { cwd: join(appDir, 'android'), env });

const outRoot =
  artifact === 'aab'
    ? join(appDir, 'android', 'app', 'build', 'outputs', 'bundle', 'release')
    : join(appDir, 'android', 'app', 'build', 'outputs', 'apk', 'release');

if (!existsSync(outRoot)) fail(`Gradle output folder missing: ${outRoot}`);

const built = readdirSync(outRoot).find((f) => f.endsWith(artifact === 'aab' ? '.aab' : '.apk'));
if (!built) fail(`No ${artifact} found in ${outRoot}`);

mkdirSync(releaseDir, { recursive: true });
const destName = `salesfast-crm-v${versionName}-${versionCode}.${artifact}`;
const dest = join(releaseDir, destName);
copyFileSync(join(outRoot, built), dest);

// Fail loud if release still got the debug key (Play rejects it).
const DEBUG_SHA1 = '5E8F16062EA3CD2C4A0D547876BAA6F38CABF625';
const EXPECTED_SHA1 = '2F44F0455B3412FE589142A3C24E1A6AF9851CEA';
const props = readFileSync(keystoreProps, 'utf8');
const getProp = (k) => {
  const m = props.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : '';
};
const keytool = spawnSync(
  'keytool',
  [
    '-list',
    '-printcert',
    '-jarfile',
    dest,
  ],
  { encoding: 'utf8', shell: true }
);
const certOut = `${keytool.stdout || ''}\n${keytool.stderr || ''}`;
const sha1Match = certOut.match(/SHA1:\s*([0-9A-F:]+)/i);
const sha1 = sha1Match ? sha1Match[1].replace(/:/g, '').toUpperCase() : '';
if (sha1 === DEBUG_SHA1) {
  fail(
    `AAB is signed with the DEBUG key (${sha1Match[1]}). Release signing did not apply — fix android/app/build.gradle signingConfig.`
  );
}
if (sha1 && sha1 !== EXPECTED_SHA1) {
  console.warn(`⚠ Signer SHA1 ${sha1Match[1]} (expected Play upload key ${EXPECTED_SHA1.match(/.{2}/g).join(':')})`);
} else if (sha1) {
  console.log(`✔ Signed with Play upload key (${sha1Match[1]})`);
} else {
  // Fallback: keytool -printcert on the upload keystore itself proves credentials exist;
  // jarfile listing can fail on some JDKs for .aab.
  const list = spawnSync(
    'keytool',
    [
      '-list',
      '-v',
      '-keystore',
      keystoreJks,
      '-alias',
      getProp('keyAlias'),
      '-storepass',
      getProp('storePassword'),
    ],
    { encoding: 'utf8', shell: true }
  );
  const listOut = `${list.stdout || ''}\n${list.stderr || ''}`;
  if (!/2F:44:F0:45:5B:34:12:FE:58:91:42:A3:C2:4E:1A:6A:F9:85:1C:EA/i.test(listOut)) {
    fail('Upload keystore SHA1 does not match Play expected key. Re-run pnpm keystore:setup.');
  }
  console.log('✔ Upload keystore matches Play expected SHA1 (AAB cert listing unavailable on this JDK)');
}

console.log(`\n✔ Built ${resolve(dest)}`);
console.log(`  Upload this file to Play Console → Production (or testing track).\n`);
