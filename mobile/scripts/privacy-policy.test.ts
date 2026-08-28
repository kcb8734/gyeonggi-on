import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

test('privacy policy page is a crawlable Korean HTML document', () => {
  const html = readFileSync(join(here, '../public/privacy/index.html'), 'utf8');
  assert.match(html, /개인정보처리방침/);
  assert.match(html, /kr\.gyeonggion\.app/);
  assert.match(html, /help@gyeonggi-on\.kr/);
  assert.match(html, /canonical" href="https:\/\/www\.kdanji.com\/privacy"/);
  assert.doesNotMatch(html, /<script>/);
});

test('vercel serves /privacy as a static file instead of the SPA', () => {
  const vercel = readFileSync(join(here, '../../vercel.json'), 'utf8');
  assert.match(vercel, /"\/privacy"/);
  assert.match(vercel, /privacy\/index\.html/);
  assert.match(vercel, /\(\?!_expo\/\|assets\/\|privacy\)/);
});
