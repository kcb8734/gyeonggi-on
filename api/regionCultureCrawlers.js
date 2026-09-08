import { createHash } from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import { AREA_CODE_BY_METRO, REGION_LABEL, normalizeMetroId } from './metroLocalities.js';
import { categoryForFestival, classifyFestival } from './festivalCategories.js';
import { geocodePlace, hasValidCoords, metroFromPlace, SIDO_NAME, withCoords } from './metroGeo.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const INSECURE_HOSTS = new Set(['dmgj.kr', 'www.dmgj.kr', 'dcaf.or.kr', 'www.dcaf.or.kr']);

const CACHE = new Map();
const CACHE_MS = 10 * 60 * 1000;

export const CULTURE_SOURCES = {
  BUSAN: [
    { id: 'bscf', label: '부산문화재단', url: 'https://www.bscf.or.kr/view.do?no=1016' },
    { id: 'bscf', label: '부산문화재단 축제', url: 'https://www.bscf.or.kr/view.do?no=1016&tab=C009' },
  ],
  GYEONGBUK: [{ id: 'gacf', label: '경상북도문화관광재단', url: 'https://www.gacf.kr/home/sub4/sub1.asp' }],
  ULSAN: [{ id: 'ulsan', label: '울산문화24', url: 'https://www.ulsanculture.kr/webuser/exhibit/all_list.html' }],
  SEJONG: [{
    id: 'sjcf',
    label: '세종시문화관광재단',
    url: 'https://www.sjcf.or.kr/clturEvent/list.do?clturEventSn=&key=2111060073&pageIndex=1&orderBy=registDe+desc&sc_pblprfrDateS=&sc_pblprfrDateE=&sc=clturEventSj&sw=',
  }],
  JEJU: [
    { id: 'jeju-api', label: '제주인놀다 API', url: 'https://www.jejunolda.com/api/event/?page=1&pageSize=50', kind: 'json' },
    { id: 'jeju', label: '제주인놀다', url: 'https://www.jejunolda.com/event/progress.htm' },
  ],
  GANGWON: [{ id: 'gwcf', label: '강원문화재단', url: 'https://www.gwcf.or.kr/gwcf/ko/operating/culture-art-db/event.html?no=4' }],
  GWANGJU: [{ id: 'dmgj', label: '디어마이광주', url: 'https://dmgj.kr/event.es?mid=a10303000000&p_cate=0303' }],
  JEONNAM: [{ id: 'dmgj', label: '광주전남 디어마이', url: 'https://dmgj.kr/event.es?mid=a10303000000&p_cate=0303' }],
  DAEJEON: [{ id: 'dcaf', label: '대전문화재단', url: 'https://dcaf.or.kr/web/index.do' }],
  DAEGU: [{ id: 'dgfca', label: '대구문화예술진흥원', url: 'https://dgfca.or.kr/event/all/list', kind: 'daegu' }],
};

function text(value) {
  return String(value == null ? '' : value).trim();
}

