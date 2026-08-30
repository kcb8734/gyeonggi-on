import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectSeoulCultureEvents, syncSeoulCultureEvents } from './seoulCultureSync.js';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<culturalEventInfo>
<list_total_count>2</list_total_count>
<RESULT><CODE>INFO-000</CODE><MESSAGE>정상 처리되었습니다</MESSAGE></RESULT>
<row>
<CODENAME>콘서트</CODENAME>
<GUNAME>강동구</GUNAME>
<TITLE>2026 카즈미 타테이시 트리오 내한공연-크리스마스, 재즈를 만나다-(서울)</TITLE>
<DATE>2026-12-24~2026-12-24</DATE>
<PLACE>강동아트센터 대극장 한강</PLACE>
<USE_FEE>VIP석 88,000원</USE_FEE>
<INQUIRY>070-8680-8477</INQUIRY>
<ORG_LINK>https://tickets.interpark.com/goods/26010350</ORG_LINK>
<MAIN_IMG>https://culture.seoul.go.kr/cmmn/file/getImage.do?atchFileId=abc&amp;thumb=Y</MAIN_IMG>
<STRTDATE>2026-12-24 00:00:00.0</STRTDATE>
<END_DATE>2026-12-24 00:00:00.0</END_DATE>
<LOT>127.157342546961</LOT>
<LAT>37.5512204558342</LAT>
<IS_FREE>유료</IS_FREE>
<HMPG_ADDR>https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=158770&amp;menuNo=200008</HMPG_ADDR>
<PRO_TIME>19:30</PRO_TIME>
</row>
<row>
<CODENAME>전시/미술</CODENAME>
<GUNAME>중구</GUNAME>
<TITLE>파인캐릭터 2026</TITLE>
<DATE>2026-11-27~2026-11-29</DATE>
<PLACE>DDP</PLACE>
<USE_FEE/>
<INQUIRY>031-921-6325</INQUIRY>
<ORG_LINK>https://finecharacter.kr/</ORG_LINK>
<MAIN_IMG>https://culture.seoul.go.kr/cmmn/file/getImage.do?atchFileId=def&amp;thumb=Y</MAIN_IMG>
<STRTDATE>2026-11-27 00:00:00.0</STRTDATE>
<END_DATE>2026-11-29 00:00:00.0</END_DATE>
<LOT>127.00977973484339</LOT>
<LAT>37.56735731522952</LAT>
<IS_FREE>무료</IS_FREE>
<HMPG_ADDR>https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=158731&amp;menuNo=200009</HMPG_ADDR>
<PRO_TIME>10:00 ~ 19:00</PRO_TIME>
</row>
</culturalEventInfo>`;

test('목 fetch로 서울 문화행사를 모아 카테고리 건수를 만든다', async () => {
  process.env.SEOUL_CULTURE_API_KEY = 'test-key';
  const fetchImpl = async (url) => {
    assert.match(String(url), /culturalEventInfo\/1\/1000\//);
    return { ok: true, status: 200, text: async () => SAMPLE };
  };
  const collected = await collectSeoulCultureEvents({ fetchImpl, pageSize: 1000, maxPages: 1 });
  assert.equal(collected.ok, true);
  assert.equal(collected.rows.length, 2);
  const result = await syncSeoulCultureEvents({ fetchImpl, pageSize: 1000, maxPages: 1 });
  assert.equal(result.source, 'culturalEventInfo');
  assert.equal(result.fetched, 2);
  assert.ok(Array.isArray(result.categories));
  assert.match(result.message, /서울시 문화행사/);
});
