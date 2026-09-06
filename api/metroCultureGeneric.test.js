import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  openApiFault,
  parseMunicipalPayload,
  rowsToFestivals,
  syncMunicipalCultureEvents,
  xmlRows,
} from './metroCultureGeneric.js';
import { hintMetroFromSource, municipalCultureUrls } from './metroCultureDefaults.js';

const ULSAN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rfcOpenApi><header><resultCode>00</resultCode><resultMsg>success</resultMsg></header>
<body><totalCount>1</totalCount><data>
<list>
  <unqId>14</unqId>
  <dvsn1Nm>축제</dvsn1Nm>
  <title><![CDATA[간절곶 해맞이 축제]]></title>
  <roadNmAddr><![CDATA[울산광역시 울주군 서생면 간절곶1길 39-2]]></roadNmAddr>
  <rprsTelno>052-204-0315</rprsTelno>
  <lot>129.360441</lot>
  <lat>35.3589245</lat>
  <cn><![CDATA[한반도에서 가장 먼저 해가 뜨는 곳]]></cn>
  <fstvlBgngYmd>2025-12-31</fstvlBgngYmd>
  <fstvlEndYmd>2026-01-01</fstvlEndYmd>
  <plc><![CDATA[울주군 서생면 간절곶 공원 일원]]></plc>
</list>
</data></body></rfcOpenApi>`;

const SEJONG_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss><header><resultCode><![CDATA[00]]></resultCode><resultMsg><![CDATA[NORMAL SERVICE]]></resultMsg></header>
<body><items><item>
  <nm><![CDATA[세종축제]]></nm>
  <place><![CDATA[세종호수공원]]></place>
  <bgngYmd><![CDATA[2022-10-07]]></bgngYmd>
  <endYmd><![CDATA[2022-10-10]]></endYmd>
  <cn><![CDATA[세종대왕의 업적과 정신]]></cn>
  <roadNmAddr><![CDATA[세종특별자치시 세종 호수공원길 155]]></roadNmAddr>
  <la><![CDATA[36.4985667000]]></la>
  <lo><![CDATA[127.2715118000]]></lo>
</item></items></body></rss>`;

const GYEONGNAM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<body><items><item>
  <entid>41240187</entid>
  <title>초계향교 추기석전대제 봉행</title>
  <contents>춘기석전대제 봉행</contents>
  <start_date>2020-02-24</start_date>
  <end_date>2020-02-24</end_date>
  <place>초계향교 대성전</place>
  <tel>055-930-3173</tel>
  <sigungu>합천군</sigungu>
</item></items></body>`;

const BUSAN_THEME_XML = `<?xml version="1.0" encoding="UTF-8"?>
<body><items><item>
  <res_no>2020020019</res_no>
  <title>디에이드 전국투어콘서트 [부산]</title>
  <op_st_dt>2020-03-01</op_st_dt>
  <op_ed_dt>2020-03-01</op_ed_dt>
  <place_nm>부산시민회관</place_nm>
</item></items></body>`;

test('hintMetroFromSource maps the four municipal sources', () => {
  assert.equal(hintMetroFromSource('busan'), 'BUSAN');
  assert.equal(hintMetroFromSource('gyeongnam'), 'GYEONGNAM');
  assert.equal(hintMetroFromSource('ulsan'), 'ULSAN');
  assert.equal(hintMetroFromSource('sejong'), 'SEJONG');
});

test('xmlRows reads item and list records', () => {
  assert.equal(xmlRows(ULSAN_XML)[0].title, '간절곶 해맞이 축제');
  assert.equal(xmlRows(SEJONG_XML)[0].nm, '세종축제');
  assert.equal(xmlRows(GYEONGNAM_XML)[0].entid, '41240187');
});

test('openApiFault detects retired Busan BsArtService', () => {
  const xml = '<cmmMsgHeader><errMsg>NO_OPENAPI_SERVICE_ERROR</errMsg><returnAuthMsg>해당 오픈API 서비스가 없거나 폐기됨</returnAuthMsg><returnReasonCode>12</returnReasonCode></cmmMsgHeader>';
  const fault = openApiFault(xml);
  assert.equal(fault.code, '12');
  assert.match(fault.message, /폐기/);
});

test('rowsToFestivals maps Ulsan, Sejong, Gyeongnam and Busan fields', () => {
  const ulsan = rowsToFestivals(parseMunicipalPayload(ULSAN_XML).rows, 'ULSAN')[0];
  assert.equal(ulsan.title, '간절곶 해맞이 축제');
  assert.equal(ulsan.eventStartDate, '2025-12-31');
  assert.equal(ulsan.contentId, '14');
  assert.equal(ulsan.metro, 'ULSAN');
  assert.match(ulsan.address, /울산/);

  const sejong = rowsToFestivals(parseMunicipalPayload(SEJONG_XML).rows, 'SEJONG')[0];
  assert.equal(sejong.title, '세종축제');
  assert.equal(sejong.eventStartDate, '2022-10-07');
  assert.equal(sejong.eventEndDate, '2022-10-10');
  assert.ok(sejong.mapY > 36);

  const gyeongnam = rowsToFestivals(parseMunicipalPayload(GYEONGNAM_XML).rows, 'GYEONGNAM')[0];
  assert.equal(gyeongnam.title, '초계향교 추기석전대제 봉행');
  assert.equal(gyeongnam.contentId, '41240187');
  assert.match(gyeongnam.address, /경상남도|합천/);

  const busan = rowsToFestivals(parseMunicipalPayload(BUSAN_THEME_XML).rows, 'BUSAN')[0];
  assert.equal(busan.title, '디에이드 전국투어콘서트 [부산]');
  assert.equal(busan.eventStartDate, '2020-03-01');
  assert.equal(busan.contentId, '2020020019');
});

test('syncMunicipalCultureEvents skips retired Busan URL and uses the next XML', async () => {
  const prevNts = process.env.NTS_SERVICE_KEY;
  process.env.NTS_SERVICE_KEY = 'test-shared-key';
  const urls = [];
  const result = await syncMunicipalCultureEvents('BUSAN', {
    pageSize: 10,
    fetchImpl: async (url) => {
      urls.push(String(url));
      if (String(url).includes('BsArtService')) {
        return {
          ok: false,
          status: 400,
          text: async () => '<cmmMsgHeader><errMsg>NO_OPENAPI_SERVICE_ERROR</errMsg><returnAuthMsg>해당 오픈API 서비스가 없거나 폐기됨</returnAuthMsg><returnReasonCode>12</returnReasonCode></cmmMsgHeader>',
        };
      }
      return { ok: true, status: 200, text: async () => BUSAN_THEME_XML };
    },
  });
  assert.equal(result.success, true);
  assert.equal(result.fetched, 1);
  assert.equal(result.metro, 'BUSAN');
  assert.ok(urls.some((url) => url.includes('BsArtService')));
  assert.ok(urls.some((url) => url.includes('FestivalService') || url.includes('BusanCultureThemeService')));
  process.env.NTS_SERVICE_KEY = prevNts;
});

test('municipalCultureUrls keeps the user Busan service first', () => {
  const urls = municipalCultureUrls('BUSAN');
  assert.equal(urls[0], 'https://apis.data.go.kr/6260000/BsArtService');
});
