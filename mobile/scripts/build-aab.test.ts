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
  assert.match(source, /업로드 키 재설정이 승인된 뒤에만/);
  assert.match(source, /PLAY_UPLOAD_CERT_SHA1/);
  assert.match(source, /30:70:7C:14:A2:AA:1B:AD:06:5C:E7:CC:79:AC:02:BB:9B:D8:2C:42/);
  assert.doesNotMatch(source, /기존 키스토어가 없어 업로드 키를 새로 만듭니다/);
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
  assert.equal(appJson.expo.version, '1.0.6');
  assert.equal(appJson.expo.android.versionCode, 7);
  assert.equal(appJson.expo.icon, './assets/icon.png');
  assert.equal(appJson.expo.android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png');
  assert.ok(appJson.expo.android.permissions.includes('INTERNET'));
});
