import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const downloads = join(here, '../public/downloads');
const appJson = JSON.parse(readFileSync(join(here, '../app.json'), 'utf8'));

test('downloads page targets versionCode 19 after Play Alpha 18', () => {
  const html = readFileSync(join(downloads, 'index.html'), 'utf8');
  const guide = readFileSync(join(downloads, 'PLAY_CONSOLE_UPLOAD.txt'), 'utf8');
  assert.equal(appJson.expo.version, '1.0.18');
  assert.equal(appJson.expo.android.versionCode, 19);
  assert.match(html, /비공개 테스트/);
  assert.match(html, /onandon_plus_1\.0\.18_vc19\.aab/);
  assert.match(html, /versionCode/);
  assert.match(html, /1\.0\.17/);
  assert.match(html, /C6:5A:7E:EA:D7:87:C3:84:B8:B2:5E:E5:D4:DB:2F:F0:C1:B7:C5:D1/);
  assert.match(html, /업로드 키 재설정 요청/);
  assert.match(html, /upload_certificate\.pem/);
  assert.match(guide, /비공개 테스트/);
  assert.match(guide, /onandon_plus_1\.0\.18_vc19\.aab/);
  assert.match(guide, /C6:5A:7E:EA:D7:87:C3:84:B8:B2:5E:E5:D4:DB:2F:F0:C1:B7:C5:D1/);
});

test('signed vc19 AAB matches Play upload cert when present', { skip: !existsSync(join(downloads, 'onandon_plus_1.0.18_vc19.aab')) }, () => {
  const listed = spawnSync(
    'keytool',
    ['-printcert', '-jarfile', join(downloads, 'onandon_plus_1.0.18_vc19.aab')],
    { encoding: 'utf8' },
  );
  assert.equal(listed.status, 0, listed.stderr);
  assert.match(String(listed.stdout), /SHA1:\s*C6:5A:7E:EA:D7:87:C3:84:B8:B2:5E:E5:D4:DB:2F:F0:C1:B7:C5:D1/i);
});
