/**
 * Non-interactive: upload FCM V1 Google Service Account key to EAS
 * and assign it to com.salesfastcrm for push notifications.
 *
 * Uses the logged-in eas-cli session (same as `eas whoami`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const keyPath = path.join(projectRoot, 'fcm-service-account.json');

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
  createGoogleServiceAccountKeyAsync,
  createOrGetExistingAndroidAppCredentialsWithBuildCredentialsAsync,
  updateAndroidAppCredentialsAsync,
  getAndroidAppCredentialsWithCommonFieldsAsync,
} = requireFromEas('./build/credentials/android/api/GraphqlClient.js');
const {
  readAndValidateServiceAccountKey,
} = requireFromEas('./build/credentials/android/utils/googleServiceAccountKey.js');

const ACCOUNT_NAME = 'zoomits-team';
const PROJECT_NAME = 'salesfast';
const ANDROID_PACKAGE = 'com.salesfastcrm';

const analyticsStub = {
  setActor() {},
  logEvent() {},
};

async function main() {
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Missing ${keyPath}`);
  }

  const jsonKey = readAndValidateServiceAccountKey(keyPath);
  console.log(
    `Key OK: client_email=${jsonKey.client_email}, project=${jsonKey.project_id || jsonKey.projectIdentifier || '(n/a)'}`
  );

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
    throw new Error('Not logged in to EAS. Run: npx eas login');
  }

  const graphqlClient = createGraphqlClient(authInfo);

  // Prefer the project owner account (credentials live on @zoomits-team/salesfast).
  const AppQuery = requireFromEas('./build/graphql/queries/AppQuery.js').AppQuery;
  const app = await AppQuery.byFullNameAsync(
    graphqlClient,
    `@${ACCOUNT_NAME}/${PROJECT_NAME}`
  );
  const account = app.ownerAccount;
  if (!account?.id) {
    const accounts = actor.accounts ?? [];
    throw new Error(
      `Could not resolve owner account for @${ACCOUNT_NAME}/${PROJECT_NAME}. ` +
        `Actor accounts: ${accounts.map((a) => a.name).join(', ') || '(none)'}`
    );
  }
  console.log(
    `Using account: @${account.name} (actor: ${actor.username || actor.id})`
  );

  const appLookupParams = {
    account,
    projectName: PROJECT_NAME,
    androidApplicationIdentifier: ANDROID_PACKAGE,
  };

  let appCredentials =
    await getAndroidAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams);
  if (!appCredentials) {
    console.log('Creating Android app credentials…');
    appCredentials =
      await createOrGetExistingAndroidAppCredentialsWithBuildCredentialsAsync(
        graphqlClient,
        appLookupParams
      );
  }
  console.log(`AndroidAppCredentials id=${appCredentials.id}`);

  const existing = appCredentials.googleServiceAccountKeyForFcmV1;
  if (existing) {
    console.log(
      `Existing FCM V1 key: clientEmail=${existing.clientEmail}, privateKeyId=${existing.privateKeyIdentifier}`
    );
  }

  console.log('Uploading Google Service Account key…');
  const gsaKey = await createGoogleServiceAccountKeyAsync(
    graphqlClient,
    account,
    jsonKey
  );
  console.log(
    `Uploaded key id=${gsaKey.id}, clientEmail=${gsaKey.clientEmail}, privateKeyId=${gsaKey.privateKeyIdentifier}`
  );

  const updated = await updateAndroidAppCredentialsAsync(graphqlClient, appCredentials, {
    googleServiceAccountKeyForFcmV1Id: gsaKey.id,
  });
  const assigned = updated.googleServiceAccountKeyForFcmV1;
  console.log(
    `Assigned FCM V1 key: clientEmail=${assigned?.clientEmail}, privateKeyId=${assigned?.privateKeyIdentifier}`
  );
  console.log('DONE: FCM V1 service account key is set on EAS.');
}

main().catch((err) => {
  console.error(err?.message || err);
  if (err?.graphQLErrors) console.error(JSON.stringify(err.graphQLErrors, null, 2));
  process.exit(1);
});
