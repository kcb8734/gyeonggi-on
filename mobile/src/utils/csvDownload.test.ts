import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCsvPayload, settlementFilename, withUtf8Bom } from './csvDownload';

test('JSON {csv} 응답에서 본문만 꺼낸다', () => {
  const raw = JSON.stringify({ success: true, csv: '시군,담당자\n수원시,미지정' });
  assert.equal(extractCsvPayload(raw), '시군,담당자\n수원시,미지정');
});

test('이미 CSV면 그대로 둔다', () => {
  const csv = '\uFEFF시군,담당자\n수원시,미지정';
  assert.equal(extractCsvPayload(csv), csv);
});

test('UTF-8 BOM을 한 번만 붙인다', () => {
  const once = withUtf8Bom('시군,담당자');
  assert.equal(once.charCodeAt(0), 0xFEFF);
  assert.equal(withUtf8Bom(once), once);
});

test('파일명은 연-월 CSV다', () => {
  assert.equal(settlementFilename(new Date('2026-08-24T00:00:00.000Z')), '월별정산내역_2026-08.csv');
});
