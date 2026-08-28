#!/usr/bin/env node
/**
 * Play Console 업로드용 Android App Bundle(.aab)을 로컬에서 만든다.
 *
 *   npm run build:aab
 *
 * 서명: 환경 변수 또는 mobile/credentials/android/keystore.properties
 *   ANDROID_KEYSTORE_FILE
 *   ANDROID_KEYSTORE_PASSWORD
 *   ANDROID_KEY_ALIAS
 *   ANDROID_KEY_PASSWORD
 *
 * 산출물:
 *   mobile/dist/android/app-release.aab
 *   android/app/build/outputs/bundle/release/app-release.aab
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  BUILD_TOOLS,
  COMPILE_SDK,
  TARGET_SDK,
  applySdk36ToAppBuildGradle,
  applySdk36ToGradlePropertiesText,
  applySdk36ToProjectBuildGradle,
} = require('../plugins/withAndroidSdk36');

const root = path.resolve(__dirname, '..');
const repo = path.resolve(root, '..');
const credDir = path.join(root, 'credentials', 'android');
const propsPath = path.join(credDir, 'keystore.properties');
const defaultKeystore = path.join(credDir, 'upload.keystore');
const outDir = path.join(root, 'dist', 'android');
const gradleAab = path.join(root, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const copiedAab = path.join(outDir, 'app-release.aab');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message, code = 1) {
  process.stderr.write(`\n[build:aab] ${message}\n`);
  process.exit(code);
}

function run(command, args, cwd = root, extraEnv = {}) {
  log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    fail(`명령이 실패했습니다 (${command} ${args.join(' ')}). exit=${result.status}`);
  }
}

function readProps(file) {
  if (!fs.existsSync(file)) return {};
  const rows = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const idx = text.indexOf('=');
    if (idx < 0) continue;
    rows[text.slice(0, idx).trim()] = text.slice(idx + 1).trim();
  }
  return rows;
}

function writeProps(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = Object.entries(rows).map(([key, value]) => `${key}=${value}`).join('\n');
  fs.writeFileSync(file, `${body}\n`);
}

function ensureKeystore() {
  const existing = readProps(propsPath);
  const storeFile = process.env.ANDROID_KEYSTORE_FILE || existing.storeFile || defaultKeystore;
  const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD || existing.storePassword;
  const keyAlias = process.env.ANDROID_KEY_ALIAS || existing.keyAlias || 'upload';
  const keyPassword = process.env.ANDROID_KEY_PASSWORD || existing.keyPassword || storePassword;
  if (fs.existsSync(storeFile) && storePassword && keyAlias && keyPassword) {
    writeProps(propsPath, { storeFile, storePassword, keyAlias, keyPassword });
    return { storeFile, storePassword, keyAlias, keyPassword };
  }
  if (!storePassword) {
    const generated = `onandon-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    log('[build:aab] 기존 키스토어가 없어 업로드 키를 새로 만듭니다. 이 파일을 Play Console과 이후 업데이트에 반드시 보관하세요.');
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    run('keytool', [
      '-genkeypair', '-v', '-storetype', 'PKCS12',
      '-keystore', storeFile,
      '-alias', keyAlias,
      '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
      '-storepass', generated, '-keypass', generated,
      '-dname', 'CN=OnAndOn Plus, OU=Mobile, O=kdanji, L=Suwon, ST=Gyeonggi, C=KR',
    ], root);
    writeProps(propsPath, { storeFile, storePassword: generated, keyAlias, keyPassword: generated });
    log(`[build:aab] 키스토어: ${storeFile}`);
    log(`[build:aab] 속성 파일: ${propsPath} (gitignore, Play 업로드 키로 보관)`);
    return { storeFile, storePassword: generated, keyAlias, keyPassword: generated };
  }
  fail('키스토어 파일을 찾을 수 없습니다. ANDROID_KEYSTORE_FILE 또는 credentials/android/upload.keystore 를 확인하세요.');
}

function sdkHome() {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), 'Android', 'Sdk');
}

function findSdkManager(home) {
  return [
    path.join(home, 'cmdline-tools', 'latest', 'bin', 'sdkmanager'),
    path.join(home, 'tools', 'bin', 'sdkmanager'),
  ].find((file) => fs.existsSync(file));
}

function androidSdk36Ready(home) {
  return (
    fs.existsSync(path.join(home, 'platforms', `android-${COMPILE_SDK}`)) &&
    fs.existsSync(path.join(home, 'build-tools', BUILD_TOOLS))
  );
}

function ensureSdkManager(home) {
  const existing = findSdkManager(home);
  if (existing) return existing;
  log(`[build:aab] Android cmdline-tools를 준비합니다: ${home}`);
  fs.mkdirSync(path.join(home, 'cmdline-tools'), { recursive: true });
  const zip = path.join(os.tmpdir(), 'android-cmdline-tools.zip');
  const url = 'https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip';
  run('curl', ['-L', '--fail', '-o', zip, url], root);
  run('unzip', ['-qo', zip, '-d', path.join(home, 'cmdline-tools')], root);
  const unpacked = path.join(home, 'cmdline-tools', 'cmdline-tools');
  const latest = path.join(home, 'cmdline-tools', 'latest');
  if (fs.existsSync(unpacked) && !fs.existsSync(latest)) fs.renameSync(unpacked, latest);
  const manager = path.join(latest, 'bin', 'sdkmanager');
  if (!fs.existsSync(manager)) fail(`sdkmanager 를 찾을 수 없습니다: ${manager}`);
  return manager;
}

function ensureAndroidSdk() {
  const home = sdkHome();
  process.env.ANDROID_HOME = home;
  process.env.ANDROID_SDK_ROOT = home;
  if (androidSdk36Ready(home)) return home;

  log(`[build:aab] Android SDK ${COMPILE_SDK} / build-tools ${BUILD_TOOLS} 를 준비합니다: ${home}`);
  const manager = ensureSdkManager(home);
  const licenses = spawnSync('bash', ['-lc', `yes | "${manager}" --sdk_root="${home}" --licenses`], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (licenses.status !== 0) log('[build:aab] 라이선스 수락에서 경고가 있었습니다. 패키지 설치를 계속합니다.');
  run(manager, [
    '--sdk_root=' + home,
    `platforms;android-${COMPILE_SDK}`,
    `build-tools;${BUILD_TOOLS}`,
    'platform-tools',
  ], root);
  if (!androidSdk36Ready(home)) {
    fail(`Android SDK ${COMPILE_SDK} 설치에 실패했습니다: ${path.join(home, 'platforms', `android-${COMPILE_SDK}`)}`);
  }
  return home;
}

function ensureSdk36Gradle() {
  const propsFile = path.join(root, 'android', 'gradle.properties');
  const projectGradle = path.join(root, 'android', 'build.gradle');
  const appGradle = path.join(root, 'android', 'app', 'build.gradle');
  if (fs.existsSync(propsFile)) {
    fs.writeFileSync(propsFile, applySdk36ToGradlePropertiesText(fs.readFileSync(propsFile, 'utf8')));
  }
  if (fs.existsSync(projectGradle)) {
    fs.writeFileSync(projectGradle, applySdk36ToProjectBuildGradle(fs.readFileSync(projectGradle, 'utf8')));
  }
  if (fs.existsSync(appGradle)) {
    fs.writeFileSync(appGradle, applySdk36ToAppBuildGradle(fs.readFileSync(appGradle, 'utf8')));
  }
  log(`[build:aab] compileSdkVersion=${COMPILE_SDK} targetSdkVersion=${TARGET_SDK} buildToolsVersion=${BUILD_TOOLS}`);
}

function ensureSplashColor() {
  const file = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'colors.xml');
  if (!fs.existsSync(file)) return;
  let xml = fs.readFileSync(file, 'utf8');
  if (xml.includes('splashscreen_background')) return;
  xml = xml.replace('</resources>', '  <color name="splashscreen_background">#111827</color>\n</resources>');
  fs.writeFileSync(file, xml);
}

function writeLocalProperties(sdk) {
  const file = path.join(root, 'android', 'local.properties');
  fs.writeFileSync(file, `sdk.dir=${sdk.replace(/\\/g, '\\\\')}\n`);
}

function applyReleaseSigning(signing) {
  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(gradle)) fail('android/app/build.gradle 이 없습니다. prebuild가 실패했을 수 있습니다.');
  let source = fs.readFileSync(gradle, 'utf8');
  const storeFile = signing.storeFile.replace(/\\/g, '/');
  const releaseBlock = `        release {
            storeFile file("${storeFile}")
            storePassword "${signing.storePassword}"
            keyAlias "${signing.keyAlias}"
            keyPassword "${signing.keyPassword}"
        }
`;
  if (!source.includes('keyAlias "' + signing.keyAlias + '"') && !source.includes("props['keyAlias']")) {
    source = source.replace(
      /signingConfigs \{\s*debug \{/,
      `signingConfigs {\n${releaseBlock}        debug {`,
    );
  }
  source = source.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release',
  );
  source = source.replace(/signingConfig signingConfigs\.release\s*\n\s*\/\/ Caution[\s\S]*?signingConfig signingConfigs\.debug/, 'signingConfig signingConfigs.release');
  fs.writeFileSync(gradle, source);
  fs.writeFileSync(path.join(root, 'android', 'app', 'keystore.properties'), [
    `storeFile=${storeFile}`,
    `storePassword=${signing.storePassword}`,
    `keyAlias=${signing.keyAlias}`,
    `keyPassword=${signing.keyPassword}`,
    '',
  ].join('\n'));
}

function main() {
  log('=== 온앤온+ Android App Bundle (release AAB) ===');
  const signing = ensureKeystore();
  const sdk = ensureAndroidSdk();
  log(`[build:aab] ANDROID_HOME=${sdk}`);
  log(`[build:aab] keystore=${signing.storeFile}`);

  run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean'], root, {
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    EXPO_NO_TELEMETRY: '1',
    CI: '1',
  });
  writeLocalProperties(sdk);
  applyReleaseSigning(signing);
  ensureSplashColor();
  ensureSdk36Gradle();

  const gradlew = path.join(root, 'android', 'gradlew');
  fs.chmodSync(gradlew, 0o755);
  run(gradlew, ['bundleRelease', '--no-daemon'], path.join(root, 'android'), {
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
  });

  if (!fs.existsSync(gradleAab)) fail(`AAB를 찾지 못했습니다: ${gradleAab}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(gradleAab, copiedAab);
  const stat = fs.statSync(copiedAab);
  log('\n=== AAB 빌드 완료 ===');
  log(`Gradle 산출물: ${gradleAab}`);
  log(`복사본:         ${copiedAab}`);
  log(`크기:           ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
  log('Play Console → 테스트 → 비공개 테스트 트랙에 이 .aab 파일을 업로드하면 됩니다.');
}

main();
