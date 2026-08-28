const { withAppBuildGradle } = require('@expo/config-plugins');

const SIGNING_SNIPPET = `
    signingConfigs {
        release {
            def propsFile = rootProject.file("app/keystore.properties")
            def props = new Properties()
            if (propsFile.exists()) {
                propsFile.withInputStream { props.load(it) }
                storeFile file(props['storeFile'])
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            }
        }
    }
`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    let contents = mod.modResults.contents;
    if (!contents.includes('signingConfigs')) {
      contents = contents.replace(/android\s*\{/, (match) => `${match}\n${SIGNING_SNIPPET}`);
    }
    if (!contents.includes('signingConfig signingConfigs.release')) {
      contents = contents.replace(
        /release\s*\{/,
        (match) => `${match}\n            signingConfig signingConfigs.release`,
      );
    }
    mod.modResults.contents = contents;
    return mod;
  });
};
