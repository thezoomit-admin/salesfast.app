/**
 * Non-interactive: download Android keystore(s) from EAS for one or more
 * application ids, write .jks + passwords + PEM for Play upload-key reset.
 *
 * Uses the logged-in eas-cli session (same as `eas whoami`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, '.keystore-export');

const easCliRoot =
  process.env.EAS_CLI_ROOT ||
  path.join(
    process.env.APPDATA || 'C:\\Users\\Ibn Abdullah\\AppData\\Roaming',
    'npm',
    'node_modules',
    'eas-cli'
  );
if (!fs.existsSync(path.join(easCliRoot, 'package.json'))) {
  throw new Error(`eas-cli not found at ${easCliRoot}`);
}
const requireFromEas = createRequire(path.join(easCliRoot, 'package.json'));

const SessionManager = requireFromEas('./build/user/SessionManager.js').default;
const { createGraphqlClient } = requireFromEas(
  './build/commandUtils/context/contextUtils/createGraphqlClient.js'
);
const {
  getAndroidAppCredentialsWithCommonFieldsAsync,
} = requireFromEas('./build/credentials/android/api/GraphqlClient.js');

const ACCOUNT_NAME = 'zoomits-team';
const PROJECT_NAME = 'salesfast';
const PACKAGES = ['com.salesfast.crm', 'com.salesfastcrm'];

const analyticsStub = {
  setActor() {},
  logEvent() {},
};

function safeName(pkg) {
  return pkg.replace(/\./g, '_');
}

function exportPem(jksPath, alias, storePass, keyPass, pemPath) {
  const attempts = [
    ['-exportcert', '-rfc', '-keystore', jksPath, '-alias', alias, '-storepass', storePass, '-keypass', keyPass, '-file', pemPath],
    ['-exportcert', '-rfc', '-keystore', jksPath, '-alias', alias, '-storepass', storePass, '-file', pemPath],
  ];
  for (const args of attempts) {
    const r = spawnSync('keytool', args, { encoding: 'utf8' });
    if (r.status === 0 && fs.existsSync(pemPath)) {
      return { ok: true, stderr: r.stderr || '' };
    }
  }
  // Fallback: try java keytool path
  const r2 = spawnSync(
    'keytool',
    [
      '-exportcert',
      '-rfc',
      '-keystore',
      jksPath,
      '-alias',
      alias,
      '-storepass',
      storePass,
      '-file',
      pemPath,
    ],
    { encoding: 'utf8', shell: true }
  );
  return {
    ok: r2.status === 0 && fs.existsSync(pemPath),
    stderr: (r2.stderr || '') + (r2.stdout || ''),
  };
}

function fingerprints(jksPath, alias, storePass) {
  const r = spawnSync(
    'keytool',
    [
      '-list',
      '-v',
      '-keystore',
      jksPath,
      '-alias',
      alias,
      '-storepass',
      storePass,
    ],
    { encoding: 'utf8', shell: true }
  );
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const sha1 = (out.match(/SHA1:\s*([0-9A-F:]+)/i) || [])[1] || null;
  const sha256 = (out.match(/SHA256:\s*([0-9A-F:]+)/i) || [])[1] || null;
  return { sha1, sha256, raw: out };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const sessionManager = new SessionManager(analyticsStub);
  const loggedIn = await sessionManager.ensureLoggedInAsync({
    nonInteractive: true,
  });
  const actor = loggedIn?.actor ?? loggedIn;
  const authInfo = loggedIn?.authenticationInfo ?? {
    accessToken: sessionManager.getAccessToken(),
    sessionSecret: sessionManager.getSessionSecret(),
  };
  if (!actor) {
    throw new Error('Not logged in to EAS. Run: eas login');
  }

  const graphqlClient = createGraphqlClient(authInfo);
  const AppQuery = requireFromEas('./build/graphql/queries/AppQuery.js').AppQuery;
  const app = await AppQuery.byFullNameAsync(
    graphqlClient,
    `@${ACCOUNT_NAME}/${PROJECT_NAME}`
  );
  const account = app.ownerAccount;
  if (!account?.id) {
    throw new Error('Could not resolve owner account');
  }
  console.log(`Account: @${account.name}`);

  const summary = [];
  const PLAY_EXPECTED = '2F:44:F0:45:5B:34:12:FE:58:91:42:A3:C2:4E:1A:6A:F9:85:1C:EA';

  for (const pkg of PACKAGES) {
    console.log(`\n=== ${pkg} ===`);
    const appCredentials = await getAndroidAppCredentialsWithCommonFieldsAsync(
      graphqlClient,
      {
        account,
        projectName: PROJECT_NAME,
        androidApplicationIdentifier: pkg,
      }
    );
    if (!appCredentials) {
      console.log('No Android app credentials on EAS for this package.');
      summary.push({ pkg, status: 'missing' });
      continue;
    }

    const builds = appCredentials.androidAppBuildCredentialsList || [];
    console.log(`Build credential sets: ${builds.length}`);
    for (const bc of builds) {
      const ks = bc.androidKeystore;
      if (!ks) {
        console.log(`- ${bc.name}: (no keystore)`);
        continue;
      }
      const base = `${safeName(pkg)}__${safeName(bc.name || bc.id)}`;
      const jksPath = path.join(outDir, `${base}.jks`);
      const infoPath = path.join(outDir, `${base}.txt`);
      const pemPath = path.join(outDir, `${base}-upload_certificate.pem`);

      fs.writeFileSync(jksPath, Buffer.from(ks.keystore, 'base64'));
      const fp = fingerprints(jksPath, ks.keyAlias, ks.keystorePassword);
      const pem = exportPem(
        jksPath,
        ks.keyAlias,
        ks.keystorePassword,
        ks.keyPassword,
        pemPath
      );

      const info = [
        `package: ${pkg}`,
        `credentialsName: ${bc.name}`,
        `isDefault: ${bc.isDefault}`,
        `keyAlias: ${ks.keyAlias}`,
        `keystorePassword: ${ks.keystorePassword}`,
        `keyPassword: ${ks.keyPassword}`,
        `sha1: ${fp.sha1 || ks.md5CertificateFingerprint || '(see keytool)'}`,
        `sha1FromEas: ${ks.sha1CertificateFingerprint || ''}`,
        `sha256FromEas: ${ks.sha256CertificateFingerprint || ''}`,
        `jks: ${jksPath}`,
        `pem: ${pem.ok ? pemPath : '(export failed)'}`,
        `matchesPlayExpected(${PLAY_EXPECTED}): ${(fp.sha1 || ks.sha1CertificateFingerprint || '').toUpperCase() === PLAY_EXPECTED}`,
      ].join('\n');
      fs.writeFileSync(infoPath, info + '\n', 'utf8');

      console.log(`- ${bc.name} (default=${bc.isDefault})`);
      console.log(`  SHA1: ${ks.sha1CertificateFingerprint || fp.sha1}`);
      console.log(`  jks:  ${jksPath}`);
      console.log(`  pem:  ${pem.ok ? pemPath : 'FAILED: ' + pem.stderr.slice(0, 200)}`);
      console.log(
        `  Play match: ${(ks.sha1CertificateFingerprint || fp.sha1 || '').toUpperCase() === PLAY_EXPECTED}`
      );

      summary.push({
        pkg,
        name: bc.name,
        isDefault: bc.isDefault,
        sha1: ks.sha1CertificateFingerprint || fp.sha1,
        jksPath,
        pemPath: pem.ok ? pemPath : null,
        matchesPlay: (ks.sha1CertificateFingerprint || fp.sha1 || '').toUpperCase() === PLAY_EXPECTED,
        keystorePassword: ks.keystorePassword,
        keyPassword: ks.keyPassword,
        keyAlias: ks.keyAlias,
      });
    }
  }

  const match = summary.find((s) => s.matchesPlay);
  const current = summary.find(
    (s) => s.pkg === 'com.salesfast.crm' && s.isDefault
  );
  const reportPath = path.join(outDir, 'REPORT.md');
  fs.writeFileSync(
    reportPath,
    [
      '# Android keystore export',
      '',
      `Play expected SHA1: \`${PLAY_EXPECTED}\``,
      '',
      match
        ? `## Found matching keystore\n\n- package: \`${match.pkg}\`\n- credentials: \`${match.name}\`\n- jks: \`${match.jksPath}\`\n- Next: upload this keystore to EAS for \`com.salesfast.crm\` and rebuild.`
        : `## No matching keystore on EAS\n\nUse PEM from current default for Play **Request upload key reset**:\n\n- jks: \`${current?.jksPath || '(none)'}\`\n- pem: \`${current?.pemPath || '(none)'}\`\n- SHA1: \`${current?.sha1 || '(none)'}\``,
      '',
      '## All exports',
      '',
      ...summary.map(
        (s) =>
          `- \`${s.pkg}\` / ${s.name || s.status}: SHA1=${s.sha1 || 'n/a'} match=${s.matchesPlay || false}`
      ),
      '',
      'Files are in `.keystore-export/` (gitignored). Do not commit.',
      '',
    ].join('\n')
  );

  console.log(`\nWrote ${reportPath}`);
  if (match) {
    console.log('RESULT: matching Play keystore FOUND — can re-assign to com.salesfast.crm');
  } else {
    console.log('RESULT: no Play-matching keystore — need upload key reset with current PEM');
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  if (err?.graphQLErrors) console.error(JSON.stringify(err.graphQLErrors, null, 2));
  process.exit(1);
});
