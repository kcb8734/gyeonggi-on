/**
 * 대한민국 구석구석 월별 축제 달력 (일자별) 크롤링.
 * https://korean.visitkorea.or.kr/kfes/list/festivalCalendar.do
 */
import { MOI_CODE_BY_METRO, REGION_LABEL, normalizeMetroId } from './metroLocalities.js';
import { classifyFestival } from './tourLive.js';

export const KFES_ORIGIN = 'https://korean.visitkorea.or.kr';
export const KFES_CALENDAR = `${KFES_ORIGIN}/kfes/list/festivalCalendar.do`;
export const KFES_CALENDAR_UP = `${KFES_ORIGIN}/kfes/list/festivalCalendarUp.do`;
export const KFES_CALENDAR_LIST = `${KFES_ORIGIN}/kfes/list/festivalCalendarList.do`;
export const KFES_CDN = 'https://kfescdn.visitkorea.or.kr/kfes/upload';
const PAGE_SIZE = 12;

const SIDO_METRO = {
  서울: 'SEOUL', 부산: 'BUSAN', 대구: 'DAEGU', 인천: 'INCHEON', 광주: 'GWANGJU',
  대전: 'DAEJEON', 울산: 'ULSAN', 세종: 'SEJONG', 경기: 'GYEONGGI', 경기도: 'GYEONGGI',
  강원: 'GANGWON', 충북: 'CHUNGBUK', 충청북도: 'CHUNGBUK', 충남: 'CHUNGNAM', 충청남도: 'CHUNGNAM',
  전북: 'JEONBUK', 전라북도: 'JEONBUK', 전남: 'JEONNAM', 전라남도: 'JEONNAM',
  경북: 'GYEONGBUK', 경상북도: 'GYEONGBUK', 경남: 'GYEONGNAM', 경상남도: 'GYEONGNAM',
  제주: 'JEJU',
};

function text(value) {
  return String(value == null ? '' : value).trim();
}

function kfesHeaders() {
  return {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    Referer: KFES_CALENDAR,
    'User-Agent': 'kdanji-festival-sync/1.0',
  };
}

export function kfesImageUrl(item) {
  const raw = text(item && (item.dispFstvlCntntsImgRout || item.posterImgRout));
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
  return raw.replace('/data/kfes/contents/db/', `${KFES_CDN}/contents/db/300_`);
}

