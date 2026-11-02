const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const MARKER = 'SalesFast release size: locale filter';

/**
 * Android release-size settings that expo-build-properties has no option for.
 *
 * - Fresco GIF / WebP decoders: the app only ships PNGs and loads no remote
 *   images, so the extra native decoders (~0.5 MB) are dead weight.
 * - Locale filter: the UI is English-only; AndroidX / Play Services otherwise
 *   ship translations for ~80 locales in resources.arsc. Add a locale here if
 *   the app gets translated.
 */
function withAndroidReleaseSize(config) {
  config = withGradleProperties(config, (cfg) => {
    const set = (key, value) => {
      const existing = cfg.modResults.find(
        (item) => item.type === 'property' && item.key === key
      );
      if (existing) existing.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    };
    set('expo.gif.enabled', 'false');
    set('expo.webp.enabled', 'false');
    set('expo.webp.animated', 'false');
    return cfg;
  });

  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes(MARKER)) return cfg;
    cfg.modResults.contents += `

// ${MARKER}
android {
    androidResources {
        localeFilters += ["en"]
    }
}
`;
    return cfg;
  });
}

module.exports = withAndroidReleaseSize;
