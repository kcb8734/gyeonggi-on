import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const downloads = join(here, '../public/downloads');
const cred = join(here, '../credentials/android');
const record = JSON.parse(readFileSync(join(cred, 'play-upload-cert.json'), 'utf8'));

function opensslFingerprint(pemPath, digest) {
  const out = spawnSync('openssl', ['x509', '-in', pemPath, '-noout', '-fingerprint', `-${digest}`], { encoding: 'utf8' });
  assert.equal(out.status, 0, String(out.stderr || ''));
  const match = String(out.stdout || '').match(/Fingerprint=([0-9A-F:]+)/i);
  assert.ok(match, `${digest} missing in ${out.stdout}`);
  return match[1].toUpperCase();
}

function pemFingerprints(pemPath) {
  return {
    sha1: opensslFingerprint(pemPath, 'sha1'),
    sha256: opensslFingerprint(pemPath, 'sha256'),
    md5: opensslFingerprint(pemPath, 'md5'),
  };
}

test('Play-registered upload cert fingerprints are the single source of truth', () => {
  assert.equal(record.packageName, 'kr.gyeonggion.app');
  assert.equal(record.alias, 'upload');
  assert.equal(record.status, 'registered-on-play');
  assert.equal(record.doNotRegenerate, true);
  assert.equal(record.sha1, '30:70:7C:14:A2:AA:1B:AD:06:5C:E7:CC:79:AC:02:BB:9B:D8:2C:42');
  assert.equal(record.sha256, '7C:37:5E:67:B2:0C:E4:0E:8F:95:4E:DB:E8:A3:43:A3:37:08:48:1E:32:3E:31:83:C4:FB:C9:5C:5E:97:86:53');
  assert.equal(record.md5, '46:75:CA:CC:9B:12:17:1F:E2:06:87:2F:F3:86:FD:77');
});

test('PEM copies match Play Console fingerprints', () => {
  for (const pemPath of [join(downloads, 'upload_certificate.pem'), join(cred, 'upload_certificate.pem')]) {
    const fp = pemFingerprints(pemPath);
    assert.equal(fp.sha1, record.sha1, pemPath);
    assert.equal(fp.sha256, record.sha256, pemPath);
    assert.equal(fp.md5, record.md5, pemPath);
  }
});

test('downloads page is the Play Console AAB upload guide', () => {
  const html = readFileSync(join(downloads, 'index.html'), 'utf8');
  const guide = readFileSync(join(downloads, 'PLAY_CONSOLE_UPLOAD.txt'), 'utf8');
  assert.match(html, /Play Console에 올릴 AAB/);
  assert.match(html, /내부 테스트/);
  assert.match(html, /새 버전 만들기/);
  assert.match(html, /kr\.gyeonggion\.app/);
  assert.match(html, /onandon_plus_1\.0\.6_vc7\.aab/);
  assert.match(html, /versionCode/);
  assert.match(html, new RegExp(record.sha1));
  assert.match(html, /upload_certificate\.pem/);
  assert.match(html, /PLAY_CONSOLE_UPLOAD\.txt/);
  assert.doesNotMatch(html, /업로드 키 재설정 요청/);
  assert.doesNotMatch(html, /PLAY_UPLOAD_KEY_RESET/);
  assert.match(guide, /내부 테스트/);
  assert.match(guide, /프로덕션/);
  assert.match(guide, /onandon_plus_1\.0\.6_vc7\.aab/);
  assert.match(guide, new RegExp(record.sha1));
});

test('store AAB is signed with the registered upload cert', () => {
  const listed = spawnSync(
    'keytool',
    ['-printcert', '-jarfile', join(downloads, 'onandon_plus_1.0.6_vc7.aab')],
    { encoding: 'utf8' },
  );
  assert.equal(listed.status, 0, listed.stderr);
  const sha1 = String(listed.stdout || '').match(/SHA1:\s*([0-9A-F:]+)/i);
  const sha256 = String(listed.stdout || '').match(/SHA256:\s*([0-9A-F:]+)/i);
  assert.equal(sha1[1].toUpperCase(), record.sha1);
  assert.equal(sha256[1].toUpperCase(), record.sha256);
});
