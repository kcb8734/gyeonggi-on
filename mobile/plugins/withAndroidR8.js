const { withDangerousMod, withGradleProperties } = require('@expo/config-plugins');
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

function applyR8GradlePropertiesText(text) {
  let next = text;
  for (const [key, value] of Object.entries(MINIFY_PROPS)) {
    next = upsertPropertyLine(next, key, value);
  }
  return next;
}

function applyPlayProguardRules(source) {
  if (source.includes('kr.gyeonggion.app.**')) return source;
  return `${source.replace(/\s*$/, '')}\n${EXTRA_PROGUARD}`;
}

function patchR8Files(projectRoot) {
  const androidRoot = path.join(projectRoot, 'android');
  const propsFile = path.join(androidRoot, 'gradle.properties');
  const proguard = path.join(androidRoot, 'app/proguard-rules.pro');
  const patched = [];
  if (fs.existsSync(propsFile)) {
    const before = fs.readFileSync(propsFile, 'utf8');
    const next = applyR8GradlePropertiesText(before);
    if (next !== before) {
      fs.writeFileSync(propsFile, next);
      patched.push('gradle.properties');
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
  return patched;
}

function withAndroidR8(config) {
  config = withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(MINIFY_PROPS)) {
      setGradleProperty(cfg.modResults, key, value);
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      patchR8Files(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  return config;
}

module.exports = withAndroidR8;
module.exports.MINIFY_PROPS = MINIFY_PROPS;
module.exports.applyR8GradlePropertiesText = applyR8GradlePropertiesText;
module.exports.applyPlayProguardRules = applyPlayProguardRules;
module.exports.patchR8Files = patchR8Files;
