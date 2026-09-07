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
  patchExpoModulesCoreForCompileSdk36,
  patchReactNativeScreensKotlinList,
} = require('../plugins/withAndroidSdk36');
const { copyLauncherIcons } = require('../plugins/withAndroidLauncherIcon');

const root = path.resolve(__dirname, '..');
const repo = path.resolve(root, '..');
const credDir = path.join(root, 'credentials', 'android');
const propsPath = path.join(credDir, 'keystore.properties');
const defaultKeystoreCandidates = [
  path.join(credDir, 'upload-keystore.jks'),
  path.join(credDir, 'upload.keystore'),
];
function defaultKeystorePath() {
  return defaultKeystoreCandidates.find((file) => fs.existsSync(file)) || defaultKeystoreCandidates[0];
}
/** Play Console에 재설정 접수된 업로드 인증서 SHA1. 2026-09-06 16:52 UTC 이후 유효. */
const PLAY_UPLOAD_CERT_SHA1 = 'E4:CA:DA:50:1D:6C:94:5B:9D:11:FA:9A:B5:79:DF:26:22:AB:11:9F';
const outDir = path.join(root, 'dist', 'android');
const gradleAab = path.join(root, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const copiedAab = path.join(outDir, 'app-release.aab');
const rootAab = path.join(repo, 'app-release.aab');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message, code = 1) {
  process.stderr.write(`\n[build:aab] ${message}\n`);
  process.exit(code);
}

/** AAB proto 매니페스트에서 versionName / versionCode 를 읽는다. */
function readAabIdentity(aabPath) {
  const result = spawnSync('unzip', ['-p', aabPath, 'base/manifest/AndroidManifest.xml'], { encoding: 'buffer' });
  if (result.status !== 0) {
    throw new Error(`AAB 매니페스트를 읽지 못했습니다: ${aabPath}`);
  }
  const text = result.stdout.toString('latin1');
  const name = text.match(/versionName\x1a.([0-9]+(?:\.[0-9]+)*)/);
  const code = text.match(/versionCode\x1a.([0-9]+)/);
  return {
    versionName: name ? name[1] : null,
    versionCode: code ? Number(code[1]) : null,
  };
}

function assertAabIdentity(aabPath, versionName, versionCode) {
  const actual = readAabIdentity(aabPath);
  if (String(actual.versionName) !== String(versionName) || Number(actual.versionCode) !== Number(versionCode)) {
    fail(
      `AAB 버전이 app.json 과 다릅니다. 파일=${aabPath} 실제=${actual.versionName}/${actual.versionCode} 기대=${versionName}/${versionCode}. Play에 이미 올라간 옛 AAB를 쓰지 마세요.`,
    );
  }
  log(`[build:aab] verified ${aabPath} versionName=${actual.versionName} versionCode=${actual.versionCode}`);
  return actual;
}

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

function readAabCertSha1(aabPath) {
  const rsa = spawnSync('unzip', ['-p', aabPath, 'META-INF/UPLOAD.RSA'], { encoding: 'buffer' });
  if (rsa.status !== 0 || !rsa.stdout || !rsa.stdout.length) {
    throw new Error(`AAB 서명 인증서를 읽지 못했습니다: ${aabPath}`);
  }
  const tmpRsa = path.join(os.tmpdir(), `aab-upload-${Date.now()}.rsa`);
  const tmpPem = `${tmpRsa}.pem`;
  fs.writeFileSync(tmpRsa, rsa.stdout);
  try {
    const pem = spawnSync('openssl', ['pkcs7', '-inform', 'DER', '-in', tmpRsa, '-print_certs'], { encoding: 'buffer' });
    if (pem.status !== 0) throw new Error('openssl pkcs7 변환 실패');
    fs.writeFileSync(tmpPem, pem.stdout);
    const fp = spawnSync('openssl', ['x509', '-noout', '-fingerprint', '-sha1', '-in', tmpPem], { encoding: 'utf8' });
    if (fp.status !== 0) throw new Error('openssl fingerprint 실패');
    const match = String(fp.stdout || '').match(/([0-9A-F]{2}(?::[0-9A-F]{2}){19})/i);
    if (!match) throw new Error(`fingerprint 파싱 실패: ${fp.stdout}`);
    return match[1].toUpperCase();
  } finally {
    try { fs.unlinkSync(tmpRsa); } catch (_err) { /* ignore */ }
    try { fs.unlinkSync(tmpPem); } catch (_err) { /* ignore */ }
  }
}

function assertAabUploadCert(aabPath) {
  const actual = readAabCertSha1(aabPath);
  if (actual !== PLAY_UPLOAD_CERT_SHA1) {
    fail(
      `AAB 업로드 인증서 SHA1이 Play 등록 키와 다릅니다. 실제=${actual} 기대=${PLAY_UPLOAD_CERT_SHA1}. 이 파일을 Play에 올리지 마세요. ANDROID_KEYSTORE_FILE에 등록된 업로드 키스토어를 지정하세요.`,
    );
  }
  log(`[build:aab] verified upload cert SHA1=${actual}`);
  return actual;
}

function keystoreCertSha1(signing) {
  const listed = spawnSync(
    'keytool',
    ['-list', '-v', '-keystore', signing.storeFile, '-storepass', signing.storePassword, '-alias', signing.keyAlias],
    { encoding: 'utf8' },
  );
  const match = String(listed.stdout || '').match(/SHA1:\s*([0-9A-F]{2}(?::[0-9A-F]{2}){19})/i);
  if (listed.status !== 0 || !match) {
    fail('업로드 키스토어 SHA1을 확인하지 못했습니다. 파일·비밀번호·별칭을 확인하세요.');
  }
  return match[1].toUpperCase();
}

