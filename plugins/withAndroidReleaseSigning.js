const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = 'SalesFast release signing';

/**
 * Release signing from credentials/android/keystore.properties when present.
 * storeFile in that file is relative to the android/ folder (Gradle rootProject).
 */
function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) {
      return cfg;
    }

    const preamble = `
// ${MARKER}
def salesfastKeystorePropertiesFile = rootProject.file("../credentials/android/keystore.properties")
def salesfastKeystoreProperties = new Properties()
if (salesfastKeystorePropertiesFile.exists()) {
    salesfastKeystoreProperties.load(new FileInputStream(salesfastKeystorePropertiesFile))
}
`;

    contents = contents.replace(/android\s*\{/, `${preamble}\nandroid {`);

    contents = contents.replace(
      /signingConfigs\s*\{\s*debug\s*\{/,
      `signingConfigs {
        release {
            if (salesfastKeystorePropertiesFile.exists()) {
                keyAlias salesfastKeystoreProperties['keyAlias']
                keyPassword salesfastKeystoreProperties['keyPassword']
                storeFile rootProject.file(salesfastKeystoreProperties['storeFile'])
                storePassword salesfastKeystoreProperties['storePassword']
            }
        }
        debug {`
    );

    contents = contents.replace(
      /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig salesfastKeystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withAndroidReleaseSigning;