export function decodeHtml(value) {
  return text(value)
    .replace(/&#40;/g, '(')
    .replace(/&#41;/g, ')')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/gi, "'");
}

export function stripTags(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function parseYmd(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return kstYmd(raw);
  const value = text(raw);
  if (!value) return '';
  const iso = value.match(/(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const compact = value.replace(/\D/g, '');
  if (compact.length === 13) return kstYmd(Number(compact));
  if (compact.length === 10) return kstYmd(Number(compact) * 1000);
  if (compact.length >= 8) return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  return '';
}

export function parsePeriod(raw) {
  const value = text(raw);
  const match = value.match(/(\d{4}[.\-/년]\s*\d{1,2}[.\-/월]\s*\d{1,2})[^\d]{0,8}[~～\-]\s*(\d{4}[.\-/년]\s*\d{1,2}[.\-/월]\s*\d{1,2}|\d{1,2}[.\-/]\s*\d{1,2})/);
  if (!match) {
    const start = parseYmd(value);
    return { start, end: start };
  }
  const start = parseYmd(match[1]);
  let end = parseYmd(match[2]);
  if (!end && start) {
    const md = String(match[2]).match(/(\d{1,2})[.\-/]\s*(\d{1,2})/);
    if (md) end = `${start.slice(0, 4)}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`;
  }
  return { start, end: end || start };
}

function kstYmd(ms) {
  const at = Number(ms);
  if (!Number.isFinite(at) || at <= 0) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(at));
  } catch {
    return new Date(at + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
}

function cultureId(metro, source, title, start) {
  const hash = createHash('sha1').update(`${metro}|${source}|${title}|${start}`).digest('hex').slice(0, 10);
  return `c-${String(metro).slice(0, 3).toLowerCase()}-${hash}`.slice(0, 40);
}

function toCultureFestival(partial, metro, source) {
  const title = text(partial.title).slice(0, 100);
  const start = parseYmd(partial.eventStartDate || partial.start) || kstYmd(partial.start);
  if (!title || !start) return null;
  const end = parseYmd(partial.eventEndDate || partial.end) || kstYmd(partial.end) || start;
  const address = text(partial.address || partial.place || SIDO_NAME[metro] || '');
  const extra = `${partial.categoryHint || ''} ${partial.overview || ''} ${partial.kind || ''}`;
  const item = {
    contentId: text(partial.contentId) || cultureId(metro, source, title, start),
    contentTypeId: '15',
    title,
    address,
    eventStartDate: start,
    eventEndDate: end,
    firstImage: text(partial.firstImage) || undefined,
    mapX: Number(partial.mapX) || undefined,
    mapY: Number(partial.mapY) || undefined,
    tel: text(partial.tel) || undefined,
    overview: text(partial.overview || extra) || undefined,
    areaCode: AREA_CODE_BY_METRO[metro],
    source,
    metro,
    categoryHint: extra,
  };
  item.category = categoryForFestival({
    source,
    title,
    extra,
    category: classifyFestival(title, extra),
  });
  const geo = withCoords(item, metro);
  item.mapY = geo.latitude;
  item.mapX = geo.longitude;
  return item;
}

export function parseBusanHtml(html, metro = 'BUSAN') {
  const blocks = String(html || '').match(/<li class="thumitem">[\s\S]*?<\/li>/gi) || [];
  return blocks.map((block) => {
    const onclick = block.match(/show\('(\d+)'\)/);
    const plain = stripTags(block);
    const period = parsePeriod(plain);
    const dateHit = plain.match(/(\d{4}-\d{2}-\d{2}\s*[~～]\s*\d{4}-\d{2}-\d{2})/);
    const before = dateHit ? plain.slice(0, plain.indexOf(dateHit[1])).trim() : plain;
    const after = dateHit ? plain.slice(plain.indexOf(dateHit[1]) + dateHit[1].length).trim() : '';
    const title = before.replace(/^[가-힣A-Za-zㅣ|/\s]{0,12}\s/, '').replace(/\s*-\s*부산\s*$/, '').trim() || before;
    return toCultureFestival({
      contentId: onclick ? `bscf-${onclick[1]}` : undefined,
      title,
      eventStartDate: period.start,
      eventEndDate: period.end,
      address: after || '부산광역시',
      overview: plain,
      kind: before,
    }, metro, 'bscf');
  }).filter(Boolean);
}

export function parseUlsanHtml(html, metro = 'ULSAN') {
  const blocks = String(html || '').match(/<p class="ell row2 subject">([\s\S]*?)<\/p>[\s\S]{0,500}?<dt>기간<\/dt>\s*<dd>([\s\S]*?)<\/dd>[\s\S]{0,400}?<dt>장소<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi) || [];
  return blocks.map((block) => {
    const title = stripTags((block.match(/subject">([\s\S]*?)<\/p>/i) || [])[1] || '');
    const period = parsePeriod((block.match(/기간<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i) || [])[1] || '');
    const place = stripTags((block.match(/장소<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i) || [])[1] || '울산광역시');
    return toCultureFestival({
      title,
      eventStartDate: period.start,
      eventEndDate: period.end,
      address: place,
      kind: title,
    }, metro, 'ulsan');
  }).filter(Boolean);
}

export function parseSejongHtml(html, metro = 'SEJONG') {
  const blocks = String(html || '').match(/<li>\s*<div class="img_box">[\s\S]*?<\/li>/gi) || [];
  return blocks.map((block) => {
    const title = stripTags((block.match(/<strong class="tit">([\s\S]*?)<\/strong>/i) || [])[1] || '');
    const cate = stripTags((block.match(/class="cate[^"]*">([\s\S]*?)<\/span>/i) || [])[1] || '');
    const period = parsePeriod((block.match(/기간<\/span>([\s\S]*?)<\/li>/i) || [])[1] || '');
    return toCultureFestival({
      title,
      eventStartDate: period.start,
      eventEndDate: period.end,
      address: '세종특별자치시',
      kind: cate,
      categoryHint: cate,
    }, metro, 'sjcf');
  }).filter(Boolean);
}

export function parseGwangjuHtml(html, metro = 'GWANGJU') {
  const blocks = String(html || '').match(/<li>\s*<a href="\/event\.es[\s\S]*?<\/li>/gi) || [];
  return blocks.map((block) => {
    const title = stripTags((block.match(/class="info_tit">([\s\S]*?)<\/span>/i) || [])[1] || '');
    const place = stripTags((block.match(/class="place">([\s\S]*?)<\/span>/i) || [])[1] || '');
    const cate = stripTags((block.match(/class="list_cate">([\s\S]*?)<\/span>/i) || [])[1] || '');
    const period = parsePeriod((block.match(/class="period">([\s\S]*?)<\/span>/i) || [])[1] || '');
    const seq = (block.match(/seq=(\d+)/) || [])[1];
    const resolvedMetro = metroFromPlace(place) || metro;
    if (metro === 'JEONNAM' && resolvedMetro === 'GWANGJU') return null;
    if (metro === 'GWANGJU' && resolvedMetro === 'JEONNAM') return null;
    return toCultureFestival({
      contentId: seq ? `dmgj-${seq}` : undefined,
      title,
      eventStartDate: period.start,
      eventEndDate: period.end,
      address: place || SIDO_NAME[metro],
      kind: cate,
      categoryHint: cate,
    }, resolvedMetro === 'JEONNAM' || resolvedMetro === 'GWANGJU' ? resolvedMetro : metro, 'dmgj');
  }).filter(Boolean);
}

export function parseDaejeonHtml(html, metro = 'DAEJEON') {
  const blocks = String(html || '').match(/<a href="\/web\/selectProgramView\.do[^"]*"[\s\S]*?<\/a>/gi) || [];
  const seen = new Set();
  return blocks.map((block) => {
    const badge = stripTags((block.match(/class="badge[^"]*">([\s\S]*?)<\/p>/i) || [])[1] || '');
    const title = stripTags((block.match(/<div class="default-text">\s*<p>([\s\S]*?)<\/p>/i) || [])[1] || '');
    const date = stripTags((block.match(/<span class="date">([\s\S]*?)<\/span>/i) || [])[1] || '');
    const period = parsePeriod(date);
    const key = `${title}|${period.start}`;
    if (!title || seen.has(key)) return null;
    seen.add(key);
    const prg = (block.match(/prg_id=(\d+)/) || [])[1];
    return toCultureFestival({
      contentId: prg ? `dcaf-${prg}` : undefined,
      title,
      eventStartDate: period.start,
      eventEndDate: period.end,
      address: '대전광역시',
      kind: badge,
      categoryHint: badge,
    }, metro, 'dcaf');
  }).filter(Boolean);
}

export function parseJejuApi(payload, metro = 'JEJU') {
  const items = payload && Array.isArray(payload.items) ? payload.items : [];
  return items.map((row) => {
    const cover = text(row.cover || row.coverThumb || row.poster);
    const image = cover
      ? (cover.startsWith('http') ? cover : `https://www.jejunolda.com/upload/${cover}`)
      : undefined;
    return toCultureFestival({
      contentId: row.seq != null ? `jeju-${row.seq}` : undefined,
      title: row.name,
      start: row.start,
      end: row.end,
      address: [row.addr1, row.addr2].filter(Boolean).join(' ') || row.regName || '제주특별자치도',
      tel: row.tel,
      overview: row.intro,
      firstImage: image,
      mapX: row.x,
      mapY: row.y,
      kind: row.categoryName,
      categoryHint: row.categoryName,
    }, metro, 'jeju');
  }).filter(Boolean);
}

export function parseDaeguEvents(rows, metro = 'DAEGU') {
  return (rows || []).map((row) => toCultureFestival({
    contentId: row.event_seq != null ? `dgfca-${row.event_seq}` : undefined,
    title: row.subject,
    eventStartDate: row.start_date,
    eventEndDate: row.end_date,
    address: row.place || row.event_area_nm || '대구광역시',
    kind: row.event_gubun === 'PF' ? '공연' : row.event_gubun === 'XP' ? '체험' : row.event_gubun === 'DP' ? '전시' : '문화',
    categoryHint: row.event_gubun_nm || row.event_gubun,
    overview: row.content,
  }, metro, 'dgfca')).filter(Boolean);
}

export function parseGenericHtml(html, metro, source) {
  const titles = [];
  const pats = [
    /class="(?:info_tit|tit|subject)[^"]*">([\s\S]*?)<\//gi,
    /<strong class="tit">([\s\S]*?)<\/strong>/gi,
  ];
  for (const pat of pats) {
    let match;
    while ((match = pat.exec(html || ''))) {
      const title = stripTags(match[1]);
      if (title && title.length >= 4 && /[가-힣]/.test(title) && !/바로가기|메뉴|검색/.test(title)) {
        titles.push(title);
      }
    }
    if (titles.length) break;
  }
  const dates = (String(html || '').match(/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/g) || []).map(parseYmd).filter(Boolean);
  return titles.slice(0, 40).map((title, index) => toCultureFestival({
    title,
    eventStartDate: dates[index] || dates[0],
    eventEndDate: dates[index] || dates[0],
    address: SIDO_NAME[metro],
  }, metro, source)).filter(Boolean);
}

const FALLBACKS = {
  GANGWON: [
    { title: '춘천마임축제', start: '2026-05-22', end: '2026-05-31', address: '강원특별자치도 춘천시', kind: '공연' },
    { title: '평창효석문화제', start: '2026-09-05', end: '2026-09-14', address: '강원특별자치도 평창군', kind: '문화' },
    { title: '강릉커피축제', start: '2026-10-02', end: '2026-10-05', address: '강원특별자치도 강릉시', kind: '체험' },
  ],
  GYEONGBUK: [
    { title: '안동국제탈춤페스티벌', start: '2026-09-26', end: '2026-10-05', address: '경상북도 안동시', kind: '공연' },
    { title: '문경찻사발축제', start: '2026-05-01', end: '2026-05-10', address: '경상북도 문경시', kind: '체험' },
    { title: '영덕대게축제', start: '2026-04-24', end: '2026-05-03', address: '경상북도 영덕군', kind: '먹거리' },
  ],
  GWANGJU: [
    { title: '제19회 아랍문화제', start: '2026-09-08', end: '2026-09-15', address: '광주광역시 동구 국립아시아문화전당', kind: '공연' },
    { title: '백운광장 스트리트 푸드 페스티벌', start: '2026-09-05', end: '2026-09-07', address: '광주광역시', kind: '먹거리' },
    { title: '충장예술 골목여행', start: '2026-09-05', end: '2026-11-15', address: '광주광역시 동구', kind: '체험' },
  ],
  DAEJEON: [
    { title: 'Mozart 빛과 그림자', start: '2026-11-12', end: '2026-11-12', address: '대전광역시', kind: '공연' },
    { title: '김지연 피아노 리사이틀', start: '2026-10-16', end: '2026-10-16', address: '대전광역시', kind: '공연' },
    { title: '대전 국제 아시아 미술 교류전', start: '2026-10-06', end: '2026-10-11', address: '대전광역시', kind: '전시' },
  ],
};

export function fallbackCulture(metro) {
  return (FALLBACKS[metro] || []).map((row) => toCultureFestival({
    title: row.title,
    eventStartDate: row.start,
    eventEndDate: row.end,
    address: row.address,
    kind: row.kind,
    categoryHint: row.kind,
  }, metro, 'culture')).filter(Boolean);
}

const insecureHttpsAgent = new https.Agent({ rejectUnauthorized: false });

function requestText(url, headers, insecure, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers,
      timeout: timeoutMs,
      agent: insecure && lib === https ? insecureHttpsAgent : undefined,
      rejectUnauthorized: insecure ? false : undefined,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: res.statusCode || 0,
          location: res.headers.location,
          type: String(res.headers['content-type'] || ''),
          body,
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

export async function fetchCultureText(url, options = {}) {
  if (options.fetchImpl) {
    const res = await options.fetchImpl(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        Referer: url,
      },
      signal: options.signal,
    });
    if (!res || !res.ok) {
      const err = new Error(`문화 페이지 응답 ${res && res.status}`);
      err.status = res && res.status;
      throw err;
    }
    const type = String(res.headers && res.headers.get && res.headers.get('content-type') || '');
    if (type.includes('json') || options.asJson) return res.json();
    return res.text();
  }
  const headers = {
    'User-Agent': UA,
    Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    Referer: url,
  };
  const host = new URL(url).hostname;
  const insecure = INSECURE_HOSTS.has(host);
  let current = url;
  let payload = null;
  for (let hop = 0; hop < 3; hop += 1) {
    try {
      payload = await requestText(current, headers, insecure);
    } catch (err) {
      if (!insecure) {
        payload = await requestText(current, headers, true);
      } else {
        throw err;
      }
    }
    if (payload.status >= 300 && payload.status < 400 && payload.location) {
      current = new URL(payload.location, current).toString();
      continue;
    }
    break;
  }
  if (!payload || payload.status < 200 || payload.status >= 400) {
    const err = new Error(`문화 페이지 응답 ${payload && payload.status}`);
    err.status = payload && payload.status;
    throw err;
  }
  if ((payload.type && payload.type.includes('json')) || options.asJson) {
    return JSON.parse(payload.body);
  }
  return payload.body;
}

async function crawlDaegu(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const listRes = await fetchImpl('https://dgfca.or.kr/ajax/event/list', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: 'https://dgfca.or.kr/event/all/list',
    },
    body: `start_date=${month}`,
    signal: options.signal,
  });
  const monthly = listRes && listRes.ok ? await listRes.json() : [];
  const dates = [...new Set((monthly || []).map((row) => text(row.start_date)).filter(Boolean))].slice(0, 6);
  const gubuns = ['PF', 'DP', 'EV', 'ST', 'XP'];
  const rows = [];
  const seen = new Set();
  await Promise.all(dates.flatMap((date) => gubuns.map(async (gubun) => {
    try {
      const res = await fetchImpl('https://dgfca.or.kr/ajax/event/gubun/list', {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: 'https://dgfca.or.kr/event/all/list',
        },
        body: `event_gubun=${gubun}&target_date=${date}`,
        signal: options.signal,
      });
      const data = res && res.ok ? await res.json() : [];
      for (const row of data || []) {
        const key = `${row.event_seq}|${row.subject}`;
        if (!row.subject || seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }
    } catch {
      // keep going
    }
  })));
  return parseDaeguEvents(rows, 'DAEGU');
}

function parseBySource(source, payload, metro) {
  if (source.id === 'bscf') return parseBusanHtml(payload, metro);
  if (source.id === 'ulsan') return parseUlsanHtml(payload, metro);
  if (source.id === 'sjcf') return parseSejongHtml(payload, metro);
  if (source.id === 'dmgj') return parseGwangjuHtml(payload, metro);
  if (source.id === 'dcaf') return parseDaejeonHtml(payload, metro);
  if (source.id === 'jeju-api') return parseJejuApi(payload, metro);
  if (source.id === 'gacf' || source.id === 'gwcf' || source.id === 'jeju') {
    return parseGenericHtml(payload, metro, source.id);
  }
  return parseGenericHtml(payload, metro, source.id);
}

export function cultureToHome(item, metro) {
  const zone = metro || item.metro || 'GYEONGGI';
  const geo = withCoords(item, zone);
  return {
    id: item.contentId ? `tour-${item.contentId}` : item.title,
    contentId: item.contentId,
    contentTypeId: item.contentTypeId || '15',
    title: item.title,
    location_name: item.address,
    latitude: geo.latitude,
    longitude: geo.longitude,
    start_date: item.eventStartDate,
    end_date: item.eventEndDate,
    municipality_name: cityLabelSafe(item.address),
    description: item.overview || null,
    category: categoryForFestival(item),
    image_url: item.firstImage || null,
    is_trending: Boolean(item.firstImage),
    source: item.source || 'culture',
    tel: item.tel,
    regionalZone: zone,
    metro: zone,
    areaCode: item.areaCode || AREA_CODE_BY_METRO[zone],
  };
}

function cityLabelSafe(address) {
  const parts = String(address || '').split(/\s+/).filter(Boolean);
  return parts[1] || parts[0] || null;
}

export function catalogCultureSources() {
  return Object.entries(CULTURE_SOURCES).map(([metro, sources]) => ({
    metro,
    label: REGION_LABEL[metro],
    sources: sources.map((item) => ({ id: item.id, label: item.label, url: item.url })),
  }));
}

export async function crawlCultureForMetro(metroInput, options = {}) {
  const metro = normalizeMetroId(metroInput);
  const cached = CACHE.get(metro);
  if (!options.skipCache && cached && (Date.now() - cached.at) < CACHE_MS) return cached.items;
  const sources = CULTURE_SOURCES[metro] || [];
  const timeoutMs = Number(options.timeoutMs) || 8000;
  const controller = options.signal ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const signal = options.signal || (controller && controller.signal);
  let items = [];
  try {
    if (metro === 'DAEGU') {
      items = await crawlDaegu({ ...options, signal });
    } else {
      for (const source of sources) {
        try {
          const payload = await fetchCultureText(source.url, {
            fetchImpl: options.fetchImpl,
            signal,
            asJson: source.kind === 'json',
          });
          const parsed = parseBySource(source, payload, metro);
          items = items.concat(parsed);
        } catch (err) {
          if (options.fetchImpl) throw err;
        }
      }
    }
  } catch {
    items = [];
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!items.length) items = fallbackCulture(metro);
  const unique = [];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.title}|${item.eventStartDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  CACHE.set(metro, { at: Date.now(), items: unique });
  return unique;
}

export function clearCultureCache() {
  CACHE.clear();
}

export { hasValidCoords, geocodePlace };
