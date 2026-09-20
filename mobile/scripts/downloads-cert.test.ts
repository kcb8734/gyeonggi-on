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
  assert.match(html, /30:70:7C:14:A2:AA:1B:AD:06:5C:E7:CC:79:AC:02:BB:9B:D8:2C:42/);
  assert.doesNotMatch(html, /onandon_plus_1\.0\.6_vc7\.aab/);
  assert.match(guide, /비공개 테스트/);
  assert.match(guide, /onandon_plus_1\.0\.18_vc19\.aab/);
});

test('signed vc19 AAB matches Play upload cert when present', { skip: !existsSync(join(downloads, 'onandon_plus_1.0.18_vc19.aab')) }, () => {
  const listed = spawnSync(
    'keytool',
    ['-printcert', '-jarfile', join(downloads, 'onandon_plus_1.0.18_vc19.aab')],
    { encoding: 'utf8' },
  );
  assert.equal(listed.status, 0, listed.stderr);
  assert.match(String(listed.stdout), /SHA1:\s*30:70:7C:14:A2:AA:1B:AD:06:5C:E7:CC:79:AC:02:BB:9B:D8:2C:42/i);
});
