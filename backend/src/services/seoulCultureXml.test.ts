import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contentIdFromRow,
  countCategories,
  firstTel,
  parseSeoulCultureXml,
  seoulCoord,
  seoulDate,
  seoulFeeLabel,
  toPersistableFestival,
} from './seoulCultureXml';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<culturalEventInfo>
<list_total_count>19497</list_total_count>
<RESULT><CODE>INFO-000</CODE><MESSAGE>정상 처리되었습니다</MESSAGE></RESULT>
<row>
<CODENAME>콘서트</CODENAME>
<GUNAME>강동구</GUNAME>
<TITLE>2026 카즈미 타테이시 트리오 내한공연-크리스마스, 재즈를 만나다-(서울)</TITLE>
<DATE>2026-12-24~2026-12-24</DATE>
<PLACE>강동아트센터 대극장 한강</PLACE>
<USE_FEE>VIP석 88,000원 / R석 77,000원</USE_FEE>
<INQUIRY>070-8680-8477 / 02-337-3103</INQUIRY>
<ORG_LINK>https://tickets.interpark.com/goods/26010350</ORG_LINK>
<MAIN_IMG>https://culture.seoul.go.kr/cmmn/file/getImage.do?atchFileId=401a984b98ff4af8a57122219ee0d591&amp;thumb=Y</MAIN_IMG>
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
<TITLE>파인캐릭터 2026 (FineCharacter 2026)</TITLE>
<DATE>2026-11-27~2026-11-29</DATE>
<PLACE>동대문디자인플라자(DDP) 쇼룸 1층</PLACE>
<USE_FEE/>
<INQUIRY>031-921-6325</INQUIRY>
<ORG_LINK>https://finecharacter.kr/</ORG_LINK>
<MAIN_IMG>https://culture.seoul.go.kr/cmmn/file/getImage.do?atchFileId=f941d1c83dad4804b0f02fc3817af386&amp;thumb=Y</MAIN_IMG>
<STRTDATE>2026-11-27 00:00:00.0</STRTDATE>
<END_DATE>2026-11-29 00:00:00.0</END_DATE>
<LOT>127.00977973484339</LOT>
<LAT>37.56735731522952</LAT>
<IS_FREE>무료</IS_FREE>
<HMPG_ADDR>https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=158731&amp;menuNo=200009</HMPG_ADDR>
<PRO_TIME>10:00 ~ 19:00</PRO_TIME>
</row>
</culturalEventInfo>`;

test('서울시 culturalEventInfo row를 파싱하고 cultcode로 upsert 키를 만든다', () => {
  const parsed = parseSeoulCultureXml(SAMPLE);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.total, 19497);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].GUNAME, '강동구');
  assert.equal(seoulDate('2026-12-24 00:00:00.0'), '2026-12-24');
  assert.equal(seoulFeeLabel('', '무료'), '무료');
  assert.equal(firstTel('070-8680-8477 / 02-337-3103'), '070-8680-8477');
  const first = toPersistableFestival(parsed.rows[0]);
  assert.ok(first);
  assert.equal(first.contentId, 'sel-158770');
  assert.equal(first.metro, 'SEOUL');
  assert.ok((first.latitude || 0) > 37);
  assert.ok((first.longitude || 0) > 127);
  assert.match(first.firstImage, /thumb=Y/);
  const coord = seoulCoord('37.55', '127.15');
  assert.equal(coord.lat, 37.55);
  assert.equal(contentIdFromRow(parsed.rows[1]), 'sel-158731');
  assert.deepEqual(countCategories(parsed.rows), [
    { name: '전시/미술', count: 1 },
    { name: '콘서트', count: 1 },
  ]);
});
