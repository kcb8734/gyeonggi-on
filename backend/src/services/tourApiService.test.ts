import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TtlCache } from '../utils/ttlCache';
import {
  classifyFestival,
  formatYmd,
  getTourDetail,
  overlapsMonth,
  placeKind,
  resolveLDongRegnCd,
  searchFestivals,
  searchNearby,
  secureImageUrl,
  TourApiError,
} from './tourApiService';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function festivalEnvelope(items: unknown) {
  return {
    response: {
      header: { resultCode: '0000', resultMsg: 'OK' },
      body: { items: { item: items }, numOfRows: 10, pageNo: 1, totalCount: Array.isArray(items) ? items.length : 1 },
    },
  };
}

test('classifyFestival maps keywords to home categories', () => {
  assert.equal(classifyFestival('수원 야시장 플리마켓'), '플리마켓');
  assert.equal(classifyFestival('영동시장 먹거리 축제'), '먹거리');
  assert.equal(classifyFestival('어린이 가족 체험 한마당'), '가족');
  assert.equal(classifyFestival('세미원 연꽃문화제'), '계절축제');
  assert.equal(classifyFestival('수원 국가유산야행'), '문화/예술');
});

test('formatYmd and overlapsMonth handle TourAPI dates', () => {
  assert.equal(formatYmd('20260815'), '2026-08-15');
  assert.equal(overlapsMonth('20260801', '20260831', 2026, 8), true);
  assert.equal(overlapsMonth('20260720', '20260805', 2026, 8), true);
  assert.equal(overlapsMonth('20260901', '20260910', 2026, 8), false);
});

test('resolveLDongRegnCd maps Gyeonggi areaCode 31 to 41', () => {
  assert.equal(resolveLDongRegnCd('31'), '41');
  assert.equal(resolveLDongRegnCd('31', '41'), '41');
  assert.equal(resolveLDongRegnCd('99'), undefined);
});

test('secureImageUrl upgrades http image hosts', () => {
  assert.equal(
    secureImageUrl('http://tong.visitkorea.or.kr/cms/photo.jpg'),
    'https://tong.visitkorea.or.kr/cms/photo.jpg',
  );
  assert.equal(secureImageUrl(''), undefined);
});

test('placeKind maps contentTypeId', () => {
  assert.equal(placeKind('39'), 'food');
  assert.equal(placeKind('12'), 'attraction');
  assert.equal(placeKind('15'), 'festival');
  assert.equal(placeKind('14'), 'culture');
});

test('searchFestivals uses lDongRegnCd 41 and caches the result', async () => {
  let calls = 0;
  let calledUrl = '';
  const fetchImpl: typeof fetch = async (input) => {
    calls += 1;
    calledUrl = String(input);
    return jsonResponse(festivalEnvelope({
      contentid: '1234',
      contenttypeid: '15',
      title: '세미원 연꽃문화제',
      addr1: '경기도 양평군',
      eventstartdate: '20260801',
      eventenddate: '20260820',
      firstimage: 'http://tong.visitkorea.or.kr/a.jpg',
      mapx: '127.3',
      mapy: '37.5',
    }));
  };

  const cache = new TtlCache(60_000, () => 1);
  const first = await searchFestivals(
    { areaCode: '31', month: 8, year: 2026 },
    { serviceKey: 'test-key', fetchImpl, cache, baseUrl: 'https://apis.data.go.kr/B551011/KorService2' },
  );
  const second = await searchFestivals(
    { areaCode: '31', month: 8, year: 2026 },
    { serviceKey: 'test-key', fetchImpl, cache, baseUrl: 'https://apis.data.go.kr/B551011/KorService2' },
  );

  assert.equal(calls, 1);
  assert.match(calledUrl, /searchFestival2/);
  assert.match(calledUrl, /lDongRegnCd=41/);
  assert.match(calledUrl, /eventStartDate=20260801/);
  assert.match(calledUrl, /eventEndDate=20260831/);
  assert.doesNotMatch(calledUrl, /areaCode=31/);
  assert.equal(first.length, 1);
  assert.equal(first[0].title, '세미원 연꽃문화제');
  assert.equal(first[0].category, '계절축제');
  assert.equal(first[0].firstImage, 'https://tong.visitkorea.or.kr/a.jpg');
  assert.equal(second[0].contentId, '1234');
});

