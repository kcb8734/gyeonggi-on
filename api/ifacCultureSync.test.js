import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildIfacCultureUrl,
  collectIfacCultureEvents,
  ifacCultureApiKey,
  syncIfacCultureEvents,
  ymdOffset,
} from './ifacCultureSync.js';
import { parseIfacCultureXml } from './ifacCultureXml.js';

const SAMPLE = `<?xml version="1.0" encoding="utf-8" ?>
<iq>
  <resultCode>0000</resultCode>
  <resultMsg>정상 처리되었습니다.</resultMsg>
  <totalCnt>2</totalCnt>
  <item>
    <idx>2591</idx>
    <title>팝페라와 함께하는 아시안의 향기</title>
    <link>https://ifac.or.kr/culture/view.do?eventSn=2591</link>
    <category>음악/콘서트</category>
    <sdate>20260918</sdate>
    <edate>20260918</edate>
    <place>인천종합문화예술회관</place>
    <placeSido>인천광역시</placeSido>
    <placeGugun>남동구</placeGugun>
  </item>
  <item>
    <idx>9001</idx>
    <title>강화고인돌문화축제</title>
    <link>https://ifac.or.kr/culture/view.do?eventSn=9001</link>
    <category>축제/문화행사</category>
    <sdate>20261010</sdate>
    <edate>20261012</edate>
    <place>강화고인돌유적</place>
    <placeSido>인천광역시</placeSido>
    <placeGugun>강화군</placeGugun>
  </item>
</iq>`;

test('요청 URL에 apiKey·svid·resultType=xml 을 붙인다', () => {
  const url = buildIfacCultureUrl('http://ifac.or.kr/openAPI/real/search.do', 'secret-key', 2, 80, {
    start: '20260801',
    end: '20270801',
  });
  assert.match(url, /ifac\.or\.kr\/openAPI\/real\/search\.do/);
  assert.match(url, /apiKey=secret-key/);
  assert.match(url, /svid=culture/);
  assert.match(url, /svID=culture/);
  assert.match(url, /resultType=xml/);
  assert.match(url, /cPage=2/);
  assert.match(url, /pSize=80/);
  assert.equal(ymdOffset(0, new Date('2026-08-30T00:00:00')).slice(0, 6), '202608');
});

test('키가 없으면 네트워크를 호출하지 않는다', async () => {
  const prev = process.env.INCHEON_API_KEY;
  const prevIfac = process.env.IFAC_API_KEY;
  const prevCulture = process.env.INCHEON_CULTURE_API_KEY;
  process.env.INCHEON_API_KEY = '';
  process.env.IFAC_API_KEY = '';
  process.env.INCHEON_CULTURE_API_KEY = '';
  let called = 0;
  const fetchImpl = async () => {
    called += 1;
    throw new Error('should not fetch');
  };
  const collected = await collectIfacCultureEvents({ fetchImpl });
  assert.equal(ifacCultureApiKey(), '');
  assert.equal(collected.ok, false);
  assert.equal(collected.code, 'NO_KEY');
  assert.equal(called, 0);
  process.env.INCHEON_API_KEY = prev;
  process.env.IFAC_API_KEY = prevIfac;
  process.env.INCHEON_CULTURE_API_KEY = prevCulture;
});

test('목 fetch로 IFAC 페이지를 모아 카테고리 건수를 만든다', async () => {
  const prev = process.env.INCHEON_API_KEY;
  const prevIfac = process.env.IFAC_API_KEY;
  const prevCulture = process.env.INCHEON_CULTURE_API_KEY;
  process.env.INCHEON_API_KEY = 'test-key';
  process.env.IFAC_API_KEY = '';
  process.env.INCHEON_CULTURE_API_KEY = '';
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    return { ok: true, status: 200, text: async () => SAMPLE };
  };
  const collected = await collectIfacCultureEvents({ fetchImpl, pageSize: 80, maxPages: 1 });
  assert.equal(collected.ok, true);
  assert.equal(collected.rows.length, 2);
  assert.match(urls[0], /svid=culture/);
  assert.match(urls[0], /resultType=xml/);
  const parsed = parseIfacCultureXml(SAMPLE);
  assert.equal(parsed.rows[0].category, '음악/콘서트');

  const result = await syncIfacCultureEvents({ fetchImpl, pageSize: 80, maxPages: 1 });
  assert.equal(result.source, 'ifac-culture');
  assert.equal(result.fetched, 2);
  assert.ok(Array.isArray(result.categories));
  assert.match(result.message, /인천문화재단/);
  process.env.INCHEON_API_KEY = prev;
  process.env.IFAC_API_KEY = prevIfac;
  process.env.INCHEON_CULTURE_API_KEY = prevCulture;
});
