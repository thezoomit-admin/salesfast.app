/**
 * Assign the Play-matching keystore (from com.salesfastcrm) as the default
 * build credentials for com.salesfast.crm.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const exportDir = path.join(projectRoot, '.keystore-export');

const easCliRoot =
  process.env.EAS_CLI_ROOT ||
  path.join(
    process.env.APPDATA || 'C:\\Users\\Ibn Abdullah\\AppData\\Roaming',
    'npm',
    'node_modules',
    'eas-cli'
  );
const requireFromEas = createRequire(path.join(easCliRoot, 'package.json'));

const SessionManager = requireFromEas('./build/user/SessionManager.js').default;
const { createGraphqlClient } = requireFromEas(
  './build/commandUtils/context/contextUtils/createGraphqlClient.js'
);
const {
  createKeystoreAsync,
  createAndroidAppBuildCredentialsAsync,
  setDefaultAndroidAppBuildCredentialsAsync,
  getAndroidAppCredentialsWithCommonFieldsAsync,
} = requireFromEas('./build/credentials/android/api/GraphqlClient.js');

const ACCOUNT_NAME = 'zoomits-team';
const PROJECT_NAME = 'salesfast';
const TARGET_PACKAGE = 'com.salesfast.crm';
const SOURCE_PACKAGE = 'com.salesfastcrm';
const PLAY_SHA1 = '2f44f0455b3412fe589142a3c24e1a6af9851cea';

const analyticsStub = { setActor() {}, logEvent() {} };

function normalizeSha1(s) {
  return (s || '').replace(/:/g, '').toLowerCase();
}

async function main() {
  const sessionManager = new SessionManager(analyticsStub);
  const loggedIn = await sessionManager.ensureLoggedInAsync({
    nonInteractive: true,
  });
  const actor = loggedIn?.actor ?? loggedIn;
  const authInfo = loggedIn?.authenticationInfo ?? {
    accessToken: sessionManager.getAccessToken(),
    sessionSecret: sessionManager.getSessionSecret(),
  };
  if (!actor) throw new Error('Not logged in. Run: eas login');

  const graphqlClient = createGraphqlClient(authInfo);
  const AppQuery = requireFromEas('./build/graphql/queries/AppQuery.js').AppQuery;
  const app = await AppQuery.byFullNameAsync(
    graphqlClient,
    `@${ACCOUNT_NAME}/${PROJECT_NAME}`
  );
  const account = app.ownerAccount;

  const sourceCreds = await getAndroidAppCredentialsWithCommonFieldsAsync(
    graphqlClient,
    {
      account,
      projectName: PROJECT_NAME,
      androidApplicationIdentifier: SOURCE_PACKAGE,
    }
  );
  const sourceBc = (sourceCreds?.androidAppBuildCredentialsList || []).find(
    (bc) =>
      bc.isDefault &&
      normalizeSha1(bc.androidKeystore?.sha1CertificateFingerprint) ===
        PLAY_SHA1
  );
  if (!sourceBc?.androidKeystore) {
    throw new Error(
      `Could not find Play-matching keystore on ${SOURCE_PACKAGE}`
    );
  }
  const src = sourceBc.androidKeystore;
  console.log(
    `Source keystore: alias=${src.keyAlias} sha1=${src.sha1CertificateFingerprint}`
  );

  // Prefer local export if present (same bytes); else reuse fields from GraphQL.
  const localJks = path.join(
    exportDir,
    'com_salesfastcrm__Build Credentials HicocLCCCK.jks'
  );
  const base64 = fs.existsSync(localJks)
    ? fs.readFileSync(localJks).toString('base64')
    : src.keystore;

  console.log(`Uploading keystore copy for ${TARGET_PACKAGE}…`);
  const newKs = await createKeystoreAsync(graphqlClient, account, {
    keystore: base64,
    keystorePassword: src.keystorePassword,
    keyAlias: src.keyAlias,
    keyPassword: src.keyPassword,
  });
  console.log(
    `Created keystore id=${newKs.id} sha1=${newKs.sha1CertificateFingerprint}`
  );
  if (normalizeSha1(newKs.sha1CertificateFingerprint) !== PLAY_SHA1) {
    throw new Error(
      `Uploaded keystore SHA1 mismatch: ${newKs.sha1CertificateFingerprint}`
    );
  }

  const name = `Play upload key ${new Date().toISOString().slice(0, 10)}`;
  const bc = await createAndroidAppBuildCredentialsAsync(
    graphqlClient,
    {
      account,
      projectName: PROJECT_NAME,
      androidApplicationIdentifier: TARGET_PACKAGE,
    },
    {
      name,
      isDefault: true,
      androidKeystoreId: newKs.id,
    }
  );
  console.log(`Created build credentials: ${bc.name} id=${bc.id}`);

  const madeDefault = await setDefaultAndroidAppBuildCredentialsAsync(
    graphqlClient,
    bc
  );
  console.log(
    `Default now: ${madeDefault.name} isDefault=${madeDefault.isDefault}`
  );

  const verify = await getAndroidAppCredentialsWithCommonFieldsAsync(
    graphqlClient,
    {
      account,
      projectName: PROJECT_NAME,
      androidApplicationIdentifier: TARGET_PACKAGE,
    }
  );
  const def = (verify?.androidAppBuildCredentialsList || []).find(
    (c) => c.isDefault
  );
  console.log(
    `VERIFY default for ${TARGET_PACKAGE}: ${def?.name} sha1=${def?.androidKeystore?.sha1CertificateFingerprint}`
  );
  if (
    normalizeSha1(def?.androidKeystore?.sha1CertificateFingerprint) !==
    PLAY_SHA1
  ) {
    throw new Error('Default credentials still do not match Play SHA1');
  }
  console.log('DONE: com.salesfast.crm now uses the Play-matching keystore.');
}

main().catch((err) => {
  console.error(err?.message || err);
  if (err?.graphQLErrors) console.error(JSON.stringify(err.graphQLErrors, null, 2));
  process.exit(1);
});