export function kfesDate(value) {
  const digits = text(value).replace(/\D/g, '');
  if (digits.length !== 8) return '';
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function metroFromKfes(item) {
  const code = text(item && item.regnDivCd);
  const byMoi = Object.entries(MOI_CODE_BY_METRO).find(([, moi]) => moi === code);
  if (byMoi) return byMoi[0];
  const area = text(item && item.areaNm);
  const hit = Object.entries(SIDO_METRO).find(([name]) => area.startsWith(name) || area.includes(name));
  return hit ? hit[1] : 'GYEONGGI';
}

export function toKfesFestival(item) {
  const kfesId = text(item && item.fstvlCntntsId);
  const title = text(item && item.cntntsNm);
  if (!kfesId || !title) return null;
  const start = kfesDate(item.fstvlBgngDe);
  const end = kfesDate(item.fstvlEndDe) || start;
  if (!start) return null;
  const cmsId = text(item.cmsCntntsId);
  const metro = metroFromKfes(item);
  const address = text(item.adres) || text(item.areaNm);
  const place = text(item.dtadr);
  const image = kfesImageUrl(item);
  return {
    contentId: cmsId || `kfes-${kfesId}`,
    kfesId,
    cmsCntntsId: cmsId || undefined,
    contentTypeId: '15',
    title: title.slice(0, 100),
    address,
    location_name: place || address,
    eventStartDate: start,
    eventEndDate: end,
    start_date: start,
    end_date: end,
    firstImage: image || undefined,
    image_url: image || undefined,
    mapX: Number(item.xcrdVal) || 0,
    mapY: Number(item.ycrdVal) || 0,
    longitude: Number(item.xcrdVal) || null,
    latitude: Number(item.ycrdVal) || null,
    tel: text(item.fstvlMngtTelno || item.fstvlAspcsTelno) || undefined,
    category: classifyFestival(title, text(item.fstvlOutlCn)),
    overview: text(String(item.fstvlOutlCn || item.fstvlCrmnCn || '').replace(/<[^>]+>/g, ' ')),
    areaNm: text(item.areaNm),
    metro,
    regionalZone: metro,
    source: 'visitkorea',
    homepage: text(item.fstvlHmpgUrl) || undefined,
  };
}

export function daysWithFestivals(payload) {
  const weeks = Array.isArray(payload && payload.data) ? payload.data : [];
  const days = [];
  weeks.forEach((week) => {
    (Array.isArray(week) ? week : []).forEach((cell) => {
      const day = Number(cell && cell.day);
      const count = Number(cell && cell.count);
      if (day > 0 && count > 0) days.push(day);
    });
  });
  return [...new Set(days)].sort((a, b) => a - b);
}

async function readJson(fetchImpl, url) {
  const res = await fetchImpl(url, { headers: kfesHeaders() });
  if (!res.ok) throw new Error(`구석구석 달력 HTTP ${res.status}`);
  return res.json();
}

export async function fetchCalendarDays(year, month, fetchImpl = fetch) {
  const url = `${KFES_CALENDAR_UP}?year=${year}&month=${month}`;
  const payload = await readJson(fetchImpl, url);
  return daysWithFestivals(payload);
}

export async function fetchCalendarDay(year, month, day, fetchImpl = fetch, offset = PAGE_SIZE) {
  const items = [];
  let page = 0;
  let total = Infinity;
  while (items.length < total && page < 20) {
    const url = `${KFES_CALENDAR_LIST}?year=${year}&month=${month}&day=${day}&page=${page}&offset=${offset}`;
    const payload = await readJson(fetchImpl, url);
    const list = payload && payload.dataList ? payload.dataList : {};
    total = Number(list.total) || 0;
    const batch = Array.isArray(list.items) ? list.items : [];
    items.push(...batch);
    if (!batch.length || items.length >= total) break;
    page += 1;
  }
  return items;
}

export async function crawlVisitkoreaCalendar(input = {}, fetchImpl = fetch) {
  const now = new Date();
  const year = Number(input.year) || now.getFullYear();
  const metros = [...new Set((input.metros || []).map((item) => normalizeMetroId(item)).filter(Boolean))];
  const wanted = new Set(metros);
  let months = Array.isArray(input.months)
    ? input.months.map(Number).filter((month) => month >= 1 && month <= 12)
    : [];
  if (input.date) {
    const stamp = String(input.date).replace(/\D/g, '');
    if (stamp.length === 8) {
      months = [Number(stamp.slice(4, 6))];
    }
  }
  if (!months.length) months = [now.getMonth() + 1];
  months = [...new Set(months)].sort((a, b) => a - b).slice(0, input.maxMonths || 6);

  const seen = new Set();
  const festivals = [];
  const days = [];
  const singleDay = input.date ? Number(String(input.date).replace(/\D/g, '').slice(6, 8)) : 0;

  for (const month of months) {
    const activeDays = singleDay
      ? [singleDay]
      : await fetchCalendarDays(year, month, fetchImpl);
    for (const day of activeDays) {
      days.push({ year, month, day });
      const rows = await fetchCalendarDay(year, month, day, fetchImpl);
      rows.forEach((row) => {
        const mapped = toKfesFestival(row);
        if (!mapped || seen.has(mapped.kfesId)) return;
        if (wanted.size && !wanted.has(mapped.metro)) return;
        seen.add(mapped.kfesId);
        festivals.push(mapped);
      });
    }
  }

  const byMetro = new Map();
  festivals.forEach((item) => {
    const prev = byMetro.get(item.metro) || [];
    prev.push(item);
    byMetro.set(item.metro, prev);
  });

  return {
    ok: true,
    source: 'visitkorea',
    year,
    months,
    days: days.length,
    fetched: festivals.length,
    festivals,
    byMetro,
    message: `구석구석 달력 ${year}년 ${months.join(',')}월 ${festivals.length}건`,
  };
}
