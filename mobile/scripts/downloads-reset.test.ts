import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const downloads = join(here, '../public/downloads');

test('downloads page is a Play upload-key reset kit', () => {
  const html = readFileSync(join(downloads, 'index.html'), 'utf8');
  assert.match(html, /업로드 키 재설정 요청/);
  assert.match(html, /업로드 키를 분실했습니다/);
  assert.match(html, /kr\.gyeonggion\.app/);
  assert.match(html, /30:70:7C:14:A2:AA:1B:AD:06:5C:E7:CC:79:AC:02:BB:9B:D8:2C:42/);
  assert.match(html, /E4:CA:DA:50:1D:6C:94:5B:9D:11:FA:9A:B5:79:DF:26:22:AB:11:9F/);
  assert.match(html, /upload_certificate\.pem/);
  assert.match(html, /onandon_plus_1\.0\.6_vc7\.aab/);
  assert.match(html, /PLAY_UPLOAD_KEY_RESET\.txt/);
});

test('reset request letter matches the new upload certificate', () => {
  const letter = readFileSync(join(downloads, 'PLAY_UPLOAD_KEY_RESET.txt'), 'utf8');
  const pem = readFileSync(join(downloads, 'upload_certificate.pem'), 'utf8');
  assert.match(letter, /업로드 키를 분실했습니다/);
  assert.match(letter, /kr\.gyeonggion\.app/);
  assert.match(letter, /30:70:7C:14:A2:AA:1B:AD:06:5C:E7:CC:79:AC:02:BB:9B:D8:2C:42/);
  assert.match(letter, /46:75:CA:CC:9B:12:17:1F:E2:06:87:2F:F3:86:FD:77/);
  assert.match(pem, /BEGIN CERTIFICATE/);
});

test('vercel serves PEM as a downloadable attachment', () => {
  const vercel = readFileSync(join(here, '../../vercel.json'), 'utf8');
  assert.match(vercel, /uploads?_certificate\.pem|upload_certificate\.pem/);
  assert.match(vercel, /filename=\\"upload_certificate\.pem\\"/);
});
