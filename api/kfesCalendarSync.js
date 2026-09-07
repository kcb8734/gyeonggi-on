import { persistTourFestivals, listFestivalCategoryCounts, writeTourSyncLog, festivalDateYmd, formatFestivalExtras } from './festivalDbSync.js';
import { AREA_CODE_BY_METRO } from './metroLocalities.js';
import { classifyFestival } from './tourLive.js';
import { logOpenApiEmpty } from './openApiFetch.js';

export const KFES_SOURCE = 'kfes';
export const KFES_API_NAME = 'festivalCalendarList';
export const KFES_CALENDAR_URL = 'https://korean.visitkorea.or.kr/kfes/list/festivalCalendar.do';
export const KFES_MONTH_URL = 'https://korean.visitkorea.or.kr/kfes/list/festivalCalendarUp.do';
export const KFES_DAY_URL = 'https://korean.visitkorea.or.kr/kfes/list/festivalCalendarList.do';
export const KFES_DETAIL_URL = 'https://korean.visitkorea.or.kr/kfes/detail/fstvlDetail.do';
export const KFES_CDN = 'https://kfescdn.visitkorea.or.kr/kfes/upload/contents/db';
export const KFES_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const METRO_BY_AREA = Object.fromEntries(
  Object.entries(AREA_CODE_BY_METRO).map(([metro, code]) => [String(code), metro]),
);

export function kfesYearMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number((parts.find((row) => row.type === 'year') || {}).value);
  const month = Number((parts.find((row) => row.type === 'month') || {}).value);
  return { year, month };
}

export function kfesDetailUrl(id) {
  return `${KFES_DETAIL_URL}?fstvlCntntsId=${encodeURIComponent(id)}`;
}

