import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildFeedRewardHtml, buildFeedRewardInput, buildKoreanFeedPdf } from './feedRewardDocument';
import { jpegPagesToPdf } from './pdfJpeg';

const sample = {
  id: '1',
  userName: '수원나들이',
  festival: '수원화성문화제',
  city: '종로구',
  regionalZone: 'SEOUL',
  regionLabel: '서울온',
  amountWon: 1000,
  points: 1000,
  postedAt: '2026-08-22',
  status: 'PAID' as const,
};

test('feed reward html keeps Korean UTF-8 and official letter fields', () => {
  const input = buildFeedRewardInput([sample], '종로구');
  assert.match(input.documentNo, /종로구/);
  assert.equal(input.receiver, '종로구청장');
  const html = buildFeedRewardHtml(input);
  assert.match(html, /charset="utf-8"/);
  assert.match(html, /종로구청장/);
  assert.match(html, /서울온/);
  assert.match(html, /수원화성문화제/);
  assert.match(html, /지급/);
  assert.doesNotMatch(html, /Helvetica/);
  assert.doesNotMatch(html, /Festival Feed Local-Currency Settlement/);
});

test('korean feed pdf builder does not use Helvetica text streams', () => {
  assert.equal(buildKoreanFeedPdf(buildFeedRewardInput([sample], '종로구')), null);
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'feedRewardDocument.ts'), 'utf8');
  assert.doesNotMatch(source, /Helvetica/);
  assert.doesNotMatch(source, /buildSimplePdf/);
  assert.doesNotMatch(source, /Festival Feed Local-Currency Settlement/);
});

test('jpeg pages become a binary PDF with an image content stream', () => {
  const pdf = jpegPagesToPdf([{ width: 10, height: 10, jpeg: new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9]) }]);
  const text = Buffer.from(pdf).toString('latin1');
  assert.equal(text.startsWith('%PDF-1.'), true);
  assert.equal(text.includes('Helvetica'), false);
  assert.equal(text.includes('/Subtype /Image'), true);
  assert.equal(text.includes('/Im0 Do'), true);
  assert.equal(text.includes('/Contents 5 0 R'), true);
});
