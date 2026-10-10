const { withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'onandonAlignNativeLibs16kb';

const GRADLE_HOOK = `
def ${MARKER} = {
    def script = new File(rootDir, "../scripts/align-elf-16kb.py")
    if (!script.exists()) throw new GradleException("16KB aligner missing: \${script}")
    exec {
        commandLine "python3", script.absolutePath, "\${project.buildDir}/intermediates"
    }
}
def ${MARKER}Attach = { task ->
    if (task.name == "mergeReleaseNativeLibs" || task.name == "stripReleaseDebugSymbols") {
        task.doLast { ${MARKER}() }
    }
    if (task.name == "packageReleaseBundle") {
        task.doFirst { ${MARKER}() }
    }
}
tasks.whenTaskAdded { task -> ${MARKER}Attach(task) }
afterEvaluate {
    tasks.each { task -> ${MARKER}Attach(task) }
}
`;

function applyAlign16kbAppBuildGradle(contents) {
  if (contents.includes(MARKER)) return contents;
  const trimmed = contents.replace(/\s*$/, '');
  return `${trimmed}\n${GRADLE_HOOK}\n`;
}

function patch16kbFiles(projectRoot) {
  const appGradle = path.join(projectRoot, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(appGradle)) return [];
  const before = fs.readFileSync(appGradle, 'utf8');
  const next = applyAlign16kbAppBuildGradle(before);
  if (next === before) return [];
  fs.writeFileSync(appGradle, next);
  return ['app/build.gradle'];
}

function withAndroid16Kb(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    mod.modResults.contents = applyAlign16kbAppBuildGradle(mod.modResults.contents);
    return mod;
  });
}

module.exports = withAndroid16Kb;
module.exports.MARKER = MARKER;
module.exports.applyAlign16kbAppBuildGradle = applyAlign16kbAppBuildGradle;
module.exports.patch16kbFiles = patch16kbFiles;
