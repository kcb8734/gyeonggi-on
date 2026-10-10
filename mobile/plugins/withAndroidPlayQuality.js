const { withDangerousMod, withGradleProperties, withMainActivity } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MINIFY_PROPS = {
  'android.enableProguardInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

const EXTRA_PROGUARD = `
# Play DEX 최적화 (R8)
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class expo.modules.** { *; }
-keep class kr.gyeonggion.app.** { *; }
-dontwarn expo.modules.**
-dontwarn com.facebook.react.**
`;

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

function applyPlayQualityGradlePropertiesText(text) {
  let next = text;
  for (const [key, value] of Object.entries(MINIFY_PROPS)) {
    next = upsertPropertyLine(next, key, value);
  }
  return next;
}

function applyEdgeToEdgeMainActivity(source) {
  let next = source;
  if (!next.includes('androidx.activity.enableEdgeToEdge')) {
    next = next.replace(
      'import android.os.Bundle',
      'import android.os.Bundle\nimport androidx.activity.enableEdgeToEdge',
    );
  }
  if (!next.includes('enableEdgeToEdge()')) {
    next = next.replace(
      /setTheme\(R\.style\.AppTheme\);\s*super\.onCreate\(null\)/,
      'setTheme(R.style.AppTheme);\n    enableEdgeToEdge()\n    super.onCreate(null)',
    );
  }
  return next;
}

function applyPlayProguardRules(source) {
  if (source.includes('kr.gyeonggion.app.**')) return source;
  return `${source.replace(/\s*$/, '')}\n${EXTRA_PROGUARD}`;
}

function applyEdgeToEdgeStyles(xml) {
  if (xml.includes('windowLayoutInDisplayCutoutMode')) return xml;
  if (!xml.includes('android:statusBarColor')) return xml;
  return xml.replace(
    /<item name="android:statusBarColor">#1E6FEA<\/item>/,
    `<item name="android:statusBarColor">#1E6FEA</item>
    <item name="android:navigationBarColor">#1E6FEA</item>
    <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    <item name="android:windowDrawsSystemBarBackgrounds">true</item>`,
  );
}

function patchPlayQualityFiles(projectRoot) {
  const androidRoot = path.join(projectRoot, 'android');
  const propsFile = path.join(androidRoot, 'gradle.properties');
  const activity = path.join(androidRoot, 'app/src/main/java/kr/gyeonggion/app/MainActivity.kt');
  const proguard = path.join(androidRoot, 'app/proguard-rules.pro');
  const styles = path.join(androidRoot, 'app/src/main/res/values/styles.xml');
  const patched = [];
  if (fs.existsSync(propsFile)) {
    const before = fs.readFileSync(propsFile, 'utf8');
    const next = applyPlayQualityGradlePropertiesText(before);
    if (next !== before) {
      fs.writeFileSync(propsFile, next);
      patched.push('gradle.properties');
    }
  }
  if (fs.existsSync(activity)) {
    const before = fs.readFileSync(activity, 'utf8');
    const next = applyEdgeToEdgeMainActivity(before);
    if (next !== before) {
      fs.writeFileSync(activity, next);
      patched.push('MainActivity.kt');
    }
  }
  if (fs.existsSync(proguard)) {
    const before = fs.readFileSync(proguard, 'utf8');
    const next = applyPlayProguardRules(before);
    if (next !== before) {
      fs.writeFileSync(proguard, next);
      patched.push('proguard-rules.pro');
    }
  }
  if (fs.existsSync(styles)) {
    const before = fs.readFileSync(styles, 'utf8');
    const next = applyEdgeToEdgeStyles(before);
    if (next !== before) {
      fs.writeFileSync(styles, next);
      patched.push('styles.xml');
    }
  }
  return patched;
}

function withAndroidPlayQuality(config) {
  config = withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(MINIFY_PROPS)) {
      setGradleProperty(cfg.modResults, key, value);
    }
    return cfg;
  });

  config = withMainActivity(config, (cfg) => {
    cfg.modResults.contents = applyEdgeToEdgeMainActivity(cfg.modResults.contents);
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      patchPlayQualityFiles(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  return config;
}

module.exports = withAndroidPlayQuality;
module.exports.MINIFY_PROPS = MINIFY_PROPS;
module.exports.applyPlayQualityGradlePropertiesText = applyPlayQualityGradlePropertiesText;
module.exports.applyEdgeToEdgeMainActivity = applyEdgeToEdgeMainActivity;
module.exports.applyPlayProguardRules = applyPlayProguardRules;
module.exports.applyEdgeToEdgeStyles = applyEdgeToEdgeStyles;
module.exports.patchPlayQualityFiles = patchPlayQualityFiles;
