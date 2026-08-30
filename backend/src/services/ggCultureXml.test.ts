import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contentIdFromRow,
  countCategories,
  encodeMediaUrl,
  extractHttpUrl,
  feeLabel,
  parseGgCultureXml,
  toPersistableFestival,
  ymdDash,
} from './ggCultureXml';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<GGCULTUREVENTSTUS>
<head>
<list_total_count>3077</list_total_count>
<RESULT>
<CODE>INFO-000</CODE>
<MESSAGE>정상 처리되었습니다.</MESSAGE>
</RESULT>
<api_version>1.0v</api_version>
</head>
<row>
<INST_NM>경기문화재단</INST_NM>
<TITLE>오페라박물관의 네 번째 어린이 음악 워크숍</TITLE>
<CATEGORY_NM>교육</CATEGORY_NM>
<URL>https://ggc.ggcf.kr/cultureEvents/view/6a92292bd179b47f6621727f</URL>
<EVENT_TM_INFO>9월 19일 오후 2시, 오후 3시반</EVENT_TM_INFO>
<PARTCPT_EXPN_INFO>0</PARTCPT_EXPN_INFO>
<TELNO_INFO>02-504-2502</TELNO_INFO>
<HOST_INST_NM/>
<HMPG_URL>홈페이지 https://omgwacheon.com/</HMPG_URL>
<IMAGE_URL>https://ggc.ggcf.kr/uploadimg/2023/file/[오페라박물관 과천] 9월 어린이 워크숍 세로형 포스터.jpg</IMAGE_URL>
<BEGIN_DE>20260919</BEGIN_DE>
<END_DE>20260919</END_DE>
<WRITNG_DE>20260829</WRITNG_DE>
</row>
<row>
<INST_NM>경기문화재단</INST_NM>
<TITLE>오페라박물관 야외음악회〈사랑의 묘약〉 L’elisir d’amore</TITLE>
<CATEGORY_NM>공연</CATEGORY_NM>
<URL>https://ggc.ggcf.kr/cultureEvents/view/6a922aead179b47f66217283</URL>
<EVENT_TM_INFO>10월 1일 오후 6시</EVENT_TM_INFO>
<PARTCPT_EXPN_INFO>20000</PARTCPT_EXPN_INFO>
<TELNO_INFO>02-504-2501</TELNO_INFO>
<HOST_INST_NM>오페라박물관</HOST_INST_NM>
<HMPG_URL>https://omgwacheon.com/ko/research/program/62</HMPG_URL>
<IMAGE_URL>https://ggc.ggcf.kr/uploadimg/2023/file/[오페라박물관 과천] 10월 오페라 하이라이트 세로형 포스터.jpg</IMAGE_URL>
<BEGIN_DE>20261001</BEGIN_DE>
<END_DE>20261001</END_DE>
<WRITNG_DE>20260829</WRITNG_DE>
</row>
<row>
<INST_NM>경기문화재단</INST_NM>
<TITLE>지브리와 사랑에 빠지다 : 지브리 영화음악 콘서트 2026 - 의정부 앙코르</TITLE>
<CATEGORY_NM>공연</CATEGORY_NM>
<URL>https://ggc.ggcf.kr/cultureEvents/view/6a90e79ed179b47f6621727b</URL>
<EVENT_TM_INFO>15:00/18:00</EVENT_TM_INFO>
<PARTCPT_EXPN_INFO>전석 4만 원</PARTCPT_EXPN_INFO>
<TELNO_INFO>0507-1338-4810</TELNO_INFO>
<HOST_INST_NM>스테이지 M(스테이지엠)</HOST_INST_NM>
<HMPG_URL>https://www.ticketlink.co.kr/product/64062</HMPG_URL>
<IMAGE_URL>https://ggc.ggcf.kr/uploadimg/2023/file/01 웹용 포스터_1205의정부 지브리 투어 2026 (1).jpg</IMAGE_URL>
<BEGIN_DE>20261205</BEGIN_DE>
<END_DE>20261205</END_DE>
<WRITNG_DE>20260828</WRITNG_DE>
</row>
<row>
<INST_NM>경기문화재단</INST_NM>
<TITLE>스테이지엠 크리스마스 영화음악 &amp; 캐롤 콘서트 2026 - 부천</TITLE>
<CATEGORY_NM>공연</CATEGORY_NM>
<URL>https://ggc.ggcf.kr/cultureEvents/view/6a8cf49c6e80097c99a4b353</URL>
<EVENT_TM_INFO>오후 7시 30분</EVENT_TM_INFO>
<PARTCPT_EXPN_INFO>전석 4만 원</PARTCPT_EXPN_INFO>
<TELNO_INFO>0507-1338-4810</TELNO_INFO>
<HOST_INST_NM>스테이지 M(스테이지엠)</HOST_INST_NM>
<HMPG_URL>https://www.ticketlink.co.kr/product/64669</HMPG_URL>
<IMAGE_URL>https://ggc.ggcf.kr/uploadimg/2023/file/지지씨.jpg</IMAGE_URL>
<BEGIN_DE>20261222</BEGIN_DE>
<END_DE>20261222</END_DE>
<WRITNG_DE>20260825</WRITNG_DE>
</row>
<row>
<INST_NM>경기문화재단</INST_NM>
<TITLE>스테이지엠 크리스마스 영화음악 &amp; 캐롤 콘서트 2026 - 수원</TITLE>
<CATEGORY_NM>공연</CATEGORY_NM>
<URL>https://ggc.ggcf.kr/cultureEvents/view/6a8cf0546e80097c99a4b352</URL>
<EVENT_TM_INFO>오후 3시</EVENT_TM_INFO>
<PARTCPT_EXPN_INFO>전석 4만 원</PARTCPT_EXPN_INFO>
<TELNO_INFO>0507-1338-4810</TELNO_INFO>
<HOST_INST_NM>스테이지 M(스테이지엠)</HOST_INST_NM>
<HMPG_URL>https://www.ticketlink.co.kr/product/64750</HMPG_URL>
<IMAGE_URL>https://ggc.ggcf.kr/uploadimg/2023/file/크리스마스_포스터_1213경기_지지씨.jpg</IMAGE_URL>
<BEGIN_DE>20261213</BEGIN_DE>
<END_DE>20261213</END_DE>
<WRITNG_DE>20260825</WRITNG_DE>
</row>
</GGCULTUREVENTSTUS>`;

test('실제 GGCULTUREVENTSTUS row 태그를 모두 읽는다', () => {
  const parsed = parseGgCultureXml(SAMPLE);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.total, 3077);
  assert.equal(parsed.rows.length, 5);
  assert.equal(parsed.rows[0].TITLE, '오페라박물관의 네 번째 어린이 음악 워크숍');
  assert.equal(parsed.rows[0].CATEGORY_NM, '교육');
  assert.equal(parsed.rows[0].HOST_INST_NM, '');
  assert.equal(parsed.rows[0].BEGIN_DE, '20260919');
  assert.equal(parsed.rows[1].PARTCPT_EXPN_INFO, '20000');
  assert.match(parsed.rows[3].TITLE, /부천/);
});

test('인증 오류 RESULT는 적재하지 않는다', () => {
  const parsed = parseGgCultureXml('<RESULT><CODE>ERROR-290</CODE><MESSAGE>인증키가 유효하지 않습니다.</MESSAGE></RESULT>');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.rows.length, 0);
  assert.match(parsed.message, /인증키/);
});

test('날짜·요금·홈페이지·이미지 URL을 안전하게 변환한다', () => {
  assert.equal(ymdDash('20260919'), '2026-09-19');
  assert.equal(feeLabel('0'), '무료');
  assert.equal(feeLabel('20000'), '20,000원');
  assert.equal(feeLabel('전석 4만 원'), '전석 4만 원');
  assert.equal(extractHttpUrl('홈페이지 https://omgwacheon.com/'), 'https://omgwacheon.com/');
  assert.match(encodeMediaUrl('https://ggc.ggcf.kr/uploadimg/2023/file/[오페라박물관 과천] 9월 어린이 워크숍 세로형 포스터.jpg'), /%5B|%20/);
});

test('URL 슬러그로 안정적인 contentId를 만들고 카테고리 건수를 센다', () => {
  const parsed = parseGgCultureXml(SAMPLE);
  const first = toPersistableFestival(parsed.rows[0]);
  assert.ok(first);
  assert.equal(first.contentId, 'ggc-6a92292bd179b47f6621727f');
  assert.equal(first.eventStartDate, '2026-09-19');
  assert.equal(first.category, '교육');
  assert.equal(first.tel, '02-504-2502');
  assert.match(first.overview, /무료/);
  assert.equal(contentIdFromRow(parsed.rows[1]), 'ggc-6a922aead179b47f66217283');
  assert.deepEqual(countCategories(parsed.rows), [
    { name: '공연', count: 4 },
    { name: '교육', count: 1 },
  ]);
});
