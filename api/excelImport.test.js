import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyProfile,
  analyzeExcelFromPayload,
  analyzeSheets,
  buildTemplateBuffer,
  canon,
  combineYmdParts,
  crawlPlannedMetros,
  decodeExcelPayload,
  importExcelFromPayload,
  isSkippedSheet,
  joinSigungu,
  loadXlsx,
  mapSurveyLetters,
  metroFromText,
  parsePeriod,
  parseWorkbook,
  persistSheets,
  recordsFromAoa,
  recordsFromSurveyAoa,
  resolveTableName,
  toBool,
  toDate,
} from './excelImport.js';

test('canon and Korean sheet aliases', () => {
  assert.equal(canon(' 지자체 명 '), '지자체명');
  assert.equal(resolveTableName('가맹점'), 'merchants');
  assert.equal(resolveTableName('축제정보'), 'festivals');
  assert.equal(resolveTableName('조사표'), 'festivals');
  assert.equal(resolveTableName('프로모션'), 'discount_promotions');
  assert.equal(resolveTableName('총괄'), '');
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
  assert.equal(toDate(2026), null);
  assert.equal(toDate('2026'), null);
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
  assert.ok(result.analysis?.crawlPlan?.some((row) => row.metro === 'GYEONGGI'));
});

test('metroFromText maps Gyeonggi cities', () => {
  assert.equal(metroFromText('수원시'), 'GYEONGGI');
  assert.equal(metroFromText('경기온'), 'GYEONGGI');
  assert.equal(metroFromText('경기도'), 'GYEONGGI');
  assert.equal(metroFromText('GYEONGGI'), 'GYEONGGI');
});

test('analyzeSheets plans TourAPI crawl for template metros', () => {
  const buffer = buildTemplateBuffer();
  const sheets = parseWorkbook(buffer);
  const analysis = analyzeSheets(sheets);
  assert.equal(analysis.totals.sheets, 4);
  assert.ok(analysis.totals.valid >= 4);
  assert.ok(analysis.cities.includes('수원시'));
  assert.equal(analysis.crawlPlan[0].metro, 'GYEONGGI');
});

test('analyzeExcelFromPayload returns crawl plan', () => {
  const buffer = buildTemplateBuffer();
  const result = analyzeExcelFromPayload({ filename: 'import.xlsx', content: buffer.toString('base64') });
  assert.equal(result.ok, true);
  assert.match(result.message, /크롤링 권역/);
  assert.ok(result.analysis.crawlPlan.length >= 1);
});

test('crawlPlannedMetros uses injected search and persist', async () => {
  const result = await crawlPlannedMetros(['GYEONGGI'], {
    crawlVisitkoreaCalendar: async () => ({ festivals: [], byMetro: new Map(), days: 0 }),
    searchFestival2: async () => ({
      festivals: [{ contentId: 'x1', title: '수원화성문화제', eventStartDate: '2026-09-01' }],
      source: 'fake',
    }),
    persistTourFestivals: async (rows) => ({ ok: true, upserted: rows.length, skipped: 0, message: 'ok' }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.fetched, 1);
  assert.equal(result.upserted, 1);
  assert.equal(result.runs[0].metro, 'GYEONGGI');
  assert.equal(result.runs[0].source, 'fake');
});

function letterRow({ title, place, si, gu, sy, sm, sd, ey, em, ed }) {
  const row = Array(17).fill('');
  row[4] = title;
  row[6] = place;
  row[8] = si;
  row[9] = gu;
  row[11] = sy;
  row[12] = sm;
  row[13] = sd;
  row[14] = ey;
  row[15] = em;
  row[16] = ed;
  return row;
}

function surveyWorkbook() {
  const XLSX = loadXlsx();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['조사명', '2026년 지역축제 개최계획'],
    ['대상', '전국 지자체'],
    ['건수', 2],
    ['작성', '공개용'],
  ]), '총괄');
  const header = letterRow({
    title: '축제명', place: '장소', si: '시', gu: '군구',
    sy: '시작', sm: '시작', sd: '시작', ey: '종료', em: '종료', ed: '종료',
  });
  header[0] = '연번';
  const units = letterRow({
    title: '', place: '', si: '', gu: '',
    sy: '년', sm: '월', sd: '일', ey: '년', em: '월', ed: '일',
  });
  const surveyRows = [
    ['2026년 지역축제 개최 계획 현황'],
    header,
    units,
    letterRow({
      title: '수원화성문화제', place: '수원화성 행궁광장', si: '수원', gu: '시',
      sy: 2026, sm: 9, sd: 1, ey: 2026, em: 9, ed: 30,
    }),
    letterRow({
      title: '한국민속촌 축제', place: '한국민속촌', si: '용인시', gu: '',
      sy: 2026, sm: 9, sd: 1, ey: 2026, em: 9, ed: 11,
    }),
    letterRow({ title: '합계', place: '', si: '', gu: '', sy: '', sm: '', sd: '', ey: '', em: '', ed: '' }),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(surveyRows), '조사표');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['문항', '항목'],
    [1, '시도'],
    [2, '시군구'],
  ]), '응답보기');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

