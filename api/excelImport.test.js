import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyProfile,
  buildTemplateBuffer,
  canon,
  decodeExcelPayload,
  importExcelFromPayload,
  loadXlsx,
  parseWorkbook,
  persistSheets,
  resolveTableName,
  toBool,
  toDate,
} from './excelImport.js';

test('canon and Korean sheet aliases', () => {
  assert.equal(canon(' 지자체 명 '), '지자체명');
  assert.equal(resolveTableName('가맹점'), 'merchants');
  assert.equal(resolveTableName('축제정보'), 'festivals');
  assert.equal(resolveTableName('프로모션'), 'discount_promotions');
});

test('maps Korean municipality and merchant rows', () => {
  const muni = applyProfile(
    { 지자체명: '수원시', 지역코드: 'GG_SUWON', 예산잔액: '50,000,000' },
    'municipalities',
  );
  assert.equal(muni.name, '수원시');
  assert.equal(muni.region_code, 'GG_SUWON');
  assert.equal(muni.budget_balance, 50000000);

  const merchant = applyProfile(
    {
      상호명: '화성행궁 한정식',
      사업자등록번호: '123-45-00001',
      업종: '음식점',
      주소: '경기도 수원시',
      인증여부: '예',
    },
    'merchants',
  );
  assert.equal(merchant.business_name, '화성행궁 한정식');
  assert.equal(merchant.is_verified, true);
  assert.ok(merchant.owner_user_id);
});

test('date and bool helpers', () => {
  assert.equal(toDate('2026-09-01'), '2026-09-01');
  assert.equal(toDate(new Date('2026-09-08T12:00:00Z')), '2026-09-08');
  assert.equal(toBool('아니오'), false);
  assert.equal(toBool('Y'), true);
});

test('required columns are validated', () => {
  assert.throws(
    () => applyProfile({ 축제명: '없는축제' }, 'festivals'),
    /필수 값/,
  );
});

test('decodeExcelPayload rejects missing or huge files', () => {
  assert.throws(() => decodeExcelPayload({}), /엑셀 파일/);
  assert.throws(
    () => decodeExcelPayload({ filename: 'note.txt', content: Buffer.from('PK\u0003\u0004xxxx').toString('base64') }),
    /xlsx/,
  );
});

test('template round-trip parses Korean sheets', () => {
  assert.ok(loadXlsx(), 'xlsx must be installed in backend/node_modules');
  const buffer = buildTemplateBuffer();
  const sheets = parseWorkbook(buffer);
  const byName = Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet.rows]));
  assert.equal(byName['지자체'][0]['지자체명'], '수원시');
  const festival = applyProfile(byName['축제'][0], 'festivals');
  assert.equal(festival.title, '수원화성문화제');
  assert.equal(festival.start_date, '2026-09-01');
});

function fakeDb(options = {}) {
  const calls = [];
  const municipalityId = '11111111-1111-4111-8111-111111111111';
  return {
    calls,
    async connect() {
      return {
        async query(sql, params = []) {
          calls.push({ sql: String(sql), params });
          if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(sql)) return { rows: [] };
          if (/SELECT id FROM municipalities/i.test(sql) && !/INSERT/i.test(sql)) {
            return { rows: options.missingMunicipality ? [] : [{ id: municipalityId }] };
          }
          if (/SELECT id FROM merchants/i.test(sql) && !/INSERT/i.test(sql)) {
            return { rows: [{ id: '22222222-2222-4222-8222-222222222222' }] };
          }
          if (/SELECT id FROM festivals/i.test(sql) && !/INSERT/i.test(sql)) {
            return { rows: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }] };
          }
          if (/RETURNING id/i.test(sql)) {
            return { rows: [{ id: municipalityId }] };
          }
          return { rows: [] };
        },
        release() {},
      };
    },
  };
}

test('persistSheets dry-run upserts municipalities', async () => {
  const db = fakeDb();
  const result = await persistSheets(
    [{ name: '지자체', rows: [{ 지자체명: '수원시', 지역코드: 'GG_SUWON', 예산잔액: 1 }] }],
    { db, dryRun: true },
  );
  assert.equal(result.ok, true);
  assert.equal(result.persisted, false);
  assert.equal(result.sheets[0].inserted, 1);
  assert.ok(db.calls.some((call) => /INSERT INTO municipalities/i.test(call.sql)));
  assert.ok(db.calls.some((call) => /ROLLBACK/i.test(call.sql)));
});

test('importExcelFromPayload without DATABASE_URL still previews a template', async () => {
  const buffer = buildTemplateBuffer();
  const result = await importExcelFromPayload(
    { filename: 'import.xlsx', content: buffer.toString('base64') },
    { db: null, dryRun: true },
  );
  assert.equal(result.ok, true);
  assert.equal(result.persisted, false);
  assert.ok(result.sheets.length >= 3);
});
