import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adminExcelCsv,
  couponMasterToCsv,
  extractCsvPayload,
  looksLikeCsv,
  settlementFilename,
  withUtf8Bom,
} from './csvDownload';

test('JSON {csv} 응답에서 본문만 꺼낸다', () => {
  const raw = JSON.stringify({ success: true, csv: '시군,담당자\n수원시,미지정' });
  assert.equal(extractCsvPayload(raw), '시군,담당자\n수원시,미지정');
});

test('이미 CSV면 그대로 둔다', () => {
  const csv = '\uFEFF시군,담당자\n수원시,미지정';
  assert.equal(extractCsvPayload(csv), csv);
});

test('HTML 응답은 CSV로 쓰지 않는다', () => {
  assert.equal(extractCsvPayload('<!DOCTYPE html><html><body>ok</body></html>'), '');
  assert.equal(looksLikeCsv('<html>not csv</html>'), false);
  assert.equal(looksLikeCsv('쿠폰코드,축제\nCP-1001,수원화성문화제'), true);
});

test('UTF-8 BOM을 한 번만 붙인다', () => {
  const once = withUtf8Bom('시군,담당자');
  assert.equal(once.charCodeAt(0), 0xFEFF);
  assert.equal(withUtf8Bom(once), once);
});

test('파일명은 연-월 CSV다', () => {
  assert.equal(settlementFilename(new Date('2026-08-24T00:00:00.000Z')), '월별정산내역_2026-08.csv');
});

test('쿠폰 마스터와 매칭을 한 파일로 합친다', () => {
  const csv = adminExcelCsv({
    coupons: [{ id: 'CP-1001', festival: '수원화성문화제', store: '행궁 한정식', issued: 12, used: 4, recovery: 33, period: '2026-08', region: 'GYEONGGI', couponType: 'OFFICIAL' }],
    matching: [{ regionLabel: '경기온', city: '수원시', officerName: '미지정', stores: 3, festivals: 2, coupons: 8, approved: true }],
  });
  assert.match(csv, /쿠폰코드,축제/);
  assert.match(csv, /CP-1001/);
  assert.match(csv, /권역,시군/);
  assert.match(couponMasterToCsv([{ id: 'CP-1', festival: '축제' }]), /CP-1/);
});