function ensureKeystore() {
  const existing = readProps(propsPath);
  const storeFile = process.env.ANDROID_KEYSTORE_FILE || existing.storeFile || defaultKeystorePath();
  const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD || existing.storePassword;
  const keyAlias = process.env.ANDROID_KEY_ALIAS || existing.keyAlias || 'upload';
  const keyPassword = process.env.ANDROID_KEY_PASSWORD || existing.keyPassword || storePassword;
  if (fs.existsSync(storeFile) && storePassword && keyAlias && keyPassword) {
    const signing = { storeFile, storePassword, keyAlias, keyPassword };
    const sha1 = keystoreCertSha1(signing);
    if (sha1 !== PLAY_UPLOAD_CERT_SHA1) {
      fail(
        `키스토어 SHA1이 Play 업로드 키와 다릅니다. 실제=${sha1} 기대=${PLAY_UPLOAD_CERT_SHA1}. 이 키로 서명하지 않습니다.`,
      );
    }
    writeProps(propsPath, { storeFile, storePassword, keyAlias, keyPassword });
    log(`[build:aab] keystore SHA1=${sha1}`);
    return signing;
  }
  if (fs.existsSync(storeFile) && !storePassword) {
    fail('업로드 키스토어 파일은 있으나 비밀번호가 없습니다. ANDROID_KEYSTORE_PASSWORD 또는 credentials/android/keystore.properties 를 넣으세요. Play 등록 키를 덮어쓰지 않습니다.');
  }
  fail(
    'Play 업로드 키스토어가 없습니다. 새 키를 만들면 Play가 SHA1 불일치로 거부합니다. '
    + `기대 SHA1=${PLAY_UPLOAD_CERT_SHA1}. ANDROID_KEYSTORE_FILE / ANDROID_KEYSTORE_PASSWORD 를 제공하세요.`,
  );
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
  if (patchExpoModulesCoreForCompileSdk36(root)) {
    log('[build:aab] expo-modules-core PermissionsService.kt 를 compileSdk 36에 맞게 패치했습니다.');
  }
  if (patchReactNativeScreensKotlinList(root)) {
    log('[build:aab] react-native-screens ScreenStack.kt removeLast 충돌을 패치했습니다.');
  }
}

function ensureLauncherIcons() {
  const copied = copyLauncherIcons(root);
  if (!copied) {
    fail('첨부 6 런처 mipmap을 android/app/src/main/res 에 복사하지 못했습니다.');
  }
  log(`[build:aab] launcher icons copied=${copied}`);
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

function restoreExpoStartScripts() {
  const file = path.join(root, 'package.json');
  if (!fs.existsSync(file)) return;
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;
  if (pkg.scripts?.android === 'expo run:android') {
    pkg.scripts.android = 'expo start --android';
    changed = true;
  }
  if (pkg.scripts?.ios === 'expo run:ios') {
    pkg.scripts.ios = 'expo start --ios';
    changed = true;
  }
  if (changed) fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

function ensureAppVersion(versionName, versionCode) {
  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(gradle)) fail('android/app/build.gradle 이 없습니다.');
  let source = fs.readFileSync(gradle, 'utf8');
  const next = source
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  if (next === source && !new RegExp(`versionCode\\s+${versionCode}`).test(source)) {
    fail(`build.gradle 에 versionCode ${versionCode} 를 쓰지 못했습니다.`);
  }
  fs.writeFileSync(gradle, next);
  log(`[build:aab] android/app/build.gradle versionName=${versionName} versionCode=${versionCode}`);
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
  const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const versionName = appJson?.expo?.version;
  const versionCode = appJson?.expo?.android?.versionCode;
  log(`[build:aab] versionName=${versionName} versionCode=${versionCode}`);
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
  ensureLauncherIcons();
  ensureSdk36Gradle();
  ensureAppVersion(versionName, versionCode);
  restoreExpoStartScripts();

  const gradlew = path.join(root, 'android', 'gradlew');
  fs.chmodSync(gradlew, 0o755);
  run(gradlew, ['bundleRelease', '--no-daemon'], path.join(root, 'android'), {
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
  });

  if (!fs.existsSync(gradleAab)) fail(`AAB를 찾지 못했습니다: ${gradleAab}`);
  assertAabIdentity(gradleAab, versionName, versionCode);
  assertAabUploadCert(gradleAab);
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(gradleAab, copiedAab);
  const versionedAab = path.join(outDir, `onandon-${versionName}-vc${versionCode}.aab`);
  fs.copyFileSync(gradleAab, versionedAab);
  fs.copyFileSync(gradleAab, rootAab);
  assertAabIdentity(copiedAab, versionName, versionCode);
  assertAabIdentity(rootAab, versionName, versionCode);
  const stat = fs.statSync(copiedAab);
  log('\n=== AAB 빌드 완료 ===');
  log(`Gradle 산출물: ${gradleAab}`);
  log(`복사본:         ${copiedAab}`);
  log(`버전 파일:      ${versionedAab}`);
  log(`루트 복사본:    ${rootAab}`);
  log(`크기:           ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
  log(`versionName:    ${versionName}`);
  log(`versionCode:    ${versionCode}`);
  log('Play Console → 테스트 → 비공개 테스트 트랙에 이 .aab 파일을 업로드하면 됩니다.');
  log(`주의: 저장소 루트의 예전 app-release.aab를 올리지 마세요. 방금 빌드한 onandon-${versionName}-vc${versionCode}.aab 를 확인하세요.`);
}

main();
