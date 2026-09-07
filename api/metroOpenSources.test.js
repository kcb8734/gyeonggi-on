import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogOpenSources, decorateOpenSources, matchLogToSource, metroApiRows } from './metroOpenSources.js';
import { rowsToFestivals } from './metroCultureGeneric.js';

test('catalog includes TourAPI, Seoul, Gyeonggi, Incheon, kfes and 17 tour metros plus 14 muni slots', () => {
  const catalog = catalogOpenSources();
  assert.equal(catalog.national.length, 5);
  assert.equal(catalog.national[0].id, 'tour');
  assert.equal(catalog.national[1].id, 'seoul');
  assert.equal(catalog.national[2].id, 'ggc');
  assert.equal(catalog.national[3].id, 'ifac');
  assert.equal(catalog.national[3].syncQuery.source, 'ifac');
  assert.equal(catalog.national[4].id, 'kfes');
  assert.equal(catalog.national[4].syncQuery.source, 'kfes');
  assert.equal(catalog.national[4].collectable, true);
  assert.equal(catalog.tourMetros.length, 17);
  assert.equal(catalog.muniMetros.length, 14);
  assert.ok(catalog.tourMetros.every((row) => row.syncQuery.source === 'tour' && row.syncQuery.metro));
  assert.ok(catalog.muniMetros.every((row) => row.syncQuery.source === 'muni'));
  assert.ok(!catalog.muniMetros.some((row) => row.metro === 'SEOUL' || row.metro === 'GYEONGGI' || row.metro === 'INCHEON'));
});

test('decorateOpenSources maps DB counts onto national and metro rows', () => {
  const catalog = catalogOpenSources();
  const board = decorateOpenSources(catalog, {
    sourceCounts: [
      { source: 'seoul', count: 12 },
      { source: 'ggc', count: 8 },
      { source: 'ifac', count: 5 },
      { source: 'tour', count: 20 },
    ],
    sourceMetroCounts: [
      { source: 'tour', metro: 'BUSAN', count: 4 },
      { source: 'muni', metro: 'BUSAN', count: 2 },
    ],
    logs: [
      { ran_at: '2026-08-30T00:00:00.000Z', target_api: 'culturalEventInfo', fetched: 12, status: '정상' },
      { ran_at: '2026-08-30T00:01:00.000Z', target_api: 'searchFestival2:BUSAN', fetched: 4, status: '정상' },
      { ran_at: '2026-08-30T00:02:00.000Z', target_api: 'ifac-culture', fetched: 5, status: '정상' },
    ],
  });
  assert.equal(board.national.find((row) => row.id === 'seoul')?.count, 12);
  assert.equal(board.national.find((row) => row.id === 'ggc')?.count, 8);
  assert.equal(board.national.find((row) => row.id === 'ifac')?.count, 5);
  assert.equal(board.tourMetros.find((row) => row.metro === 'BUSAN')?.count, 4);
  assert.equal(board.muniMetros.find((row) => row.metro === 'BUSAN')?.count, 2);
  assert.equal(matchLogToSource('culturalEventInfo'), 'seoul');
  assert.equal(matchLogToSource('searchFestival2:BUSAN'), 'tour-BUSAN');
  assert.equal(matchLogToSource('ifac-culture'), 'ifac');
  assert.equal(matchLogToSource('festivalCalendarList'), 'kfes');
  assert.equal(matchLogToSource('BUSAN_CULTURE'), 'muni-BUSAN');
});

test('generic municipal rows map Korean festival fields', () => {
  const items = rowsToFestivals([
    { fstvlNm: '부산불꽃축제', fstvlStartDate: '20261024', fstvlEndDate: '20261025', rdnmadr: '부산광역시 수영구', lat: '35.15', lng: '129.11' },
  ], 'BUSAN');
  assert.equal(items.length, 1);
  assert.equal(items[0].title, '부산불꽃축제');
  assert.equal(items[0].eventStartDate, '2026-10-24');
  assert.equal(items[0].metro, 'BUSAN');
  assert.ok(items[0].contentId);
});

test('builtin Busan/Gyeongnam/Ulsan/Sejong slots use NTS_SERVICE_KEY', () => {
  const prevNts = process.env.NTS_SERVICE_KEY;
  const prevData = process.env.DATA_GO_KR_SERVICE_KEY;
  process.env.NTS_SERVICE_KEY = 'test-shared-key';
  process.env.DATA_GO_KR_SERVICE_KEY = '';
  const catalog = catalogOpenSources();
  for (const metro of ['BUSAN', 'GYEONGNAM', 'ULSAN', 'SEJONG']) {
    const row = catalog.muniMetros.find((item) => item.metro === metro);
    assert.equal(row?.collectable, true, metro);
    assert.equal(row?.envHint, 'NTS_SERVICE_KEY');
  }
  assert.equal(catalog.muniMetros.find((item) => item.metro === 'DAEGU')?.collectable, false);
  process.env.NTS_SERVICE_KEY = prevNts;
  process.env.DATA_GO_KR_SERVICE_KEY = prevData;
});

test('Jeju nolda slot is collectable without a service key', () => {
  const prevNts = process.env.NTS_SERVICE_KEY;
  const prevData = process.env.DATA_GO_KR_SERVICE_KEY;
  const prevUrl = process.env.JEJU_CULTURE_API_URL;
  const prevKey = process.env.JEJU_CULTURE_API_KEY;
  process.env.NTS_SERVICE_KEY = '';
  process.env.DATA_GO_KR_SERVICE_KEY = '';
  process.env.JEJU_CULTURE_API_URL = '';
  process.env.JEJU_CULTURE_API_KEY = '';
  const catalog = catalogOpenSources();
  const jeju = catalog.muniMetros.find((item) => item.metro === 'JEJU');
  assert.equal(jeju?.collectable, true);
  assert.equal(jeju?.envHint, '인증 없음');
  assert.match(String(jeju?.description), /jejunolda/);
  assert.equal(catalog.muniMetros.find((item) => item.metro === 'DAEGU')?.collectable, false);
  process.env.NTS_SERVICE_KEY = prevNts;
  process.env.DATA_GO_KR_SERVICE_KEY = prevData;
  process.env.JEJU_CULTURE_API_URL = prevUrl;
  process.env.JEJU_CULTURE_API_KEY = prevKey;
});

test('metroApiRows is 17 metros with TourAPI and municipal checks', () => {
  const prevNts = process.env.NTS_SERVICE_KEY;
  const prevTour = process.env.TOUR_API_SERVICE_KEY;
  process.env.NTS_SERVICE_KEY = 'test-shared-key';
  process.env.TOUR_API_SERVICE_KEY = '';
  const board = decorateOpenSources(catalogOpenSources());
  assert.equal(board.metroApis.length, 17);
  assert.equal(metroApiRows(board).length, 17);
  const seoul = board.metroApis.find((row) => row.metro === 'SEOUL');
  assert.equal(seoul?.tourConnected, true);
  assert.equal(seoul?.muniConnected, true);
  assert.equal(seoul?.syncQuery?.source, 'region');
  const jeju = board.metroApis.find((row) => row.metro === 'JEJU');
  assert.equal(jeju?.muniConnected, true);
  const daegu = board.metroApis.find((row) => row.metro === 'DAEGU');
  assert.equal(daegu?.tourConnected, true);
  assert.equal(daegu?.muniConnected, false);
  const busan = board.metroApis.find((row) => row.metro === 'BUSAN');
  assert.equal(busan?.muniConnected, true);
  process.env.NTS_SERVICE_KEY = prevNts;
  process.env.TOUR_API_SERVICE_KEY = prevTour;
});
