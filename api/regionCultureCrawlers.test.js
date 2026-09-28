import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseBusanHtml,
  parseUlsanHtml,
  parseSejongHtml,
  parseGwangjuHtml,
  parseDaejeonHtml,
  parseJejuApi,
  parseSeoulEvents,
  parseGyeonggiTour,
  parseGyeonggiHtml,
  parseIncheonHtml,
  parseIncheonCalendar,
  fallbackCulture,
  crawlCultureForMetro,
  clearCultureCache,
  CULTURE_SOURCES,
} from './regionCultureCrawlers.js';

test('parseBusanHtml extracts thumbnail performances', () => {
  const html = `
    <ul class="board-thumbnail ty01">
      <li class="thumitem">
        <a href="javascript:void(0);" onclick="javascript:show('2488');" class="linkmove">
          <img alt="연극" />
          연극ㅣ영화 연극 〈타인의 삶〉 - 부산 2026-11-06 ~ 2026-11-07 부산시민회관 대극장
        </a>
      </li>
    </ul>`;
  const rows = parseBusanHtml(html);
  assert.equal(rows.length, 1);
  assert.match(rows[0].title, /타인의 삶/);
  assert.equal(rows[0].eventStartDate, '2026-11-06');
  assert.equal(rows[0].category, '공연');
  assert.equal(rows[0].source, 'bscf');
  assert.ok(rows[0].mapY);
});

test('parseUlsanHtml extracts exhibit cards', () => {
  const html = `
    <p class="ell row2 subject">자연을 바라보는 그림전 '태화강을 걷다'</p>
    <dl><dt>기간</dt><dd>2026-09-08 ~ 2026-09-14</dd></dl>
    <dl><dt>장소</dt><dd>울산문화예술회관 전시장</dd></dl>`;
  const rows = parseUlsanHtml(html);
  assert.equal(rows.length, 1);
  assert.match(rows[0].title, /태화강/);
  assert.equal(rows[0].category, '문화/예술');
});

test('parseSejongHtml extracts gallery cards', () => {
  const html = `
    <li>
      <div class="img_box"><img alt="썸네일"></div>
      <div class="txt_box">
        <span class="cate exh">전시</span>
        <strong class="tit">한글문화특별기획전1</strong>
        <ul class="info_list">
          <li class="sprio"><span class="if_tit">기간</span>2026-09-08 ~ 2026-09-30</li>
        </ul>
      </div>
    </li>`;
  const rows = parseSejongHtml(html);
  assert.equal(rows.length, 1);
  assert.match(rows[0].title, /한글문화특별기획전/);
  assert.equal(rows[0].category, '문화/예술');
});

test('parseGwangjuHtml extracts event list', () => {
  const html = `
    <li>
      <a href="/event.es?mid=a10303000000&seq=9854&act=view&p_cate=0303">
        <span class="list_cate">행사/축제</span>
        <span class="info_tit">제19회 아랍문화제</span>
        <span class="place">국립아시아문화전당 극장3</span>
        <span class="period">2026.09.08</span>
      </a>
    </li>`;
  const rows = parseGwangjuHtml(html, 'GWANGJU');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, '제19회 아랍문화제');
  assert.equal(rows[0].eventStartDate, '2026-09-08');
});

test('parseDaejeonHtml extracts program cards', () => {
  const html = `
    <a href="/web/selectProgramView.do?menuIdx=457&prg_id=2345" class="no-img">
      <p class="badge badge-01">공연</p>
      <div class="default-text">
        <p>Mozart 빛과 그림자</p>
        <span class="date">2026. 11. 12.</span>
      </div>
    </a>`;
  const rows = parseDaejeonHtml(html);
  assert.equal(rows.length, 1);
  assert.match(rows[0].title, /Mozart/);
  assert.equal(rows[0].category, '공연');
  assert.equal(rows[0].eventStartDate, '2026-11-12');
});

test('parseJejuApi maps JSON events', () => {
  const rows = parseJejuApi({
    items: [{
      seq: 1,
      name: 'JAZZ IN JEJU 2026',
      categoryName: '콘서트',
      start: Date.parse('2026-09-15T00:00:00+09:00'),
      end: Date.parse('2026-09-15T00:00:00+09:00'),
      addr1: '제주특별자치도 제주시',
      y: 33.49,
      x: 126.53,
    }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, '공연');
  assert.equal(rows[0].eventStartDate, '2026-09-15');
});

test('gyeongbuk and gangwon keep fallback culture when crawl is empty', () => {
  assert.ok(fallbackCulture('GYEONGBUK').some((item) => item.title.includes('안동')));
  assert.ok(fallbackCulture('GANGWON').some((item) => item.title.includes('춘천')));
});

test('crawlCultureForMetro uses injected fetch for Busan', async () => {
  clearCultureCache();
  const html = `
    <li class="thumitem">
      <a onclick="javascript:show('1');">
        음악회ㅣ콘서트 이주현 피아노 리사이틀 2026-10-30 ~ 2026-10-30 부산문화회관
      </a>
    </li>`;
  const rows = await crawlCultureForMetro('BUSAN', {
    skipCache: true,
    timeoutMs: 2000,
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => html,
      json: async () => ({}),
    }),
  });
  assert.ok(rows.some((item) => item.title.includes('리사이틀')));
});