test('searchFestivals filters by category after mapping', async () => {
  const fetchImpl: typeof fetch = async () => jsonResponse(festivalEnvelope([
    {
      contentid: '1',
      title: '수원 야시장 플리마켓',
      eventstartdate: '20260810',
      eventenddate: '20260812',
      mapx: '127',
      mapy: '37',
    },
    {
      contentid: '2',
      title: '수원화성문화제',
      eventstartdate: '20260810',
      eventenddate: '20260820',
      mapx: '127',
      mapy: '37',
    },
  ]));

  const list = await searchFestivals(
    { areaCode: '31', month: 8, year: 2026, category: '플리마켓' },
    { serviceKey: 'k', fetchImpl, cache: new TtlCache() },
  );
  assert.equal(list.length, 1);
  assert.equal(list[0].title, '수원 야시장 플리마켓');
});

test('searchNearby keeps food, attraction, culture and festival pins', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    assert.match(String(input), /locationBasedList2/);
    assert.match(String(input), /mapX=127.013/);
    assert.match(String(input), /radius=3000/);
    return jsonResponse(festivalEnvelope([
      { contentid: 'a', contenttypeid: '39', title: '행궁 한정식', addr1: '수원', mapx: '127.01', mapy: '37.28', dist: '120' },
      { contentid: 'b', contenttypeid: '12', title: '화성행궁', addr1: '수원', mapx: '127.01', mapy: '37.28', dist: '80' },
      { contentid: 'c', contenttypeid: '32', title: '호텔', addr1: '수원', mapx: '127.01', mapy: '37.28', dist: '90' },
    ]));
  };

  const places = await searchNearby(
    { mapX: 127.013, mapY: 37.287, radius: 3000 },
    { serviceKey: 'k', fetchImpl, cache: new TtlCache() },
  );
  assert.equal(places.length, 2);
  assert.equal(places[0].kind, 'food');
  assert.equal(places[1].kind, 'attraction');
});

test('getTourDetail merges common, intro fee and image gallery', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('/detailCommon2')) {
      assert.doesNotMatch(url, /defaultYN|overviewYN/);
      return jsonResponse(festivalEnvelope({
        contentid: '999',
        contenttypeid: '15',
        title: '수원 국가유산야행',
        addr1: '경기도 수원시',
        tel: '031-123-4567',
        overview: '수원화성에서 열리는 야간 축제',
        firstimage: 'http://tong.visitkorea.or.kr/main.jpg',
        mapx: '127.013',
        mapy: '37.287',
      }));
    }
    if (url.includes('/detailIntro2')) {
      return jsonResponse(festivalEnvelope({
        usetimefestival: '무료',
        playtime: '18:00 ~ 22:00',
        eventplace: '화성행궁',
        eventstartdate: '20260820',
        eventenddate: '20260824',
      }));
    }
    if (url.includes('/detailImage2')) {
      assert.doesNotMatch(url, /subImageYN/);
      return jsonResponse(festivalEnvelope({
        originimgurl: 'http://tong.visitkorea.or.kr/gallery.jpg',
        imgname: '야경',
      }));
    }
    throw new Error(`unexpected url ${url}`);
  };

  const detail = await getTourDetail('999', '15', {
    serviceKey: 'k',
    fetchImpl,
    cache: new TtlCache(),
  });
  assert.equal(detail.title, '수원 국가유산야행');
  assert.equal(detail.fee, '무료');
  assert.equal(detail.tel, '031-123-4567');
  assert.equal(detail.images.length, 2);
  assert.equal(detail.eventPlace, '화성행궁');
});

test('searchFestivals throws when service key is missing', async () => {
  const prevTour = process.env.TOUR_API_SERVICE_KEY;
  const prevNts = process.env.NTS_SERVICE_KEY;
  delete process.env.TOUR_API_SERVICE_KEY;
  delete process.env.NTS_SERVICE_KEY;
  await assert.rejects(
    () => searchFestivals({}, { serviceKey: '', cache: new TtlCache() }),
    (err: unknown) => err instanceof TourApiError && err.statusCode === 500,
  );
  if (prevTour !== undefined) process.env.TOUR_API_SERVICE_KEY = prevTour;
  if (prevNts !== undefined) process.env.NTS_SERVICE_KEY = prevNts;
});
