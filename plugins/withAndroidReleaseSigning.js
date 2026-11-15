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

    // Insert release signingConfig before the debug config (do not touch buildTypes yet).
    if (!contents.includes('signingConfigs {\n        release') &&
        !contents.includes('signingConfigs {\r\n        release')) {
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
    }

    // Only rewrite signingConfig inside buildTypes.release (not signingConfigs.release
    // and not buildTypes.debug — a naive /release\{.../ regex matches the wrong block).
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?\bdebug\s*\{[\s\S]*?\}\s*\brelease\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig salesfastKeystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withAndroidReleaseSigning;
