const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
  withProjectBuildGradle,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const COMPILE_SDK = 36;
const TARGET_SDK = 36;
const BUILD_TOOLS = '36.0.0';

function setGradleProperty(properties, key, value) {
  const index = properties.findIndex((item) => item.type === 'property' && item.key === key);
  if (index >= 0) {
    properties[index].value = String(value);
    return;
  }
  properties.push({ type: 'property', key, value: String(value) });
}

function upsertPropertyLine(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key.replace(/\./g, '\\.')}=.*$`, 'm');
  if (pattern.test(text)) return text.replace(pattern, line);
  const trimmed = text.replace(/\s*$/, '');
  return `${trimmed}\n${line}\n`;
}

function applySdk36ToGradlePropertiesText(text) {
  let next = text;
  next = upsertPropertyLine(next, 'android.compileSdkVersion', COMPILE_SDK);
  next = upsertPropertyLine(next, 'android.targetSdkVersion', TARGET_SDK);
  next = upsertPropertyLine(next, 'android.buildToolsVersion', BUILD_TOOLS);
  next = upsertPropertyLine(next, 'android.suppressUnsupportedCompileSdk', COMPILE_SDK);
  return next;
}

function applySdk36ToProjectBuildGradle(contents) {
  return contents
    .replace(
      /^([ \t]*)compileSdkVersion\s*=.*$/m,
      `$1compileSdkVersion = Integer.parseInt(findProperty('android.compileSdkVersion') ?: '${COMPILE_SDK}')`
    )
    .replace(
      /^([ \t]*)targetSdkVersion\s*=.*$/m,
      `$1targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '${TARGET_SDK}')`
    )
    .replace(
      /^([ \t]*)buildToolsVersion\s*=.*$/m,
      `$1buildToolsVersion = findProperty('android.buildToolsVersion') ?: '${BUILD_TOOLS}'`
    );
}

function applySdk36ToAppBuildGradle(contents) {
  return contents
    .replace(/compileSdk(?:Version)?\s+\d+/, `compileSdk ${COMPILE_SDK}`)
    .replace(/targetSdk(?:Version)?\s+\d+/, `targetSdkVersion ${TARGET_SDK}`);
}

function applyExpoModulesCoreSdk36Patch(source) {
  return source.replace(
    'return requestedPermissions.contains(permission)',
    'return requestedPermissions?.contains(permission) ?: false',
  );
}

function patchExpoModulesCoreForCompileSdk36(projectRoot) {
  const file = path.join(
    projectRoot,
    'node_modules',
    'expo-modules-core',
    'android/src/main/java/expo/modules/adapters/react/permissions/PermissionsService.kt',
  );
  if (!fs.existsSync(file)) return false;
  const source = fs.readFileSync(file, 'utf8');
  const next = applyExpoModulesCoreSdk36Patch(source);
  if (next === source) return false;
  fs.writeFileSync(file, next);
  return true;
}

function withAndroidSdk36(config) {
  config.android = config.android || {};
  config.android.compileSdkVersion = COMPILE_SDK;
  config.android.targetSdkVersion = TARGET_SDK;

  config = withGradleProperties(config, (cfg) => {
    setGradleProperty(cfg.modResults, 'android.compileSdkVersion', COMPILE_SDK);
    setGradleProperty(cfg.modResults, 'android.targetSdkVersion', TARGET_SDK);
    setGradleProperty(cfg.modResults, 'android.buildToolsVersion', BUILD_TOOLS);
    setGradleProperty(cfg.modResults, 'android.suppressUnsupportedCompileSdk', COMPILE_SDK);
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    cfg.modResults.contents = applySdk36ToProjectBuildGradle(cfg.modResults.contents);
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    cfg.modResults.contents = applySdk36ToAppBuildGradle(cfg.modResults.contents);
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      patchExpoModulesCoreForCompileSdk36(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  return config;
}

module.exports = withAndroidSdk36;
module.exports.COMPILE_SDK = COMPILE_SDK;
module.exports.TARGET_SDK = TARGET_SDK;
module.exports.BUILD_TOOLS = BUILD_TOOLS;
module.exports.applySdk36ToGradlePropertiesText = applySdk36ToGradlePropertiesText;
module.exports.applySdk36ToProjectBuildGradle = applySdk36ToProjectBuildGradle;
module.exports.applySdk36ToAppBuildGradle = applySdk36ToAppBuildGradle;
module.exports.applyExpoModulesCoreSdk36Patch = applyExpoModulesCoreSdk36Patch;
module.exports.patchExpoModulesCoreForCompileSdk36 = patchExpoModulesCoreForCompileSdk36;
