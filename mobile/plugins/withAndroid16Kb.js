const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
  withProjectBuildGradle,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'onandonAlignNativeLibs16kb';
const PROJECT_MARKER = 'onandon16kbNativeBuild';
const CMAKE_MARKER = 'onandon-16kb-page-size';
const LINKER_FLAGS = '-Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384';

const PACKAGING_PROPS = {
  'expo.useLegacyPackaging': 'true',
  'android.bundle.enableUncompressedNativeLibs': 'false',
};

const GRADLE_HOOK = `
def ${MARKER} = {
    def script = new File(rootDir, "../scripts/align-elf-16kb.py")
    if (!script.exists()) throw new GradleException("16KB aligner missing: \${script}")
    def roots = [
        new File(project.buildDir, "intermediates/merged_native_libs"),
        new File(project.buildDir, "intermediates/stripped_native_libs"),
        new File(project.buildDir, "intermediates/merged_jni_libs"),
    ].findAll { it.exists() }
    if (roots) {
        exec {
            commandLine(["python3", script.absolutePath] + roots.collect { it.absolutePath })
        }
    }
}
afterEvaluate {
    def pkg = tasks.findByName("packageReleaseBundle")
    if (pkg != null && !pkg.ext.has("${MARKER}")) {
        pkg.ext.${MARKER} = true
        pkg.doFirst { ${MARKER}() }
    }
}
`;

const PROJECT_HOOK = `
// ${PROJECT_MARKER}
subprojects { sub ->
    sub.afterEvaluate {
        def androidExt = sub.extensions.findByName("android")
        if (androidExt == null) return
        if (new File(sub.projectDir, "CMakeLists.txt").exists()) {
            try {
                androidExt.defaultConfig.externalNativeBuild.cmake.arguments.add("-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON")
                androidExt.defaultConfig.externalNativeBuild.cmake.arguments.add("-DCMAKE_SHARED_LINKER_FLAGS=${LINKER_FLAGS}")
            } catch (Throwable ignored) {}
        }
        if (new File(sub.projectDir, "Android.mk").exists() || new File(sub.projectDir, "jni/Android.mk").exists()) {
            try {
                androidExt.defaultConfig.externalNativeBuild.ndkBuild.arguments.add("APP_LDFLAGS+=${LINKER_FLAGS}")
            } catch (Throwable ignored) {}
        }
    }
}
`;

const CMAKE_SNIPPET = `
# ${CMAKE_MARKER}
if(ANDROID)
  add_link_options("-Wl,-z,max-page-size=16384" "-Wl,-z,common-page-size=16384")
endif()
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

function apply16kbGradlePropertiesText(text) {
  let next = text;
  for (const [key, value] of Object.entries(PACKAGING_PROPS)) {
    next = upsertPropertyLine(next, key, value);
  }
  return next;
}

function applyLegacyPackagingAppBuildGradle(contents) {
  return contents
    .replace(
      /useLegacyPackaging\s*\([^)]*\)/,
      'useLegacyPackaging true',
    )
    .replace(
      /useLegacyPackaging\s*=\s*(?:findProperty\([^)]*\)[^\n]*|false)/,
      'useLegacyPackaging true',
    );
}

function applyAlign16kbAppBuildGradle(contents) {
  let next = applyLegacyPackagingAppBuildGradle(contents);
  if (!next.includes(MARKER)) {
    const trimmed = next.replace(/\s*$/, '');
    next = `${trimmed}\n${GRADLE_HOOK}\n`;
  }
  return next;
}

function apply16kbProjectBuildGradle(contents) {
  if (contents.includes(PROJECT_MARKER)) return contents;
  const trimmed = contents.replace(/\s*$/, '');
  return `${trimmed}\n${PROJECT_HOOK}\n`;
}

function applyCmake16kb(source) {
  if (source.includes(CMAKE_MARKER)) return source;
  if (/cmake_minimum_required\s*\(/i.test(source)) {
    return source.replace(
      /(cmake_minimum_required\s*\([^)]*\)[^\n]*\n)/i,
      `$1${CMAKE_SNIPPET}`,
    );
  }
  return `${CMAKE_SNIPPET}\n${source}`;
}

function patchCmake16kbFiles(projectRoot) {
  const nodeModules = path.join(projectRoot, 'node_modules');
  if (!fs.existsSync(nodeModules)) return [];
  const patched = [];
  const stack = [nodeModules];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'build' || entry.name === '.cxx') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.name !== 'CMakeLists.txt') continue;
      if (!full.replace(/\\/g, '/').includes('/android/CMakeLists.txt')) continue;
      const before = fs.readFileSync(full, 'utf8');
      const next = applyCmake16kb(before);
      if (next !== before) {
        fs.writeFileSync(full, next);
        patched.push(path.relative(projectRoot, full));
      }
    }
  }
  return patched;
}

function patch16kbFiles(projectRoot) {
  const androidRoot = path.join(projectRoot, 'android');
  const patched = [];
  const propsFile = path.join(androidRoot, 'gradle.properties');
  if (fs.existsSync(propsFile)) {
    const before = fs.readFileSync(propsFile, 'utf8');
    const next = apply16kbGradlePropertiesText(before);
    if (next !== before) {
      fs.writeFileSync(propsFile, next);
      patched.push('gradle.properties');
    }
  }
  const projectGradle = path.join(androidRoot, 'build.gradle');
  if (fs.existsSync(projectGradle)) {
    const before = fs.readFileSync(projectGradle, 'utf8');
    const next = apply16kbProjectBuildGradle(before);
    if (next !== before) {
      fs.writeFileSync(projectGradle, next);
      patched.push('build.gradle');
    }
  }
  const appGradle = path.join(androidRoot, 'app', 'build.gradle');
  if (fs.existsSync(appGradle)) {
    const before = fs.readFileSync(appGradle, 'utf8');
    const next = applyAlign16kbAppBuildGradle(before);
    if (next !== before) {
      fs.writeFileSync(appGradle, next);
      patched.push('app/build.gradle');
    }
  }
  patched.push(...patchCmake16kbFiles(projectRoot));
  return patched;
}

function withAndroid16Kb(config) {
  config = withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PACKAGING_PROPS)) {
      setGradleProperty(cfg.modResults, key, value);
    }
    return cfg;
  });

  config = withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    mod.modResults.contents = apply16kbProjectBuildGradle(mod.modResults.contents);
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    mod.modResults.contents = applyAlign16kbAppBuildGradle(mod.modResults.contents);
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      patch16kbFiles(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  return config;
}

module.exports = withAndroid16Kb;
module.exports.MARKER = MARKER;
module.exports.PROJECT_MARKER = PROJECT_MARKER;
module.exports.CMAKE_MARKER = CMAKE_MARKER;
module.exports.LINKER_FLAGS = LINKER_FLAGS;
module.exports.PACKAGING_PROPS = PACKAGING_PROPS;
module.exports.applyAlign16kbAppBuildGradle = applyAlign16kbAppBuildGradle;
module.exports.applyLegacyPackagingAppBuildGradle = applyLegacyPackagingAppBuildGradle;
module.exports.apply16kbGradlePropertiesText = apply16kbGradlePropertiesText;
module.exports.apply16kbProjectBuildGradle = apply16kbProjectBuildGradle;
module.exports.applyCmake16kb = applyCmake16kb;
module.exports.patchCmake16kbFiles = patchCmake16kbFiles;
module.exports.patch16kbFiles = patch16kbFiles;
