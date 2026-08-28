import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const plugin = require('./withAndroidSdk36.js') as {
  applySdk36ToGradlePropertiesText: (text: string) => string;
  applySdk36ToProjectBuildGradle: (text: string) => string;
  applySdk36ToAppBuildGradle: (text: string) => string;
};
const appJson = JSON.parse(readFileSync(join(dir, '..', 'app.json'), 'utf8')) as {
  expo: { android: { compileSdkVersion: number; targetSdkVersion: number }; plugins: unknown[] };
};

test('app.json pins compile and target SDK 36', () => {
  assert.equal(appJson.expo.android.compileSdkVersion, 36);
  assert.equal(appJson.expo.android.targetSdkVersion, 36);
  assert.ok(appJson.expo.plugins.includes('./plugins/withAndroidSdk36'));
});

test('gradle.properties fallbacks become 36', () => {
  const next = plugin.applySdk36ToGradlePropertiesText(
    'android.compileSdkVersion=34\nandroid.targetSdkVersion=34\nandroid.buildToolsVersion=34.0.0\n',
  );
  assert.match(next, /android\.compileSdkVersion=36/);
  assert.match(next, /android\.targetSdkVersion=36/);
  assert.match(next, /android\.buildToolsVersion=36\.0\.0/);
});

test('project build.gradle default SDK versions become 36', () => {
  const next = plugin.applySdk36ToProjectBuildGradle(`
    compileSdkVersion = Integer.parseInt(findProperty('android.compileSdkVersion') ?: '34')
    targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '34')
    buildToolsVersion = findProperty('android.buildToolsVersion') ?: '34.0.0'
  `);
  assert.match(next, /compileSdkVersion'\) \?: '36'/);
  assert.match(next, /targetSdkVersion'\) \?: '36'/);
  assert.match(next, /buildToolsVersion'\) \?: '36\.0\.0'/);
});

test('app build.gradle literal SDK versions become 36', () => {
  const next = plugin.applySdk36ToAppBuildGradle(`
    compileSdk 34
    targetSdkVersion 34
  `);
  assert.match(next, /compileSdk 36/);
  assert.match(next, /targetSdkVersion 36/);
});
