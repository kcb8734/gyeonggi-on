import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const plugin = require('./withAndroidR8.js') as {
  applyR8GradlePropertiesText: (text: string) => string;
  applyPlayProguardRules: (text: string) => string;
};
const source = readFileSync(join(dir, 'withAndroidR8.js'), 'utf8');

test('release minify and shrink flags are turned on', () => {
  const next = plugin.applyR8GradlePropertiesText(
    'android.enableProguardInReleaseBuilds=false\nandroid.enableShrinkResourcesInReleaseBuilds=false\n',
  );
  assert.match(next, /android\.enableProguardInReleaseBuilds=true/);
  assert.match(next, /android\.enableShrinkResourcesInReleaseBuilds=true/);
  assert.doesNotMatch(next, /=false/);
});

test('proguard keeps React Native and app classes', () => {
  const next = plugin.applyPlayProguardRules('# existing\n');
  assert.match(next, /com\.facebook\.react\.\*\*/);
  assert.match(next, /kr\.gyeonggion\.app\.\*\*/);
  assert.equal(plugin.applyPlayProguardRules(next), next);
});

test('R8 plugin does not call enableEdgeToEdge', () => {
  assert.doesNotMatch(source, /enableEdgeToEdge/);
  assert.doesNotMatch(source, /withMainActivity/);
});
