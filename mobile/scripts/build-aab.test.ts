import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'build-aab.cjs'), 'utf8');

test('build:aab script prints gradle and dist AAB paths', () => {
  assert.match(source, /android\/app\/build\/outputs\/bundle\/release\/app-release\.aab/);
  assert.match(source, /dist\/android\/app-release\.aab/);
  assert.match(source, /ANDROID_KEYSTORE_FILE/);
  assert.match(source, /ensureSplashColor/);
  assert.match(source, /bundleRelease/);
  assert.match(source, /Play Console/);
});

test('build:aab installs Android SDK 36 instead of 34', () => {
  assert.match(source, /platforms;android-\$\{COMPILE_SDK\}/);
  assert.match(source, /build-tools;\$\{BUILD_TOOLS\}/);
  assert.match(source, /ensureSdk36Gradle/);
  assert.match(source, /restoreExpoStartScripts/);
  assert.match(source, /patchExpoModulesCoreForCompileSdk36/);
  assert.match(source, /patchReactNativeScreensKotlinList/);
  assert.doesNotMatch(source, /platforms;android-34/);
  assert.doesNotMatch(source, /build-tools;34\.0\.0/);
});

test('build:aab logs versionName and versionCode from app.json', () => {
  assert.match(source, /versionName=\$\{versionName\}/);
  assert.match(source, /versionCode=\$\{versionCode\}/);
  const appJson = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'app.json'), 'utf8'));
  assert.match(source, /readAabIdentity/);
  assert.match(source, /assertAabIdentity/);
  assert.match(source, /ensureAppVersion/);
  assert.match(source, /ensureLauncherIcons/);
  assert.match(source, /onandon-\$\{versionName\}-vc\$\{versionCode\}\.aab/);
  assert.match(source, /rootAab/);
  assert.equal(appJson.expo.version, '1.0.10');
  assert.equal(appJson.expo.android.versionCode, 11);
  assert.equal(appJson.expo.icon, './assets/icon.png');
  assert.equal(appJson.expo.android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png');
  assert.ok(appJson.expo.android.permissions.includes('INTERNET'));
});
