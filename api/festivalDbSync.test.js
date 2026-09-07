import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clipFestivalTel, festivalDateYmd, listedMetroForRow, listPersistedFestivals, mergeHomeFestivalRows, municipalityFromAddress, municipalityRegionCode, persistTourFestivals, rowMatchesMetro, rowToTourDetail } from './festivalDbSync.js';

test('municipalityFromAddress maps Gyeonggi cities', () => {
  assert.equal(municipalityFromAddress('경기도 수원시 팔달구 정조로 825'), '수원시');
  assert.equal(municipalityFromAddress('경기도 용인시 기흥구'), '용인시');
  assert.equal(municipalityFromAddress('서울특별시 중구'), '중구');
  assert.equal(municipalityRegionCode('수원시'), 'GG_수원시');
});

test('municipalityFromAddress maps other metros when zone is given', () => {
  assert.equal(municipalityFromAddress('부산광역시 해운대구', 'BUSAN'), '해운대구');
  assert.equal(municipalityRegionCode('해운대구', 'BUSAN'), 'BUSAN_해운대구');
});

test('festivalDateYmd accepts YYYYMMDD, ISO, and dotted dates', () => {
  assert.equal(festivalDateYmd('20260919'), '2026-09-19');
  assert.equal(festivalDateYmd('2026-09-19 00:00:00.0'), '2026-09-19');
  assert.equal(festivalDateYmd('2026.09.19'), '2026-09-19');
  assert.equal(festivalDateYmd(new Date(Date.UTC(2026, 8, 19))), '2026-09-19');
});

test('listedMetroForRow maps open-data sources onto 17 metros', () => {
  assert.equal(listedMetroForRow({ source: 'seoul', title: '서울빛초롱축제' }), 'SEOUL');
  assert.equal(listedMetroForRow({ source: 'ggc', title: '수원화성문화제', location_name: '수원' }), 'GYEONGGI');
  assert.equal(listedMetroForRow({ source: 'ifac', location_name: '인천종합문화예술회관', municipality_name: '남동구' }), 'INCHEON');
  assert.equal(listedMetroForRow({ source: 'ifac', location_name: '서초구', municipality_name: '서울특별시' }), 'SEOUL');
  assert.equal(listedMetroForRow({ source: 'muni', metro: 'ULSAN', title: '간절곶 해맞이 축제' }), 'ULSAN');
  assert.equal(listedMetroForRow({ source: 'muni', metro: 'SEJONG', location_name: '세종호수공원' }), 'SEJONG');
  assert.equal(listedMetroForRow({ source: 'kfes', location_name: '충청남도 부여군 부여읍 정림로 83', title: '미디어아트 부여' }), 'CHUNGNAM');
  assert.equal(rowMatchesMetro({ source: 'ggc', title: '수원화성문화제' }, 'GYEONGGI'), true);
  assert.equal(rowMatchesMetro({ source: 'seoul', title: '서울빛초롱축제' }, 'GYEONGGI'), false);
});

test('mergeHomeFestivalRows keeps TourAPI as master over municipal duplicates', () => {
  const db = [{ title: '수원화성문화제', contentId: 'ggc-1', source: 'ggc', start_date: '2026-08-19', location_name: '수원' }];
  const tour = [
    { title: '수원화성문화제', contentId: 'tour-1', source: 'tour', start_date: '2026-08-19', location_name: '경기도 수원시' },
    { title: '가평 자라섬 재즈페스티벌', contentId: 'tour-2', source: 'tour', start_date: '2026-08-22', location_name: '가평' },
  ];
  const merged = mergeHomeFestivalRows(db, tour);
  assert.equal(merged[0].source, 'tour');
  assert.equal(merged.length, 2);
});

test('persist clips tel and municipality codes to schema limits', () => {
  assert.equal(clipFestivalTel(''), null);
  assert.equal(clipFestivalTel('031-228-3675'), '031-228-3675');
  const longTel = '경기도자미술관(이천) 031-645-0730 경기도자박물관(광주) 031-799-1500 경기생활도자미술관(여주) 031-887-8252';
  assert.equal(clipFestivalTel(longTel).length, 50);
  assert.ok(municipalityRegionCode('수원시').length <= 20);
});

test('rowToTourDetail reads 이용요금·홈페이지 extras from description', () => {
  const detail = rowToTourDetail({
    tour_content_id: '7bb92f39-bc94-44fc-94fb-13c974770bdf',
    title: '국가유산 미디어아트 부여 정림사지',
    location_name: '충청남도 부여군 부여읍 정림로 83 정림사지',
    latitude: 36.279,
    longitude: 126.913,
    start_date: '2026-09-07',
    end_date: '2026-09-27',
    tel: '041-837-1722',
    source: 'kfes',
    category: '문화/예술',
    image_url: 'https://kfescdn.visitkorea.or.kr/kfes/upload/contents/db/a.jpg',
    description: 'ZONE 1 빛의 경계\n[온앤온+ 수집]\n이용요금: 무료\n주최·주관: 국가유산청, 부여군/국가유산진흥원, 백제문화재단\n홈페이지: https://mediaartbuyeo.com/index.php',
  });
  assert.equal(detail.fee, '무료');
  assert.equal(detail.homepage, 'https://mediaartbuyeo.com/index.php');
  assert.equal(detail.organizer, '국가유산청, 부여군/국가유산진흥원, 백제문화재단');
  assert.equal(detail.source, 'kfes');
  assert.equal(detail.overview, 'ZONE 1 빛의 경계');
});

test('persistTourFestivals is a no-op without DATABASE_URL', async () => {
  const prev = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const result = await persistTourFestivals([
    { contentId: '1', title: '수원화성문화제', eventStartDate: '2026-08-21', address: '경기도 수원시' },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.upserted, 0);
  assert.match(result.message, /DATABASE_URL/);
  const listed = await listPersistedFestivals();
  assert.deepEqual(listed, []);
  if (prev !== undefined) process.env.DATABASE_URL = prev;
});
