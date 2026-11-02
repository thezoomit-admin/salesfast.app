const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = 'SalesFast-CRM artifact naming';

/**
 * Names Android outputs SalesFast-CRM-v{versionName}.apk / .aab
 * Version comes from app.config.ts → android.defaultConfig.versionName.
 *
 * AGP 8+ / Gradle 9: do not use defaultConfig.archivesBaseName or
 * output.outputFileName — both were removed. Use the base archivesName instead.
 */
function withSalesFastApkName(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) {
      return cfg;
    }

    contents += `

// ${MARKER}
base {
    archivesName = "SalesFast-CRM-v\${android.defaultConfig.versionName}"
}
`;

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withSalesFastApkName;