test('parsePeriod splits combined festival dates', () => {
  assert.deepEqual(parsePeriod('2026.09.01 ~ 2026.09.30'), { start: '2026-09-01', end: '2026-09-30' });
  assert.deepEqual(parsePeriod('9.1~9.11', 2026), { start: '2026-09-01', end: '2026-09-11' });
  assert.equal(toDate('2026.4.5'), '2026-04-05');
  assert.equal(isSkippedSheet('총괄'), true);
  assert.equal(isSkippedSheet('응답보기'), true);
});

test('recordsFromAoa finds header below a title row', () => {
  const rows = recordsFromAoa([
    ['2026년 지역축제 개최 계획 현황'],
    ['1. 시군구', '2. 축제명', '3. 개최기간', '4. 개최장소'],
    ['수원시', '수원화성문화제', '2026.09.01 ~ 2026.09.30', '행궁광장'],
  ], { yearHint: 2026 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['2. 축제명'], '수원화성문화제');
});

test('analyzeExcelFromPayload maps 조사표 to festivals and skips 총괄', () => {
  const buffer = surveyWorkbook();
  const result = analyzeExcelFromPayload({
    filename: '2026년 지역축제 개최 계획 현황(공개용).xlsx',
    content: buffer.toString('base64'),
  });
  const byName = Object.fromEntries(result.analysis.sheets.map((row) => [row.sheet, row]));
  assert.equal(byName['총괄'].skipped, true);
  assert.equal(byName['총괄'].tableLabel, '건너뜀');
  assert.equal(byName['응답보기'].skipped, true);
  assert.equal(byName['조사표'].table, 'festivals');
  assert.equal(byName['조사표'].tableLabel, '축제');
  assert.equal(byName['조사표'].valid, 2);
  assert.ok(byName['조사표'].samples.includes('수원화성문화제'));
  assert.ok(result.analysis.cities.includes('수원시'));
  assert.equal(result.analysis.crawlPlan[0].metro, 'GYEONGGI');
});

test('applyProfile maps numbered survey headers and 개최기간', () => {
  const mapped = applyProfile({
    '1. 시도': '경기도',
    '2. 시군구': '가평군',
    '3. 축제명': '자라섬 재즈페스티벌',
    '4. 개최기간': '2026.08.22 ~ 2026.09.05',
    '5. 개최장소': '자라섬',
  }, 'festivals', { yearHint: 2026 });
  assert.equal(mapped.title, '자라섬 재즈페스티벌');
  assert.equal(mapped.start_date, '2026-08-22');
  assert.equal(mapped.end_date, '2026-09-05');
  assert.equal(mapped.location_name, '자라섬');
});

test('persistSheets skips 총괄/응답보기 and upserts 조사표 festivals', async () => {
  const buffer = surveyWorkbook();
  const sheets = parseWorkbook(buffer, { yearHint: 2026 });
  const db = fakeDb();
  const result = await persistSheets(sheets, { db, dryRun: true, yearHint: 2026 });
  assert.equal(result.ok, true);
  const byName = Object.fromEntries(result.sheets.map((row) => [row.sheet, row]));
  assert.equal(byName['총괄'].skipped, true);
  assert.equal(byName['응답보기'].skipped, true);
  assert.equal(byName['조사표'].table, 'festivals');
  assert.equal(byName['조사표'].inserted, 2);
  assert.ok(db.calls.some((call) => /INSERT INTO festivals/i.test(call.sql)));
  assert.ok(db.calls.some((call) => /INSERT INTO municipalities/i.test(call.sql) || /SELECT id FROM municipalities/i.test(call.sql)));
});

test('public-data festival columns map without 조사표 sheet name', () => {
  const analysis = analyzeSheets([{
    name: 'Sheet1',
    rows: [{
      축제명: '구리한강유채꽃축제',
      시군구명: '구리시',
      축제시작일자: '2026-04-10',
      축제종료일자: '2026-04-12',
      개최장소: '한강시민공원',
    }],
  }]);
  assert.equal(analysis.sheets[0].table, 'festivals');
  assert.equal(analysis.sheets[0].valid, 1);
  assert.equal(analysis.cities[0], '구리시');
});

test('조사표 letter map uses E G I.J L.M.N O.P.Q', () => {
  assert.equal(joinSigungu('수원', '시'), '수원시');
  const mapped = mapSurveyLetters(letterRow({
    title: '수원화성문화제',
    place: '행궁광장',
    si: '수원',
    gu: '시',
    sy: 2026,
    sm: 9,
    sd: 1,
    ey: 2026,
    em: 9,
    ed: 30,
  }), 2026);
  assert.equal(mapped.축제명, '수원화성문화제');
  assert.equal(mapped.개최장소, '행궁광장');
  assert.equal(mapped.시군구, '수원시');
  assert.equal(mapped.시작일, '2026-09-01');
  assert.equal(mapped.종료일, '2026-09-30');
});

test('recordsFromSurveyAoa reads letter columns even with title/header rows', () => {
  const rows = recordsFromSurveyAoa([
    ['2026년 지역축제 개최 계획 현황'],
    letterRow({
      title: '축제명', place: '장소', si: '시', gu: '군구',
      sy: '년', sm: '월', sd: '일', ey: '년', em: '월', ed: '일',
    }),
    letterRow({
      title: '자라섬 재즈페스티벌', place: '자라섬', si: '가평', gu: '군',
      sy: 2026, sm: 8, sd: 22, ey: 2026, em: 9, ed: 5,
    }),
  ], { yearHint: 2026, sheetName: '조사표' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].축제명, '자라섬 재즈페스티벌');
  assert.equal(rows[0].시군구, '가평군');
  assert.equal(rows[0].시작일, '2026-08-22');
  assert.equal(rows[0].종료일, '2026-09-05');
  assert.equal(rows[0].개최장소, '자라섬');
});

test('survey start/end year headers do not fail date mapping', () => {
  assert.equal(combineYmdParts(2026, 9, 1, 2026), '2026-09-01');
  assert.equal(combineYmdParts(2026, null, null, 2026, 'start'), '2026-01-01');
  assert.equal(combineYmdParts(2026, null, null, 2026, 'end'), '2026-12-31');
  assert.equal(combineYmdParts(2026, 9, null, 2026, 'start'), '2026-09-01');
  assert.equal(combineYmdParts(2026, 9, '미정', 2026, 'end'), '2026-09-30');
  const rows = recordsFromSurveyAoa([
    letterRow({
      title: '축제명', place: '장소', si: '시', gu: '군구',
      sy: '시작', sm: '월', sd: '일', ey: '종료', em: '월', ed: '일',
    }),
    letterRow({
      title: '수원화성문화제', place: '행궁광장', si: '수원', gu: '시',
      sy: 2026, sm: 9, sd: 1, ey: 2026, em: 9, ed: 30,
    }),
  ], { yearHint: 2026, sheetName: '조사표' });
  assert.equal(rows[0].시작, 2026);
  const mapped = applyProfile(rows[0], 'festivals', { yearHint: 2026 });
  assert.equal(mapped.title, '수원화성문화제');
  assert.equal(mapped.start_date, '2026-09-01');
  assert.equal(mapped.end_date, '2026-09-30');
  assert.equal(mapped.location_name, '행궁광장');

  const merged = applyProfile({
    축제명: '한국민속촌 축제',
    장소: '한국민속촌',
    시군구: '용인시',
    시작: 2026,
    월: 9,
    일: 1,
    종료: 2026,
    시작일: '2026-09-01',
    종료일: '2026-09-11',
    __sheet: '조사표',
    __surveyLetters: true,
    __cells: letterRow({
      title: '한국민속촌 축제', place: '한국민속촌', si: '용인시', gu: '',
      sy: 2026, sm: 9, sd: 1, ey: 2026, em: 9, ed: 11,
    }),
  }, 'festivals', { yearHint: 2026 });
  assert.equal(merged.start_date, '2026-09-01');
  assert.equal(merged.end_date, '2026-09-11');
});

test('survey year-month without day uses first and last day', () => {
  const mapped = mapSurveyLetters(letterRow({
    title: '월천축제', place: '광장', si: '수원', gu: '시',
    sy: 2026, sm: 9, sd: '', ey: 2026, em: 9, ed: '미정',
  }), 2026);
  assert.equal(mapped.시작일, '2026-09-01');
  assert.equal(mapped.종료일, '2026-09-30');
  const profile = applyProfile({
    ...mapped,
    __sheet: '조사표',
    __surveyLetters: true,
    __cells: letterRow({
      title: '월천축제', place: '광장', si: '수원', gu: '시',
      sy: 2026, sm: 9, sd: '', ey: 2026, em: 9, ed: '미정',
    }),
  }, 'festivals', { yearHint: 2026 });
  assert.equal(profile.start_date, '2026-09-01');
  assert.equal(profile.end_date, '2026-09-30');
});

test('year-only survey dates use Jan 1 to Dec 31 and undated rows are skipped', () => {
  const yearOnly = mapSurveyLetters(letterRow({
    title: '연도축제', place: '광장', si: '수원', gu: '시',
    sy: 2026, sm: '', sd: '', ey: 2026, em: '', ed: '',
  }), 2026);
  assert.equal(yearOnly.시작일, '2026-01-01');
  assert.equal(yearOnly.종료일, '2026-12-31');
  const profile = applyProfile({
    ...yearOnly,
    __sheet: '조사표',
    __surveyLetters: true,
    __cells: letterRow({
      title: '연도축제', place: '광장', si: '수원', gu: '시',
      sy: 2026, sm: '', sd: '', ey: 2026, em: '', ed: '',
    }),
  }, 'festivals', { yearHint: 2026 });
  assert.equal(profile.start_date, '2026-01-01');
  assert.equal(profile.end_date, '2026-12-31');

  const analysis = analyzeSheets([{
    name: '조사표',
    rows: [{
      축제명: '일정 없는 축제',
      시군구: '수원시',
      장소: '광장',
    }],
  }], { yearHint: 2026 });
  assert.equal(analysis.totals.valid, 0);
  assert.equal(analysis.totals.errors, 0);
  assert.equal(analysis.totals.skippedUndated, 1);
});

test('persistSheets batches festival inserts', async () => {
  const db = fakeDb();
  const result = await persistSheets([{
    name: '조사표',
    rows: [
      { 축제명: '수원화성문화제', 시군구: '수원시', 시작일: '2026-09-01', 종료일: '2026-09-02', 장소: '행궁' },
      { 축제명: '한국민속촌 축제', 시군구: '용인시', 시작일: '2026-09-03', 종료일: '2026-09-04', 장소: '민속촌' },
    ],
  }], { db, dryRun: true, yearHint: 2026 });
  assert.equal(result.ok, true);
  assert.equal(result.sheets[0].inserted, 2);
  const festivalInserts = db.calls.filter((call) => /INSERT INTO festivals/i.test(call.sql));
  assert.equal(festivalInserts.length, 1);
  assert.match(festivalInserts[0].sql, /VALUES \(\$1/);
  assert.ok(festivalInserts[0].sql.includes('), ('));
});

test('crawlPlannedMetros prefers 구석구석 calendar', async () => {
  const byMetro = new Map([['GYEONGGI', [{ contentId: 'kfes-1', title: '수원화성문화제', eventStartDate: '2026-09-01' }]]]);
  const result = await crawlPlannedMetros(['GYEONGGI'], {
    year: 2026,
    months: [9],
    crawlVisitkoreaCalendar: async (input) => {
      assert.equal(input.year, 2026);
      assert.deepEqual(input.months, [9]);
      return { festivals: byMetro.get('GYEONGGI'), byMetro, days: 8, source: 'visitkorea' };
    },
    searchFestival2: async () => { throw new Error('should not call TourAPI'); },
    persistTourFestivals: async (rows) => ({ ok: true, upserted: rows.length, skipped: 0, message: 'ok' }),
  });
  assert.equal(result.runs[0].source, 'visitkorea');
  assert.equal(result.fetched, 1);
});
