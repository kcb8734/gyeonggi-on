import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  collectKfesCalendar,
  kfesImageUrl,
  metroFromKfesArea,
  parseFestivalExtras,
  parseKfesCalendarList,
  parseKfesCalendarMonth,
  parseKfesDetailHtml,
  syncKfesCalendar,
  toPersistableKfesFestival,
  uniqueKfesItems,
} from './kfesCalendarSync.js';

const MONTH = {
  data: [
    [
      { count: -1, day: 0, startCount: 0, ongoingCount: 0 },
      { count: 1, day: 7, startCount: 1, ongoingCount: 0 },
    ],
  ],
};

const BUYEO = {
  fstvlCntntsId: '7bb92f39-bc94-44fc-94fb-13c974770bdf',
  cntntsNm: '국가유산 미디어아트 부여 정림사지',
  regnDivCd: '34',
  areaNm: '충청남도 부여군',
  adres: '충청남도 부여군 부여읍 정림로 83',
  dtadr: '정림사지',
  fstvlBgngDe: '2026.09.07',
  fstvlEndDe: '2026.09.27',
  fstvlUtztfareInfo: null,
  fstvlAspcsNm: null,
  fstvlMngtNm: null,
  fstvlAspcsTelno: null,
  fstvlHmpgUrl: null,
  fstvlCrmnCn: 'ZONE 1 빛의 경계',
  dispFstvlCntntsImgRout: '/data/kfes/contents/db/7bb92f39-bc94-44fc-94fb-13c974770bdf_11.jpg',
};

const SEOUL = {
  fstvlCntntsId: '0b953976-095b-41ae-bb3a-ad54acaab94d',
  cntntsNm: '차 없는 잠수교 뚜벅뚜벅축제',
  regnDivCd: '1',
  areaNm: '서울특별시 서초구',
  adres: '서울특별시 서초구 반포동',
  dtadr: '잠수교',
  fstvlBgngDe: '2026.09.06',
  fstvlEndDe: '2026.09.25',
  fstvlCrmnCn: '달빛 놀이터',
};

const DAY = {
  dataList: {
    total: 2,
    page: 0,
    items: [BUYEO, SEOUL, BUYEO],
  },
};

const DETAIL_HTML = `
<div class="info_ico data"></div><p class="info_content">2026.09.07 ~ 2026.09.27</p>
<div class="info_ico location"></div><p class="info_content">충청남도 부여군 부여읍 정림로 83&nbsp;정림사지</p>
<div class="info_ico price"></div><p class="info_content">무료</p>
<div class="info_ico partner"></div><p class="info_content">국가유산청, 부여군/국가유산진흥원, 백제문화재단</p>
<div class="info_ico tell"></div><a href="tel:041-837-1722"><p class="info_content">041-837-1722</p></a>
<a class="homepage_link_btn" target="_blank" href="https://mediaartbuyeo.com/index.php">공식 홈페이지</a>
<strong>국가유산 미디어아트 부여 정림사지</strong>
var lat = '36.279025922934';
var lang = '126.91288060900419';
`;

test('달력 셀에서 축제가 있는 날짜만 고르고 중복 ID는 한 번만 남긴다', () => {
  const month = parseKfesCalendarMonth(JSON.stringify(MONTH));
  assert.deepEqual(month.days.map((row) => row.day), [7]);
  const list = parseKfesCalendarList(JSON.stringify(DAY));
  assert.equal(list.items.length, 3);
  assert.equal(uniqueKfesItems(list.items).length, 2);
});

test('목록 JSON을 정형 스키마로 매핑한다', () => {
  const item = toPersistableKfesFestival(BUYEO);
  assert.equal(item.contentId, BUYEO.fstvlCntntsId);
  assert.equal(item.title, '국가유산 미디어아트 부여 정림사지');
  assert.equal(item.eventStartDate, '2026-09-07');
  assert.equal(item.eventEndDate, '2026-09-27');
  assert.equal(item.address, '충청남도 부여군 부여읍 정림로 83 정림사지');
  assert.equal(item.metro, 'CHUNGNAM');
  assert.equal(item.source, 'kfes');
  assert.equal(
    item.firstImage,
    'https://kfescdn.visitkorea.or.kr/kfes/upload/contents/db/7bb92f39-bc94-44fc-94fb-13c974770bdf_11.jpg',
  );
  assert.equal(metroFromKfesArea('1', '서울특별시 서초구'), 'SEOUL');
  assert.match(kfesImageUrl('/data/kfes/contents/db/a.jpg'), /kfescdn\.visitkorea\.or\.kr/);
});

test('상세 HTML에서 요금·주최·전화·홈페이지를 뽑는다', () => {
  const detail = parseKfesDetailHtml(DETAIL_HTML);
  assert.equal(detail.fee, '무료');
  assert.equal(detail.organizer, '국가유산청, 부여군/국가유산진흥원, 백제문화재단');
  assert.equal(detail.tel, '041-837-1722');
  assert.equal(detail.official_url, 'https://mediaartbuyeo.com/index.php');
  assert.equal(detail.location, '충청남도 부여군 부여읍 정림로 83 정림사지');
  assert.equal(detail.mapY, 36.279025922934);
  assert.equal(detail.mapX, 126.91288060900419);
  const mapped = toPersistableKfesFestival(BUYEO, detail);
  assert.equal(mapped.fee, '무료');
  assert.match(mapped.overview, /이용요금: 무료/);
  assert.match(mapped.overview, /주최·주관:/);
  assert.match(mapped.overview, /홈페이지: https:\/\/mediaartbuyeo.com/);
  const extras = parseFestivalExtras(mapped.overview);
  assert.equal(extras.fee, '무료');
  assert.equal(extras.homepage, 'https://mediaartbuyeo.com/index.php');
});

test('목 fetch로 월별 달력·일자 목록·상세를 모아 동기화한다', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url).includes('festivalCalendarUp')) {
      return { ok: true, status: 200, text: async () => JSON.stringify(MONTH) };
    }
    if (String(url).includes('festivalCalendarList')) {
      return { ok: true, status: 200, text: async () => JSON.stringify(DAY) };
    }
    if (String(url).includes('fstvlDetail')) {
      return { ok: true, status: 200, text: async () => DETAIL_HTML };
    }
    return { ok: false, status: 404, text: async () => '' };
  };
  const collected = await collectKfesCalendar({
    fetchImpl,
    year: 2026,
    month: 9,
    maxDetails: 1,
    delayMs: 0,
    concurrency: 1,
  });
  assert.equal(collected.ok, true);
  assert.equal(collected.unique, 2);
  assert.equal(collected.items.length, 2);
  const buyeo = collected.items.find((row) => row.title.includes('정림사지'));
  assert.equal(buyeo.fee, '무료');
  assert.equal(buyeo.tel, '041-837-1722');
  assert.equal(buyeo.official_url, 'https://mediaartbuyeo.com/index.php');
  assert.ok(calls.some((url) => url.includes('festivalCalendarUp.do?year=2026&month=9')));
  assert.ok(calls.some((url) => url.includes('day=7')));
  const result = await syncKfesCalendar({
    fetchImpl,
    year: 2026,
    month: 9,
    maxDetails: 1,
    delayMs: 0,
    concurrency: 1,
  });
  assert.equal(result.source, 'kfes');
  assert.equal(result.targetApi, 'festivalCalendarList');
  assert.equal(result.fetched, 2);
  assert.match(result.message, /구석구석/);
});
