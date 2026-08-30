import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contentIdFromRow,
  ifacMetro,
  parseIfacCultureXml,
  toPersistableFestival,
  ymdDash,
} from './ifacCultureXml';

const SAMPLE = `<?xml version="1.0" encoding="utf-8" ?>
<iq>
  <resultCode><![CDATA[0000]]></resultCode>
  <resultMsg><![CDATA[정상 처리되었습니다.]]></resultMsg>
  <totalCnt><![CDATA[2]]></totalCnt>
  <item>
    <idx><![CDATA[2591]]></idx>
    <title><![CDATA[팝페라와 함께하는 아시안의 향기]]></title>
    <link><![CDATA[https://ifac.or.kr/culture/view.do?eventSn=2591]]></link>
    <category><![CDATA[음악/콘서트]]></category>
    <sdate><![CDATA[20140918]]></sdate>
    <edate><![CDATA[20140918]]></edate>
    <place><![CDATA[인천종합문화예술회관]]></place>
    <placeSido><![CDATA[인천광역시]]></placeSido>
    <placeGugun><![CDATA[남동구]]></placeGugun>
    <tel><![CDATA[032)511-6744]]></tel>
  </item>
  <item>
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

test('인천문화재단 item 태그를 제목·링크·장소까지 읽는다', () => {
  const parsed = parseIfacCultureXml(SAMPLE);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].title, '팝페라와 함께하는 아시안의 향기');
  assert.equal(parsed.rows[0].placeGugun, '남동구');
  assert.equal(ymdDash('20140918'), '2014-09-18');
  assert.equal(ifacMetro('인천광역시', '남동구'), 'INCHEON');
  const first = toPersistableFestival(parsed.rows[0]);
  assert.ok(first);
  assert.equal(first.contentId, 'ifc-2591');
  assert.equal(first.source, 'ifac');
  assert.equal(first.metro, 'INCHEON');
  assert.match(first.overview, /상세 https:\/\/ifac\.or\.kr/);
  assert.equal(first.tel, '032-511-6744');
  assert.equal(contentIdFromRow(parsed.rows[1]).startsWith('ifc-'), true);
});
