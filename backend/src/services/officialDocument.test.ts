import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOfficialDocumentHtml, buildSimplePdf, nextDocNumber } from './officialDocument';

test('doc number uses GON-YYYYMM-0001', () => {
  assert.equal(nextDocNumber(1, new Date('2026-08-23T00:00:00Z')), 'GON-202608-0001');
});

test('official html includes receiver and seal', () => {
  const html = buildOfficialDocumentHtml({
    docNumber: 'GON-202608-0001',
    issuedAt: '2026-08-23T01:00:00.000Z',
    merchantName: '화성행궁 한정식',
    businessNumber: '1234567890',
    address: '수원시',
    tel: '031-000-0000',
    bankName: '농협',
    bankAccount: '123',
    bankHolder: '한정식',
    municipalityName: '수원시',
    festivalTitle: '수원화성문화제',
    receiver: '수원시장',
    referDept: '관광과',
    scans: [{ at: '2026-08-23T01:00:00.000Z', title: '10% 할인', amountWon: 1000, qrId: 'GYON-AA' }],
    totalCount: 1,
    totalAmount: 1000,
  });
  assert.match(html, /수원시장/);
  assert.match(html, /직인/);
  assert.match(html, /GYON-AA/);
});

test('simple pdf starts with PDF header', () => {
  const pdf = buildSimplePdf('hello');
  assert.ok(pdf.toString('utf8').startsWith('%PDF-1.4'));
});
