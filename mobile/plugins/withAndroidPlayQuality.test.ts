import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const plugin = require('./withAndroidPlayQuality.js') as {
  applyPlayQualityGradlePropertiesText: (text: string) => string;
  applyEdgeToEdgeMainActivity: (text: string) => string;
  applyPlayProguardRules: (text: string) => string;
  applyEdgeToEdgeStyles: (text: string) => string;
};

test('release minify and shrink flags are turned on', () => {
  const next = plugin.applyPlayQualityGradlePropertiesText(
    'android.enableProguardInReleaseBuilds=false\nandroid.enableShrinkResourcesInReleaseBuilds=false\n',
  );
  assert.match(next, /android\.enableProguardInReleaseBuilds=true/);
  assert.match(next, /android\.enableShrinkResourcesInReleaseBuilds=true/);
  assert.doesNotMatch(next, /=false/);
});

test('MainActivity calls enableEdgeToEdge before super.onCreate', () => {
  const source = `import android.os.Bundle

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }
}
`;
  const next = plugin.applyEdgeToEdgeMainActivity(source);
  assert.match(next, /import androidx\.activity\.enableEdgeToEdge/);
  assert.match(next, /enableEdgeToEdge\(\)\s*\n\s*super\.onCreate\(null\)/);
  assert.equal(plugin.applyEdgeToEdgeMainActivity(next), next);
});

test('proguard keeps React Native and app classes', () => {
  const next = plugin.applyPlayProguardRules('# existing\n');
  assert.match(next, /com\.facebook\.react\.\*\*/);
  assert.match(next, /kr\.gyeonggion\.app\.\*\*/);
  assert.equal(plugin.applyPlayProguardRules(next), next);
});

test('styles request display-cutout edge-to-edge', () => {
  const xml = `<style name="AppTheme">
    <item name="android:statusBarColor">#1E6FEA</item>
  </style>`;
  const next = plugin.applyEdgeToEdgeStyles(xml);
  assert.match(next, /windowLayoutInDisplayCutoutMode">shortEdges/);
  assert.match(next, /windowDrawsSystemBarBackgrounds">true/);
});