test('CULTURE_SOURCES includes Seoul, Gyeonggi and Incheon', () => {
  assert.ok(CULTURE_SOURCES.SEOUL.some((item) => item.id === 'seoul'));
  assert.ok(CULTURE_SOURCES.GYEONGGI.some((item) => item.id === 'ggc'));
  assert.ok(CULTURE_SOURCES.INCHEON.some((item) => item.id === 'ifac'));
});

test('parseSeoulEvents maps culturalEventInfo rows', () => {
  const rows = parseSeoulEvents({
    culturalEventInfo: {
      row: [{
        CODENAME: '축제',
        GUNAME: '종로구',
        TITLE: '서울거리예술축제',
        STRTDATE: '2026-09-26 00:00:00.0',
        END_DATE: '2026-10-04 00:00:00.0',
        PLACE: '광화문광장',
        INQUIRY: '02-399-1000',
        PROGRAM: '거리예술 공연',
        MAIN_IMG: 'https://example.com/seoul.jpg',
        LAT: '37.572',
        LOT: '126.9769',
      }],
    },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, '서울거리예술축제');
  assert.equal(rows[0].source, 'seoul');
  assert.equal(rows[0].eventStartDate, '2026-09-26');
  assert.ok(rows[0].mapY);
});

test('parseGyeonggiTour maps ggtour festival items', () => {
  const rows = parseGyeonggiTour({
    data: {
      items: [{
        contentId: '3488421',
        title: '이천쌀문화축제',
        imageUrl: 'https://tong.visitkorea.or.kr/cms/a.jpg',
        coordinate: { mapX: 127.443, mapY: 37.272 },
        additionalFestivalMo: {
          eventStartDate: '20261022',
          eventEndDate: '20261026',
          eventPlace: '경기도 이천시 경충대로 2697',
        },
      }],
    },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, '이천쌀문화축제');
  assert.equal(rows[0].source, 'ggc');
  assert.equal(rows[0].eventStartDate, '2026-10-22');
});

test('parseGyeonggiHtml extracts ggcf event cards', () => {
  const html = `
    <a href="https://www.ggcf.kr/events/334">
      <p class="poster_title">다산초당 이끼테라리움</p>
      <p class="date"><strong>기간 </strong> 2026-10-11(일) ~ 2026-10-25(일)</p>
      <p class="place"><strong>장소 </strong> 실학박물관</p>
    </a>`;
  const rows = parseGyeonggiHtml(html);
  assert.equal(rows.length, 1);
  assert.match(rows[0].title, /다산초당/);
  assert.equal(rows[0].eventStartDate, '2026-10-11');
  assert.equal(rows[0].source, 'ggcf');
});

test('parseIncheonHtml keeps Incheon events and drops Seoul listings', () => {
  const html = `
    <p class="title">[인천 송도] 코리안 페스티벌</p>
    <ul class="info wMax75">
      <li><b>주최</b><span>송도 센트럴파크 잔디광장</span></li>
      <li><b>모임기간</b><span>2026.09.29 ~ 2026.10.05</span></li>
    </ul>
    <p class="title">강남 콘서트</p>
    <ul class="info wMax75">
      <li><b>주최</b><span>서울 강남구 봉은사로 403</span></li>
      <li><b>모임기간</b><span>2026.09.16 ~ 2026.10-03</span></li>
    </ul>`;
  const rows = parseIncheonHtml(html);
  assert.ok(rows.some((item) => item.title.includes('코리안 페스티벌')));
  assert.equal(rows.some((item) => item.title.includes('강남')), false);
  assert.equal(rows[0].source, 'ifac');
});

test('parseIncheonCalendar filters to Incheon addresses', () => {
  const rows = parseIncheonCalendar([{
    eventList: [
      { eventSn: 1, eventNm: '송도 청년주간', facAdresBass: '인천광역시 연수구', eventBgnde: '2026-09-14', eventEndde: '2026-10-30' },
      { eventSn: 2, eventNm: '강남 대회', facAdresBass: '서울 강남구 봉은사로', eventBgnde: '2026-09-16', eventEndde: '2026-10-03' },
    ],
  }]);
  assert.equal(rows.length, 1);
  assert.match(rows[0].title, /송도/);
});

test('crawlCultureForMetro uses injected Seoul JSON', async () => {
  clearCultureCache();
  const payload = {
    culturalEventInfo: {
      row: [{
        CODENAME: '축제',
        GUNAME: '중구',
        TITLE: '서울빛초롱축제',
        STRTDATE: '2026-12-12',
        END_DATE: '2027-01-04',
        PLACE: '청계천',
        LAT: '37.5694',
        LOT: '126.9783',
      }],
    },
  };
  const rows = await crawlCultureForMetro('SEOUL', {
    skipCache: true,
    timeoutMs: 2000,
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify(payload),
      json: async () => payload,
    }),
  });
  assert.ok(rows.some((item) => item.title.includes('빛초롱')));
  assert.equal(rows[0].source, 'seoul');
});

