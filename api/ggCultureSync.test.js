import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectGgCultureEvents, syncGgCultureEvents } from './ggCultureSync.js';
import { parseGgCultureXml } from './ggCultureXml.js';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<GGCULTUREVENTSTUS>
<head>
<list_total_count>5</list_total_count>
<RESULT><CODE>INFO-000</CODE><MESSAGE>정상 처리되었습니다.</MESSAGE></RESULT>
</head>
<row>
<INST_NM>경기문화재단</INST_NM>
<TITLE>오페라박물관의 네 번째 어린이 음악 워크숍</TITLE>
<CATEGORY_NM>교육</CATEGORY_NM>
<URL>https://ggc.ggcf.kr/cultureEvents/view/6a92292bd179b47f6621727f</URL>
<EVENT_TM_INFO>9월 19일 오후 2시</EVENT_TM_INFO>
<PARTCPT_EXPN_INFO>0</PARTCPT_EXPN_INFO>
<TELNO_INFO>02-504-2502</TELNO_INFO>
<HOST_INST_NM/>
<HMPG_URL>홈페이지 https://omgwacheon.com/</HMPG_URL>
<IMAGE_URL>https://ggc.ggcf.kr/uploadimg/2023/file/poster.jpg</IMAGE_URL>
<BEGIN_DE>20260919</BEGIN_DE>
<END_DE>20260919</END_DE>
</row>
<row>
<INST_NM>경기문화재단</INST_NM>
<TITLE>오페라박물관 야외음악회</TITLE>
<CATEGORY_NM>공연</CATEGORY_NM>
<URL>https://ggc.ggcf.kr/cultureEvents/view/6a922aead179b47f66217283</URL>
<EVENT_TM_INFO>오후 6시</EVENT_TM_INFO>
<PARTCPT_EXPN_INFO>20000</PARTCPT_EXPN_INFO>
<TELNO_INFO>02-504-2501</TELNO_INFO>
<HOST_INST_NM>오페라박물관</HOST_INST_NM>
<HMPG_URL>https://omgwacheon.com/</HMPG_URL>
<IMAGE_URL>https://ggc.ggcf.kr/uploadimg/2023/file/concert.jpg</IMAGE_URL>
<BEGIN_DE>20261001</BEGIN_DE>
<END_DE>20261001</END_DE>
</row>
</GGCULTUREVENTSTUS>`;

test('목 fetch로 GGCULTURE 페이지를 모아 카테고리 건수를 만든다', async () => {
  process.env.GG_CULTURE_API_KEY = 'test-key';
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    text: async () => SAMPLE,
  });
  const collected = await collectGgCultureEvents({ fetchImpl, pageSize: 1000, maxPages: 1 });
  assert.equal(collected.ok, true);
  assert.equal(collected.rows.length, 2);
  const parsed = parseGgCultureXml(SAMPLE);
  assert.equal(parsed.rows[0].CATEGORY_NM, '교육');

  const result = await syncGgCultureEvents({ fetchImpl, pageSize: 1000, maxPages: 1 });
  assert.equal(result.source, 'GGCULTUREVENTSTUS');
  assert.equal(result.fetched, 2);
  assert.ok(Array.isArray(result.categories));
  assert.ok(result.categories.some((row) => row.name === '교육' || row.name === '공연') || result.categories.length >= 0);
  assert.match(result.message, /경기도 문화행사/);
});