export function kfesImageUrl(path) {
  const value = String(path || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value.replace('http://', 'https://');
  const file = value.replace(/^\/data\/kfes\/contents\/db\//i, '').replace(/^\/+/, '');
  return file ? `${KFES_CDN}/${file}` : '';
}

export function stripKfesHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export { formatFestivalExtras, parseFestivalExtras } from './festivalDbSync.js';

export function uniqueKfesItems(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const id = String((row && (row.fstvlCntntsId || row.contentId)) || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

export function parseKfesCalendarMonth(raw) {
  try {
    const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const grid = payload && payload.data;
    const days = [];
    for (const week of Array.isArray(grid) ? grid : []) {
      for (const cell of Array.isArray(week) ? week : []) {
        const day = Number(cell && cell.day);
        const count = Number(cell && cell.count);
        if (day > 0 && count > 0) days.push({ day, count, startCount: Number(cell.startCount || 0), ongoingCount: Number(cell.ongoingCount || 0) });
      }
    }
    return { ok: days.length > 0, days, message: days.length ? '' : '해당 월 달력에 축제 날짜가 없습니다.' };
  } catch {
    return { ok: false, days: [], message: '구석구석 월별 달력 JSON을 읽지 못했습니다.' };
  }
}

export function parseKfesCalendarList(raw) {
  try {
    const payload = typeof raw === 'string' ? JSON.parse(String(raw).replace(/^\uFEFF/, '')) : raw;
    const list = payload && payload.dataList;
    const items = Array.isArray(list && list.items) ? list.items : [];
    return {
      ok: true,
      total: Number((list && list.total) || items.length),
      page: Number((list && list.page) || 0),
      items,
    };
  } catch {
    return { ok: false, total: 0, page: 0, items: [], message: '구석구석 일자 목록 JSON을 읽지 못했습니다.' };
  }
}

function infoAfterIco(html, icoClass) {
  const re = new RegExp(`info_ico\\s+${icoClass}[\\s\\S]{0,500}?<p class="info_content">([\\s\\S]*?)</p>`, 'i');
  const match = String(html || '').match(re);
  return stripKfesHtml(match && match[1] ? match[1] : '');
}

export function parseKfesDetailHtml(html) {
  const source = String(html || '');
  const homepage = ((source.match(/class="homepage_link_btn"[^>]*href="([^"]+)"/i)
    || source.match(/homepage_link_btn[\s\S]{0,240}?href="([^"]+)"/i)
    || [])[1] || '').trim();
  const tel = ((source.match(/href="tel:([^"]+)"/i) || [])[1] || infoAfterIco(source, 'tell') || '').trim();
  return {
    title: stripKfesHtml(((source.match(/<strong>([^<]+)<\/strong>/i) || [])[1] || '')),
    period: infoAfterIco(source, 'data').replace(/\s+/g, ' '),
    location: infoAfterIco(source, 'location'),
    fee: infoAfterIco(source, 'price'),
    organizer: infoAfterIco(source, 'partner'),
    tel,
    official_url: homepage,
    mapY: Number((source.match(/var\s+lat\s*=\s*'([0-9.]+)'/i) || [])[1] || 0) || undefined,
    mapX: Number((source.match(/var\s+lang\s*=\s*'([0-9.]+)'/i) || [])[1] || 0) || undefined,
  };
}

export function metroFromKfesArea(regnDivCd, address = '') {
  const fromCode = METRO_BY_AREA[String(regnDivCd || '').trim()];
  if (fromCode) return fromCode;
  const hay = String(address || '');
  if (hay.includes('서울')) return 'SEOUL';
  if (hay.includes('부산')) return 'BUSAN';
  if (hay.includes('대구')) return 'DAEGU';
  if (hay.includes('인천')) return 'INCHEON';
  if (hay.includes('광주광역시') || hay.includes('광주')) return 'GWANGJU';
  if (hay.includes('대전')) return 'DAEJEON';
  if (hay.includes('울산')) return 'ULSAN';
  if (hay.includes('세종')) return 'SEJONG';
  if (hay.includes('경기')) return 'GYEONGGI';
  if (hay.includes('강원')) return 'GANGWON';
  if (hay.includes('충북') || hay.includes('충청북')) return 'CHUNGBUK';
  if (hay.includes('충남') || hay.includes('충청남')) return 'CHUNGNAM';
  if (hay.includes('전북') || hay.includes('전라북')) return 'JEONBUK';
  if (hay.includes('전남') || hay.includes('전라남')) return 'JEONNAM';
  if (hay.includes('경북') || hay.includes('경상북')) return 'GYEONGBUK';
  if (hay.includes('경남') || hay.includes('경상남')) return 'GYEONGNAM';
  if (hay.includes('제주')) return 'JEJU';
  return 'GYEONGGI';
}

export function toPersistableKfesFestival(row, extra = {}) {
  const id = String((row && (row.fstvlCntntsId || row.contentId)) || '').trim();
  const title = String((row && (row.cntntsNm || row.title)) || extra.title || '').trim();
  const start = festivalDateYmd(row && (row.fstvlBgngDe || row.eventStartDate))
    || festivalDateYmd(extra.period);
  const end = festivalDateYmd(row && (row.fstvlEndDe || row.eventEndDate))
    || festivalDateYmd((String(extra.period || '').split(/~|～|-/)[1] || ''))
    || start;
  if (!id || !title || !start) return null;
  const address = extra.location
    || [row.adres, row.dtadr].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    || String(row.areaNm || '').trim();
  const fee = extra.fee || row.fstvlUtztfareInfo || '';
  const organizer = extra.organizer || [row.fstvlAspcsNm, row.fstvlMngtNm].filter(Boolean).join('/') || '';
  const homepage = extra.official_url || row.fstvlHmpgUrl || row.relaStmt1Url || '';
  const tel = extra.tel || row.fstvlAspcsTelno || row.fstvlMngtTelno || '';
  const overview = stripKfesHtml(row.fstvlOutlCn || row.fstvlCrmnCn || extra.overview || '');
  const period = extra.period || [row.fstvlBgngDe, row.fstvlEndDe].filter(Boolean).join(' - ');
  const metro = extra.metro || metroFromKfesArea(row.regnDivCd, `${address} ${row.areaNm || ''}`);
  return {
    contentId: id.slice(0, 40),
    title,
    address,
    location_name: address,
    eventStartDate: start,
    eventEndDate: end || start,
    firstImage: kfesImageUrl(row.dispFstvlCntntsImgRout || extra.image),
    mapY: extra.mapY || Number(row.ycrdVal || 0) || undefined,
    mapX: extra.mapX || Number(row.xcrdVal || 0) || undefined,
    tel: tel || undefined,
    category: classifyFestival(title, overview),
    overview: formatFestivalExtras(overview, { fee, organizer, homepage, period }),
    fee: fee || undefined,
    organizer: organizer || undefined,
    homepage: homepage || undefined,
    official_url: homepage || undefined,
    metro,
    areaCode: String(row.regnDivCd || '') || undefined,
    source: KFES_SOURCE,
  };
}

export async function fetchKfes(url, fetchImpl = fetch, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 8000);
  const started = Date.now();
  const headers = {
    Accept: options.accept || 'application/json,text/html,*/*',
    'User-Agent': KFES_UA,
    Referer: KFES_CALENDAR_URL,
  };
  try {
    const res = await fetchImpl(url, {
      headers,
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    console.error('[kfes] fetch failed', {
      url,
      ms: Date.now() - started,
      message: err && err.message ? err.message : String(err),
    });
    throw err;
  }
}

async function mapPool(items, concurrency, fn) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  let cursor = 0;
  async function worker() {
    while (cursor < list.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(list[index], index);
    }
  }
  const n = Math.max(1, Math.min(Number(concurrency) || 4, list.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function sleep(ms) {
  const wait = Number(ms) || 0;
  if (wait <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, wait));
}

export async function collectKfesCalendar(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const stamp = kfesYearMonth();
  const year = Number(options.year) || stamp.year;
  const month = Number(options.month) || stamp.month;
  const dayOffset = Math.min(80, Math.max(10, Number(options.offset) || 50));
  const concurrency = Math.min(6, Math.max(1, Number(options.concurrency) || 4));
  const maxDetails = Math.min(20, Math.max(0, Number(options.maxDetails ?? options.details ?? 8)));
  const delayMs = Math.min(2000, Math.max(0, Number(options.delayMs ?? 400)));

  const monthGot = await fetchKfes(`${KFES_MONTH_URL}?year=${year}&month=${month}`, fetchImpl, { timeoutMs: 8000 });
  const monthParsed = parseKfesCalendarMonth(monthGot.text);
  const days = monthParsed.ok
    ? monthParsed.days.map((row) => row.day)
    : Array.from({ length: 31 }, (_, i) => i + 1);

  if (!monthParsed.ok) {
    logOpenApiEmpty('festivalCalendarUp', {
      code: 'JSON',
      message: monthParsed.message,
      httpStatus: monthGot.status,
      xmlBytes: String(monthGot.text || '').length,
      preview: monthGot.text,
    });
  }

  const dayResults = await mapPool(days, concurrency, async (day) => {
    const all = [];
    let total = 0;
    for (let page = 0; page < 6; page += 1) {
      const url = `${KFES_DAY_URL}?year=${year}&month=${month}&day=${day}&page=${page}&offset=${dayOffset}`;
      const got = await fetchKfes(url, fetchImpl, { timeoutMs: 8000 });
      const parsed = parseKfesCalendarList(got.text);
      if (!parsed.ok) {
        if (!all.length) {
          return { ok: false, day, items: [], message: parsed.message };
        }
        break;
      }
      all.push(...parsed.items);
      total = parsed.total || all.length;
      if (!parsed.items.length || all.length >= total) break;
    }
    return { ok: true, day, items: all, total };
  });

  const merged = uniqueKfesItems(dayResults.flatMap((row) => (row && row.items) || []));
  if (!merged.length) {
    return {
      ok: false,
      year,
      month,
      days: days.length,
      items: [],
      message: '구석구석 월별 축제 목록이 비었습니다.',
    };
  }

  const extrasById = {};
  const needDetail = merged.filter((row) => {
    const fee = row.fstvlUtztfareInfo;
    const organizer = row.fstvlAspcsNm || row.fstvlMngtNm;
    const homepage = row.fstvlHmpgUrl;
    const tel = row.fstvlAspcsTelno || row.fstvlMngtTelno;
    return !fee || !organizer || !homepage || !tel;
  }).slice(0, maxDetails);

  for (let i = 0; i < needDetail.length; i += 1) {
    if (i > 0) await sleep(delayMs);
    const row = needDetail[i];
    const id = String(row.fstvlCntntsId || '');
    try {
      const got = await fetchKfes(kfesDetailUrl(id), fetchImpl, {
        accept: 'text/html,application/xhtml+xml,*/*',
        timeoutMs: 8000,
      });
      extrasById[id] = parseKfesDetailHtml(got.text);
    } catch (err) {
      extrasById[id] = { error: err && err.message ? err.message : String(err) };
    }
  }

  const items = merged.map((row) => toPersistableKfesFestival(row, extrasById[row.fstvlCntntsId] || {})).filter(Boolean);
  return {
    ok: items.length > 0,
    year,
    month,
    days: days.length,
    unique: merged.length,
    detailed: needDetail.length,
    items,
    message: items.length ? '' : '구석구석 축제 매핑 결과가 비었습니다.',
  };
}

export async function syncKfesCalendar(options = {}) {
  let collected;
  try {
    collected = await collectKfesCalendar(options);
  } catch (err) {
    const message = err && err.message ? err.message : '구석구석 축제 캘린더에 연결하지 못했습니다.';
    await writeTourSyncLog({
      targetApi: KFES_API_NAME,
      fetched: 0,
      failed: 1,
      status: '실패',
      message,
    });
    return {
      success: false,
      source: KFES_SOURCE,
      sourceLabel: '대한민국 구석구석 월별 축제',
      targetApi: KFES_API_NAME,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      failed: 1,
      categories: [],
      count: 0,
      message,
    };
  }

  if (!collected.ok) {
    await writeTourSyncLog({
      targetApi: KFES_API_NAME,
      fetched: 0,
      failed: 1,
      status: '실패',
      message: collected.message,
    });
    return {
      success: false,
      source: KFES_SOURCE,
      sourceLabel: '대한민국 구석구석 월별 축제',
      targetApi: KFES_API_NAME,
      year: collected.year,
      month: collected.month,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      failed: 1,
      categories: [],
      count: 0,
      message: collected.message,
    };
  }

  const persist = await persistTourFestivals(collected.items, { source: KFES_SOURCE });
  const categories = persist.ok ? await listFestivalCategoryCounts() : [];
  await writeTourSyncLog({
    targetApi: KFES_API_NAME,
    fetched: persist.upserted || collected.items.length,
    failed: persist.ok ? 0 : 1,
    status: persist.ok ? '정상' : '실패',
    message: persist.message,
  });
  return {
    success: persist.ok || collected.items.length > 0,
    source: KFES_SOURCE,
    sourceLabel: '대한민국 구석구석 월별 축제',
    targetApi: KFES_API_NAME,
    year: collected.year,
    month: collected.month,
    fetched: collected.items.length,
    unique: collected.unique,
    detailed: collected.detailed,
    upserted: persist.upserted,
    skipped: persist.skipped,
    persisted: persist.ok,
    failed: persist.ok ? 0 : 1,
    categories,
    festivals: collected.items,
    data: collected.items,
    count: categories.reduce((sum, row) => sum + Number(row.count || 0), 0) || persist.upserted || collected.items.length,
    message: persist.ok
      ? `구석구석 ${collected.year}.${String(collected.month).padStart(2, '0')} 축제 ${persist.upserted}건을 수집·적재했습니다.`
      : `구석구석 축제 ${collected.items.length}건을 파싱했습니다. ${persist.message}`,
  };
}
