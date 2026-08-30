import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contentIdFromRow,
  countCategories,
  extractHttpUrl,
  ifacMetro,
  parseIfacCultureXml,
  toPersistableFestival,
  ymdDash,
} from './ifacCultureXml.js';

const SAMPLE = `<?xml version="1.0" encoding="utf-8" ?>
<iq>
  <resultCode><![CDATA[0000]]></resultCode>
  <resultMsg><![CDATA[정상 처리되었습니다.]]></resultMsg>
  <totalCnt><![CDATA[31]]></totalCnt>
  <item>
    <idx><![CDATA[2559]]></idx>
    <title><![CDATA[대한민국국제관악제]]></title>
    <link><![CDATA[https://ifac.or.kr/culture/view.do?key=m2102173741239&eventSn=2559]]></link>
    <category><![CDATA[축제/문화행사]]></category>
    <sdate><![CDATA[20140912]]></sdate>
    <edate><![CDATA[20140918]]></edate>
    <place><![CDATA[서초구 남부순환로 2406 (서초동)]]></place>
    <placeSido><![CDATA[서울특별시]]></placeSido>
    <placeGugun><![CDATA[]]></placeGugun>
    <management><![CDATA[대한민국 국제관악제 추진위원회]]></management>
    <feeCase><![CDATA[유료]]></feeCase>
    <fee><![CDATA[공연별 유료]]></fee>
    <tel><![CDATA[02-516-1245]]></tel>
    <homepage><![CDATA[http://windband.or.kr]]></homepage>
    <poster><![CDATA[]]></poster>
    <posterThumb><![CDATA[https://ifac.or.kr/upfiles/culture/2014/thumb_f4810ee722bfb8b09.JPG]]></posterThumb>
    <description><![CDATA[관악으로 소통하며 하나 되는 국민적 축제]]></description>
  </item>
  <item>
    <idx><![CDATA[2591]]></idx>
    <title><![CDATA[팝페라와 함께하는 아시안의 향기]]></title>
    <link><![CDATA[https://ifac.or.kr/culture/view.do?key=m2102173741239&eventSn=2591]]></link>
    <category><![CDATA[음악/콘서트]]></category>
    <sdate><![CDATA[20140918]]></sdate>
    <edate><![CDATA[20140918]]></edate>
    <place><![CDATA[인천종합문화예술회관]]></place>
    <placeSido><![CDATA[인천광역시]]></placeSido>
    <placeGugun><![CDATA[남동구]]></placeGugun>
    <management><![CDATA[로멘틱 아르떼]]></management>
    <fee_case><![CDATA[무료]]></fee_case>
    <fee><![CDATA[무료]]></fee>
    <tel><![CDATA[032)511-6744]]></tel>
    <homepage><![CDATA[http://art.incheon.go.kr/app/reserveDay-5/6107]]></homepage>
    <poster><![CDATA[https://ifac.or.kr/upfiles/culture/2014/675a128a5030fe7f0.jpg]]></poster>
    <description><![CDATA[관람 시간 : 오후 7시]]></description>
  </item>
  <item>
    <idx><![CDATA[2590]]></idx>
    <title><![CDATA[밴드데이 가을방학]]></title>
    <link><![CDATA[https://ifac.or.kr/culture/view.do?key=m2102173741239&eventSn=2590]]></link>
    <category><![CDATA[음악/콘서트]]></category>
    <sdate><![CDATA[20140919]]></sdate>
    <edate><![CDATA[20140919]]></edate>
    <place><![CDATA[인천종합문화예술회관]]></place>
    <placeSido><![CDATA[인천광역시]]></placeSido>
    <placeGugun><![CDATA[남동구]]></placeGugun>
    <management><![CDATA[인천종합문화예술회관]]></management>
    <fee><![CDATA[전석 2만원]]></fee>
    <tel><![CDATA[032-420-2736]]></tel>
    <homepage><![CDATA[http://art.incheon.go.kr]]></homepage>
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

test('item 태그의 제목·링크·카테고리·일정·장소를 읽는다', () => {
  const parsed = parseIfacCultureXml(SAMPLE);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.total, 31);
  assert.equal(parsed.rows.length, 4);
  assert.equal(parsed.rows[0].title, '대한민국국제관악제');
  assert.equal(parsed.rows[0].category, '축제/문화행사');
  assert.equal(parsed.rows[0].sdate, '20140912');
  assert.equal(parsed.rows[0].edate, '20140918');
  assert.equal(parsed.rows[1].place, '인천종합문화예술회관');
  assert.equal(parsed.rows[1].placeSido, '인천광역시');
  assert.equal(parsed.rows[1].placeGugun, '남동구');
  assert.match(parsed.rows[1].link, /eventSn=2591/);
});

test('인증 오류 resultCode는 적재하지 않는다', () => {
  const parsed = parseIfacCultureXml('<iq><resultCode>0002</resultCode><resultMsg>등록되지 않은 API Key 입니다.</resultMsg></iq>');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.rows.length, 0);
  assert.match(parsed.message, /API Key/);
});

test('유효 데이터 없음(0007)은 빈 목록으로 성공 처리한다', () => {
  const parsed = parseIfacCultureXml('<iq><resultCode>0007</resultCode><resultMsg>유효 데이터가 없습니다.</resultMsg><totalCnt>0</totalCnt></iq>');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.rows.length, 0);
});

test('날짜·링크·권역·contentId를 안전하게 변환한다', () => {
  assert.equal(ymdDash('20140917'), '2014-09-17');
  assert.equal(extractHttpUrl('상세 https://ifac.or.kr/culture/view.do?eventSn=1'), 'https://ifac.or.kr/culture/view.do?eventSn=1');
  assert.equal(ifacMetro('인천광역시', '연수구'), 'INCHEON');
  assert.equal(ifacMetro('서울특별시', ''), 'SEOUL');
  assert.equal(ifacMetro('경기도', '김포'), 'GYEONGGI');
  const parsed = parseIfacCultureXml(SAMPLE);
  const first = toPersistableFestival(parsed.rows[0]);
  assert.equal(first.contentId, 'ifc-2559');
  assert.equal(first.eventStartDate, '2014-09-12');
  assert.equal(first.eventEndDate, '2014-09-18');
  assert.equal(first.category, '축제/문화행사');
  assert.equal(first.source, 'ifac');
  assert.equal(first.metro, 'SEOUL');
  assert.match(first.overview, /상세 https:\/\/ifac\.or\.kr/);
  const incheon = toPersistableFestival(parsed.rows[1]);
  assert.equal(incheon.metro, 'INCHEON');
  assert.match(incheon.address, /인천광역시/);
  assert.match(incheon.address, /남동구/);
  assert.equal(incheon.location_name, '인천종합문화예술회관');
  assert.equal(incheon.tel, '032-511-6744');
  const hashed = toPersistableFestival(parsed.rows[3]);
  assert.equal(hashed.contentId, contentIdFromRow(parsed.rows[3]));
  assert.match(hashed.contentId, /^ifc-/);
  const cats = countCategories(parsed.rows);
  assert.deepEqual(cats, [
    { name: '음악/콘서트', count: 2 },
    { name: '축제/문화행사', count: 2 },
  ]);
});
