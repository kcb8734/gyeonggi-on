import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const { copyLauncherIcons } = require('./withAndroidLauncherIcon.js') as {
  copyLauncherIcons: (projectRoot: string) => number;
};
const dir = dirname(fileURLToPath(import.meta.url));
const appJson = JSON.parse(readFileSync(join(dir, '..', 'app.json'), 'utf8')) as {
  expo: { plugins: unknown[]; android: { versionCode: number }; version: string };
};

test('app.json keeps the launcher overwrite plugin', () => {
  assert.ok(appJson.expo.plugins.includes('./plugins/withAndroidLauncherIcon'));
  assert.equal(appJson.expo.version, '1.0.13');
  assert.equal(appJson.expo.android.versionCode, 14);
});

test('copyLauncherIcons creates mipmap folders and drops stale webp', () => {
  const root = mkdtempSync(join(tmpdir(), 'launcher-'));
  mkdirSync(join(root, 'assets', 'launcher', 'mipmap-xxxhdpi'), { recursive: true });
  writeFileSync(join(root, 'assets', 'launcher', 'mipmap-xxxhdpi', 'ic_launcher.png'), 'png');
  const dest = join(root, 'android', 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi');
  mkdirSync(dest, { recursive: true });
  writeFileSync(join(dest, 'ic_launcher.webp'), 'old');
  const copied = copyLauncherIcons(root);
  assert.ok(copied >= 1);
  assert.equal(readFileSync(join(dest, 'ic_launcher.png'), 'utf8'), 'png');
  assert.equal(existsSync(join(dest, 'ic_launcher.webp')), false);
});
