#!/usr/bin/env node
/**
 * Play 업로드 키스토어를 GitHub Secrets용 Base64로 인코딩하거나, CI에서 복원한다.
 *
 *   node scripts/play-keystore.cjs encode
 *   node scripts/play-keystore.cjs restore
 *
 * encode: 로컬 JKS를 한 줄 Base64로 출력한다. 비밀번호는 출력하지 않는다.
 * restore: ANDROID_KEYSTORE_BASE64 환경 변수를 credentials/android/upload-keystore.jks 로 푼다.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const credDir = path.join(root, 'credentials', 'android');
const defaultJks = path.join(credDir, 'upload-keystore.jks');
const fallbackPkcs12 = path.join(credDir, 'upload.keystore');

function fail(message, code = 1) {
  process.stderr.write(`[play-keystore] ${message}\n`);
  process.exit(code);
}

function resolveKeystore() {
  const fromEnv = String(process.env.ANDROID_KEYSTORE_FILE || '').trim();
  if (fromEnv) return path.resolve(fromEnv);
  if (fs.existsSync(defaultJks)) return defaultJks;
  if (fs.existsSync(fallbackPkcs12)) return fallbackPkcs12;
  return defaultJks;
}

function encode() {
  const file = resolveKeystore();
  if (!fs.existsSync(file)) {
    fail(`키스토어가 없습니다: ${file}`);
  }
  const b64 = fs.readFileSync(file).toString('base64').replace(/\s+/g, '');
  process.stdout.write(`${b64}\n`);
  process.stderr.write(`[play-keystore] encoded ${file} (${fs.statSync(file).size} bytes) → ${b64.length} chars\n`);
  process.stderr.write('[play-keystore] GitHub Secret 이름: ANDROID_KEYSTORE_BASE64\n');
  process.stderr.write('[play-keystore] 비밀번호는 ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_PASSWORD 로 따로 등록하세요. 이 명령은 비밀번호를 출력하지 않습니다.\n');
}

function restore() {
  const b64 = String(process.env.ANDROID_KEYSTORE_BASE64 || '').replace(/\s+/g, '');
  if (!b64) fail('ANDROID_KEYSTORE_BASE64 가 없습니다.');
  const dest = String(process.env.ANDROID_KEYSTORE_FILE || '').trim() || defaultJks;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(b64, 'base64'), { mode: 0o600 });
  process.stderr.write(`[play-keystore] restored ${dest} (${fs.statSync(dest).size} bytes)\n`);
}

function backup() {
  const file = resolveKeystore();
  if (!fs.existsSync(file)) fail(`키스토어가 없습니다: ${file}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destDir = path.join(credDir, 'backup');
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, `upload-keystore-${stamp}${path.extname(file) || '.jks'}`);
  fs.copyFileSync(file, dest);
  fs.chmodSync(dest, 0o600);
  process.stdout.write(`${dest}\n`);
  process.stderr.write(`[play-keystore] backup copied to ${dest}\n`);
  process.stderr.write('[play-keystore] 이 폴더는 gitignore 입니다. USB·암호 저장소·비공개 클라우드에도 같은 파일을 복사해 두세요.\n');
}

const cmd = String(process.argv[2] || '').toLowerCase();
if (cmd === 'encode') encode();
else if (cmd === 'restore') restore();
else if (cmd === 'backup') backup();
else {
  fail('사용법: node scripts/play-keystore.cjs encode|restore|backup');
}
