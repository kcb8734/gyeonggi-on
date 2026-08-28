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
  assert.doesNotMatch(source, /platforms;android-34/);
  assert.doesNotMatch(source, /build-tools;34\.0\.0/);
});
