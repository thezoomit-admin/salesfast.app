const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = 'SalesFast-CRM artifact naming';

/**
 * Names Android outputs SalesFast-CRM-v{versionName}.apk / .aab
 * Version comes from app.config.ts → android.defaultConfig.versionName.
 */
function withSalesFastApkName(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) {
      return cfg;
    }

    // AAB + default archive base name (uses versionName from the same defaultConfig)
    if (/versionName\s+"[^"]+"/.test(contents)) {
      contents = contents.replace(
        /versionName\s+"[^"]+"/,
        (match) =>
          `${match}\n        // ${MARKER}\n        setProperty("archivesBaseName", "SalesFast-CRM-v\${versionName}")`,
      );
    }

    contents += `

// ${MARKER}
android.applicationVariants.configureEach { variant ->
    variant.outputs.configureEach { output ->
        def version = variant.versionName ?: "0.0.0"
        output.outputFileName = "SalesFast-CRM-v\${version}.apk"
    }
}
`;

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withSalesFastApkName;
