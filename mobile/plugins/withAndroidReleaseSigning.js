const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING = `        release {
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
`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    let contents = mod.modResults.contents;
    if (!contents.includes('propsFile = rootProject.file("app/keystore.properties")')) {
      contents = contents.replace(
        /signingConfigs \{\s*debug \{/,
        `signingConfigs {\n${RELEASE_SIGNING}        debug {`,
      );
    }
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    );
    mod.modResults.contents = contents;
    return mod;
  });
};
