import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KOR_SERVICE2, resolveFestivalQuery } from './tourLive.js';

test('GYEONGGI uses KorService2 searchFestival2 with lDongRegnCd 41, not KorService1', () => {
  const query = resolveFestivalQuery({ metro: 'GYEONGGI' });
  assert.equal(query.baseUrl, KOR_SERVICE2);
  assert.equal(query.path, '/searchFestival2');
  assert.equal(query.params.lDongRegnCd, '41');
  assert.equal(query.params.areaCode, undefined);
  assert.ok(!JSON.stringify(query).includes('KorService1'));
  assert.ok(!JSON.stringify(query).includes('searchFestival1'));
  assert.equal(query.params.contentTypeId, '15');
});

test('BUSAN uses lDongRegnCd 26 instead of legacy areaCode 6', () => {
  const query = resolveFestivalQuery({ metro: 'BUSAN' });
  assert.equal(query.metro, 'BUSAN');
  assert.equal(query.params.lDongRegnCd, '26');
  assert.equal(query.areaCode, '6');
  assert.equal(query.params.areaCode, undefined);
});

test('nationwide all omits region filters', () => {
  const query = resolveFestivalQuery({ areaCode: 'all' });
  assert.equal(query.nationwide, true);
  assert.equal(query.params.lDongRegnCd, undefined);
  assert.equal(query.params.areaCode, undefined);
  assert.equal(query.params.contentTypeId, '15');
});

test('year-wide festival query does not clamp to the current month', () => {
  const query = resolveFestivalQuery({ metro: 'SEOUL', year: 2026 });
  assert.equal(query.params.eventStartDate, '20260101');
  assert.equal(query.params.eventEndDate, undefined);
  assert.equal(query.params.numOfRows, '200');
});

test('searchFestival2 retries with areaCode=31 when lDongRegnCd returns empty', async () => {
  const prev = process.env.TOUR_API_SERVICE_KEY;
  process.env.TOUR_API_SERVICE_KEY = 'test-key';
  const urls = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    urls.push(url);
    const empty = { response: { header: { resultCode: '0000' }, body: { items: '' } } };
    const hit = {
      response: {
        header: { resultCode: '0000' },
        body: {
          items: {
            item: {
              contentid: '999',
              contenttypeid: '15',
              title: '수원화성문화제',
              addr1: '경기도 수원시',
              eventstartdate: '20260821',
              eventenddate: '20260911',
            },
          },
        },
      },
    };
    return {
      ok: true,
      json: async () => (url.includes('areaCode=31') ? hit : empty),
    };
  };
  try {
    const { searchFestival2 } = await import('./tourLive.js');
    const result = await searchFestival2({ metro: 'GYEONGGI', month: 8, year: 2026 }, fetchImpl);
    assert.equal(result.festivals.length, 1);
    assert.equal(result.festivals[0].title, '수원화성문화제');
    assert.ok(urls.some((url) => url.includes('lDongRegnCd=41')));
    assert.ok(urls.some((url) => url.includes('areaCode=31')));
  } finally {
    if (prev === undefined) delete process.env.TOUR_API_SERVICE_KEY;
    else process.env.TOUR_API_SERVICE_KEY = prev;
  }
});

test('searchFestival2 returns Gyeonggi fallback when TourAPI rate-limits', async () => {
  const prev = process.env.TOUR_API_SERVICE_KEY;
  process.env.TOUR_API_SERVICE_KEY = 'test-key';
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
  try {
    const { searchFestival2 } = await import('./tourLive.js');
    const result = await searchFestival2({ metro: 'GYEONGGI', month: 8, year: 2026 }, fetchImpl);
    assert.ok(result.festivals.length > 0);
    assert.ok(result.source === 'fallback' || result.source === 'cache');
    assert.ok(result.festivals.some((item) => item.title.includes('수원화성')));
  } finally {
    if (prev === undefined) delete process.env.TOUR_API_SERVICE_KEY;
    else process.env.TOUR_API_SERVICE_KEY = prev;
  }
});

test('searchFestival2 returns Seoul fallback when TourAPI rate-limits', async () => {
  const prev = process.env.TOUR_API_SERVICE_KEY;
  process.env.TOUR_API_SERVICE_KEY = 'test-key';
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
  try {
    const { searchFestival2 } = await import('./tourLive.js');
    const result = await searchFestival2({ metro: 'SEOUL' }, fetchImpl);
    assert.ok(result.festivals.length > 0);
    assert.equal(result.source, 'fallback');
    assert.ok(result.festivals.some((item) => item.title.includes('서울')));
  } finally {
    if (prev === undefined) delete process.env.TOUR_API_SERVICE_KEY;
    else process.env.TOUR_API_SERVICE_KEY = prev;
  }
});

test('searchFestival2 returns Daegu fallback instead of Gyeonggi', async () => {
  const prev = process.env.TOUR_API_SERVICE_KEY;
  process.env.TOUR_API_SERVICE_KEY = 'test-key';
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
  try {
    const { searchFestival2 } = await import('./tourLive.js');
    const result = await searchFestival2({ metro: 'DAEGU' }, fetchImpl);
    assert.ok(result.festivals.some((item) => item.title.includes('치맥')));
    assert.equal(result.festivals.some((item) => item.title.includes('수원화성')), false);
  } finally {
    if (prev === undefined) delete process.env.TOUR_API_SERVICE_KEY;
    else process.env.TOUR_API_SERVICE_KEY = prev;
  }
});

test('searchFestival2 allowBuiltin false does not inject builtin samples', async () => {
  const prev = process.env.TOUR_API_SERVICE_KEY;
  process.env.TOUR_API_SERVICE_KEY = 'test-key';
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
  try {
    const { liveTourFestivals, searchFestival2 } = await import('./tourLive.js');
    const result = await searchFestival2({ metro: 'JEJU', month: 3, year: 2024, allowBuiltin: false }, fetchImpl);
    assert.equal(result.festivals.length, 0);
    assert.equal(result.source, 'none');
    assert.deepEqual(liveTourFestivals(result), []);
  } finally {
    if (prev === undefined) delete process.env.TOUR_API_SERVICE_KEY;
    else process.env.TOUR_API_SERVICE_KEY = prev;
  }
});
