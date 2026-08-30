import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contentIdFromRow,
  countCategories,
  firstTel,
  parseSeoulCultureXml,
  seoulCoord,
  seoulDate,
  seoulDateRange,
  seoulFeeLabel,
  toPersistableFestival,
} from './seoulCultureXml.js';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<culturalEventInfo>
<list_total_count>19497</list_total_count>
<RESULT>
<CODE>INFO-000</CODE>
<MESSAGE>정상 처리되었습니다</MESSAGE>
</RESULT>
<row>
<CODENAME>콘서트</CODENAME>
<GUNAME>강동구</GUNAME>
<TITLE>2026 카즈미 타테이시 트리오 내한공연-크리스마스, 재즈를 만나다-(서울)</TITLE>
<DATE>2026-12-24~2026-12-24</DATE>
<PLACE>강동아트센터 대극장 한강</PLACE>
<ORG_NAME>기타</ORG_NAME>
<USE_TRGT>성인, 청소년</USE_TRGT>
<USE_FEE>VIP석 88,000원 / R석 77,000원 / S석 66,000원 / A석 55,000원</USE_FEE>
<INQUIRY>070-8680-8477 / 02-337-3103</INQUIRY>
<PLAYER>Piano : Kazumi Tateishi, Contrabass : Shinobu Sato, Drums : Mao Suzuki</PLAYER>
<PROGRAM>Let It Snow, White Christmas 등 크리스마스 캐롤 명곡을 피아노, 콘트라베이스, 드럼의 일본 재즈 트리오 연주로 듣는 공연</PROGRAM>
<ETC_DESC/>
<ORG_LINK>https://tickets.interpark.com/goods/26010350</ORG_LINK>
<MAIN_IMG>https://culture.seoul.go.kr/cmmn/file/getImage.do?atchFileId=401a984b98ff4af8a57122219ee0d591&amp;thumb=Y</MAIN_IMG>
<RGSTDATE>2026-07-23</RGSTDATE>
<TICKET>시민</TICKET>
<STRTDATE>2026-12-24 00:00:00.0</STRTDATE>
<END_DATE>2026-12-24 00:00:00.0</END_DATE>
<THEMECODE>기타</THEMECODE>
<LOT>127.157342546961</LOT>
<LAT>37.5512204558342</LAT>
<IS_FREE>유료</IS_FREE>
<HMPG_ADDR>https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=158770&amp;menuNo=200008</HMPG_ADDR>
<PRO_TIME>19:30</PRO_TIME>
</row>
<row>
<CODENAME>콘서트</CODENAME>
<GUNAME>영등포구</GUNAME>
<TITLE>2026 카즈미 타테이시 트리오 내한공연-지브리, 재즈를 만나다-(서울)</TITLE>
<DATE>2026-12-22~2026-12-22</DATE>
<PLACE>영등포아트홀</PLACE>
<ORG_NAME>기타</ORG_NAME>
<USE_TRGT>성인, 청소년</USE_TRGT>
<USE_FEE>VIP석 88,000원 / R석 77,000원 / S석 66,000원</USE_FEE>
<INQUIRY>070-8680-8477 / 02-337-3103</INQUIRY>
<PLAYER>Piano : Kazumi Tateishi, Contrabass : Shinobu Sato, Drums : Mao Suzuki</PLAYER>
<PROGRAM>이웃집 토토로, 하울의 움직이는 성 등 지브리 애니메이션의 명곡을 피아노, 콘트라베이스, 드럼의 일본 재즈 트리오 연주로 듣는 공연</PROGRAM>
<ETC_DESC/>
<ORG_LINK>https://tickets.interpark.com/goods/26010060</ORG_LINK>
<MAIN_IMG>https://culture.seoul.go.kr/cmmn/file/getImage.do?atchFileId=ae89ba10b5c64459b3e2fe3942048f84&amp;thumb=Y</MAIN_IMG>
<RGSTDATE>2026-07-16</RGSTDATE>
<TICKET>시민</TICKET>
<STRTDATE>2026-12-22 00:00:00.0</STRTDATE>
<END_DATE>2026-12-22 00:00:00.0</END_DATE>
<THEMECODE>기타</THEMECODE>
<LOT>126.900109255921</LOT>
<LAT>37.5260087284496</LAT>
<IS_FREE>유료</IS_FREE>
<HMPG_ADDR>https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=158691&amp;menuNo=200008</HMPG_ADDR>
<PRO_TIME>19:30</PRO_TIME>
</row>
<row>
<CODENAME>연극</CODENAME>
<GUNAME>마포구</GUNAME>
<TITLE>[마포문화재단] 체홉 4대 장막 낭독극 [공놀이클럽의 사계절 체홉: 갈매기]</TITLE>
<DATE>2026-11-29~2026-11-29</DATE>
<PLACE>마포아트센터 아트홀맥</PLACE>
<ORG_NAME>마포문화재단</ORG_NAME>
<USE_TRGT> 14세 이상(2014년 이전 출생)</USE_TRGT>
<USE_FEE>전석 2만원(균일가)</USE_FEE>
<INQUIRY>02-3274-8600 [문의1번] 평일 9:00 ~ 18:00 (토,일 공휴일 휴무)</INQUIRY>
<PLAYER/>
<PROGRAM/>
<ETC_DESC/>
<ORG_LINK>https://www.mfac.or.kr/performance/whole_view.jsp?sc_b_category=17&amp;sc_b_code=BOARD_1207683401&amp;pk_seq=2682&amp;page=1</ORG_LINK>
<MAIN_IMG>https://culture.seoul.go.kr/cmmn/file/getImage.do?atchFileId=596148e92e5f4dd3870b298b700b9c2e&amp;thumb=Y</MAIN_IMG>
<RGSTDATE>2026-08-04</RGSTDATE>
<TICKET>기관</TICKET>
<STRTDATE>2026-11-29 00:00:00.0</STRTDATE>
<END_DATE>2026-11-29 00:00:00.0</END_DATE>
<THEMECODE>기타</THEMECODE>
<LOT>126.9455874749264</LOT>
<LAT>37.54987259578174</LAT>
<IS_FREE>유료</IS_FREE>
<HMPG_ADDR>https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=158955&amp;menuNo=200008</HMPG_ADDR>
<PRO_TIME>(일) 16:00</PRO_TIME>
</row>
<row>
<CODENAME>전시/미술</CODENAME>
<GUNAME>중구</GUNAME>
<TITLE>파인캐릭터 2026 (FineCharacter 2026)</TITLE>
<DATE>2026-11-27~2026-11-29</DATE>
<PLACE>동대문디자인플라자(DDP) 쇼룸 1층 (서울 중구 을지로 281)</PLACE>
<ORG_NAME>기타</ORG_NAME>
<USE_TRGT>누구나</USE_TRGT>
<USE_FEE/>
<INQUIRY>031-921-6325</INQUIRY>
<PLAYER/>
<PROGRAM/>
<ETC_DESC/>
<ORG_LINK>https://finecharacter.kr/</ORG_LINK>
<MAIN_IMG>https://culture.seoul.go.kr/cmmn/file/getImage.do?atchFileId=f941d1c83dad4804b0f02fc3817af386&amp;thumb=Y</MAIN_IMG>
<RGSTDATE>2026-07-21</RGSTDATE>
<TICKET>시민</TICKET>
<STRTDATE>2026-11-27 00:00:00.0</STRTDATE>
<END_DATE>2026-11-29 00:00:00.0</END_DATE>
<THEMECODE>기타</THEMECODE>
<LOT>127.00977973484339</LOT>
<LAT>37.56735731522952</LAT>
<IS_FREE>무료</IS_FREE>
<HMPG_ADDR>https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=158731&amp;menuNo=200009</HMPG_ADDR>
<PRO_TIME>10:00 ~ 19:00</PRO_TIME>
</row>
<row>
<CODENAME>콘서트</CODENAME>
<GUNAME>강북구</GUNAME>
<TITLE>[꿈의숲아트센터] 꿈의숲 마티네 콘서트 [벨에포크 아트&amp;뮤직] 시리즈3</TITLE>
<DATE>2026-10-28~2026-10-28</DATE>
<PLACE>북서울꿈의숲 상상톡톡미술관</PLACE>
<ORG_NAME>세종문화회관</ORG_NAME>
<USE_TRGT>8세 이상 관람 가능</USE_TRGT>
<USE_FEE>전석 15,000원</USE_FEE>
<INQUIRY>02-399-1000</INQUIRY>
<PLAYER/>
<PROGRAM/>
<ETC_DESC/>
<ORG_LINK>https://www.sejongpac.or.kr/dfac/dfacPerformance/dfacPerformance/performTicket.do?performIdx=37104&amp;menuNo=1200007</ORG_LINK>
<MAIN_IMG>https://culture.seoul.go.kr/cmmn/file/getImage.do?atchFileId=75a26c72552b4b38acca7be54e15cf8b&amp;thumb=Y</MAIN_IMG>
<RGSTDATE>2026-06-30</RGSTDATE>
<TICKET>기관</TICKET>
<STRTDATE>2026-10-28 00:00:00.0</STRTDATE>
<END_DATE>2026-10-28 00:00:00.0</END_DATE>
<THEMECODE>기타</THEMECODE>
<LOT>127.044324732036</LOT>
<LAT>37.6202544613023</LAT>
<IS_FREE>유료</IS_FREE>
<HMPG_ADDR>https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=158447&amp;menuNo=200008</HMPG_ADDR>
<PRO_TIME>수요일 11:00</PRO_TIME>
</row>
</culturalEventInfo>`;

test('실제 culturalEventInfo row 태그를 모두 읽는다', () => {
  const parsed = parseSeoulCultureXml(SAMPLE);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.total, 19497);
  assert.equal(parsed.rows.length, 5);
  assert.equal(parsed.rows[0].TITLE, '2026 카즈미 타테이시 트리오 내한공연-크리스마스, 재즈를 만나다-(서울)');
  assert.equal(parsed.rows[0].CODENAME, '콘서트');
  assert.equal(parsed.rows[0].GUNAME, '강동구');
  assert.equal(parsed.rows[0].PRO_TIME, '19:30');
  assert.equal(parsed.rows[3].CODENAME, '전시/미술');
  assert.equal(parsed.rows[3].IS_FREE, '무료');
  assert.equal(parsed.rows[3].USE_FEE, '');
  assert.match(parsed.rows[4].TITLE, /벨에포크 아트&뮤직/);
});

test('인증 오류 RESULT는 적재하지 않는다', () => {
  const parsed = parseSeoulCultureXml('<RESULT><CODE>ERROR-300</CODE><MESSAGE>필수 값이 누락되어 있습니다.</MESSAGE></RESULT>');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.rows.length, 0);
});

test('기간·요금·전화·좌표를 안전하게 변환한다', () => {
  assert.equal(seoulDate('2026-12-24 00:00:00.0'), '2026-12-24');
  assert.deepEqual(seoulDateRange('2026-11-27~2026-11-29', '2026-11-27 00:00:00.0', '2026-11-29 00:00:00.0'), {
    start: '2026-11-27',
    end: '2026-11-29',
  });
  assert.equal(seoulFeeLabel('', '무료'), '무료');
  assert.match(seoulFeeLabel('전석 15,000원', '유료'), /15,000/);
  assert.equal(firstTel('070-8680-8477 / 02-337-3103'), '070-8680-8477');
  const coord = seoulCoord('37.5512204558342', '127.157342546961');
  assert.ok(coord.lat > 37 && coord.lng > 127);
});

test('cultcode와 LAT/LOT으로 적재 객체를 만든다', () => {
  const parsed = parseSeoulCultureXml(SAMPLE);
  const first = toPersistableFestival(parsed.rows[0]);
  assert.equal(first.contentId, 'sel-158770');
  assert.equal(first.category, '콘서트');
  assert.equal(first.eventStartDate, '2026-12-24');
  assert.equal(first.metro, 'SEOUL');
  assert.ok(first.latitude > 37);
  assert.ok(first.longitude > 127);
  assert.match(first.firstImage, /atchFileId=401a984b98ff4af8a57122219ee0d591&thumb=Y/);
  assert.equal(contentIdFromRow(parsed.rows[3]), 'sel-158731');
  const free = toPersistableFestival(parsed.rows[3]);
  assert.equal(free.feeInfo, '무료');
  assert.deepEqual(countCategories(parsed.rows), [
    { name: '콘서트', count: 3 },
    { name: '연극', count: 1 },
    { name: '전시/미술', count: 1 },
  ]);
});
