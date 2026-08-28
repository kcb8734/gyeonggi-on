import { AREA_CODE_BY_METRO, MOI_CODE_BY_METRO, REGION_LABEL, REGION_META, normalizeMetroId } from './metroLocalities.js';

export const KOR_SERVICE2 = 'https://apis.data.go.kr/B551011/KorService2';

const CONTENT_FESTIVAL = '15';
const NEARBY_TYPES = new Set(['12', '14', '15', '38', '39']);

export function classifyFestival(title, extra = '') {
  const hay = String(title || '') + ' ' + extra;
  if (/플리|마켓|장터|야시장|프리마켓/.test(hay)) return '플리마켓';
  if (/먹거리|음식|맛집|푸드|한우|막걸리|치킨|분식|야식/.test(hay)) return '먹거리';
  if (/공연|콘서트|뮤지컬|버스킹/.test(hay)) return '공연';
  if (/가족|어린이|키즈|유아|체험학습|어린이날/.test(hay)) return '가족';
  if (/체험|원데이|클래스|만들기/.test(hay)) return '체험';
  if (/봄|여름|가을|겨울|벚꽃|연꽃|단풍|눈꽃|해바라기|억새|계절/.test(hay)) return '계절축제';
  return '문화/예술';
}

export function placeKind(contentTypeId) {
  switch (String(contentTypeId)) {
    case '15': return 'festival';
    case '12': return 'attraction';
    case '39': return 'food';
    case '14': return 'culture';
    case '38': return 'shopping';
    case '32': return 'stay';
    default: return 'other';
  }
}

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function ymd(year, month, day) {
  return String(year) + pad2(month) + pad2(day);
}

export function formatYmd(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 8) return '';
  return digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8);
}

export function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function tourServiceKey() {
  return String(process.env.TOUR_API_SERVICE_KEY || process.env.NTS_SERVICE_KEY || '').trim();
}

function metroForArea(areaCode, fallback) {
  const tour = Object.entries(AREA_CODE_BY_METRO).find(([, code]) => code === areaCode);
  if (tour) return tour[0];
  const moi = Object.entries(MOI_CODE_BY_METRO).find(([, code]) => code === areaCode);
  if (moi) return moi[0];
  return fallback || 'GYEONGGI';
}

export function resolveFestivalQuery(input = {}) {
  const now = new Date();
  const year = Number(input.year) || now.getFullYear();
  const month = input.month != null && input.month !== '' ? Number(input.month) : undefined;
  const metroKey = normalizeMetroId(input.metro);
  const rawArea = String(input.areaCode || (input.metro ? AREA_CODE_BY_METRO[metroKey] : '') || '').trim();
  const nationwide = !rawArea || rawArea === 'all';
  const areaCode = nationwide ? undefined : rawArea;
  const regionalZone = nationwide ? (metroKey || 'GYEONGGI') : metroForArea(areaCode, metroKey);
  const lDongRegnCd = nationwide ? undefined : (MOI_CODE_BY_METRO[regionalZone] || areaCode);
  const eventStartDate = month ? ymd(year, month, 1) : ymd(year, 1, 1);
  const lastDay = month ? new Date(year, month, 0).getDate() : undefined;
  const eventEndDate = month ? ymd(year, month, lastDay) : undefined;
  const params = {
    serviceKey: 'KEY',
    MobileOS: 'ETC',
    MobileApp: 'kdanji',
    _type: 'json',
    numOfRows: String(input.numOfRows || 80),
    pageNo: '1',
    arrange: 'C',
    eventStartDate: eventStartDate,
    contentTypeId: '15',
  };
  if (eventEndDate) params.eventEndDate = eventEndDate;
  if (lDongRegnCd) params.lDongRegnCd = lDongRegnCd;
  else if (areaCode) params.areaCode = areaCode;
  return {
    nationwide: nationwide,
    metro: regionalZone,
    areaCode: areaCode || AREA_CODE_BY_METRO[regionalZone] || '31',
    lDongRegnCd: lDongRegnCd || MOI_CODE_BY_METRO[regionalZone] || '41',
    regionLabel: REGION_LABEL[regionalZone] || '경기온',
    year: year,
    month: month || null,
    path: '/searchFestival2',
    baseUrl: KOR_SERVICE2,
    params: params,
  };
}

function text(value) {
  return String(value || '').trim();
}

function secureImage(value) {
  const raw = text(value);
  if (!raw) return '';
  return raw.replace(/^http:\/\//i, 'https://');
}

function toCoord(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function stripHtml(value) {
  return text(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export function toTourFestival(item) {
  const contentId = text(item.contentid || item.contentId);
  const title = text(item.title);
  if (!contentId || !title) return null;
  const start = formatYmd(item.eventstartdate || item.eventStartDate);
  const end = formatYmd(item.eventenddate || item.eventEndDate) || start;
  return {
    contentId: contentId,
    contentTypeId: text(item.contenttypeid || item.contentTypeId) || CONTENT_FESTIVAL,
    title: title,
    address: [item.addr1, item.addr2].filter(Boolean).join(' '),
    eventStartDate: start,
    eventEndDate: end,
    firstImage: secureImage(item.firstimage || item.firstimage2) || undefined,
    firstImage2: secureImage(item.firstimage2) || undefined,
    mapX: toCoord(item.mapx),
    mapY: toCoord(item.mapy),
    tel: text(item.tel) || undefined,
    category: classifyFestival(title, item.overview || ''),
    overview: stripHtml(item.overview) || undefined,
    areaCode: text(item.areacode) || undefined,
  };
}

export function toHomeFestival(item, metro, areaCode) {
  const tour = toTourFestival(item);
  if (!tour) return null;
  const resolvedArea = tour.areaCode || areaCode || '31';
  return {
    id: 'tour-' + tour.contentId,
    contentId: tour.contentId,
    contentTypeId: tour.contentTypeId,
    title: tour.title,
    location_name: tour.address,
    latitude: tour.mapY,
    longitude: tour.mapX,
    start_date: tour.eventStartDate,
    end_date: tour.eventEndDate,
    municipality_name: String(tour.address || '').split(' ')[1] || null,
    description: tour.overview || null,
    category: tour.category,
    image_url: tour.firstImage || null,
    is_trending: Boolean(tour.firstImage),
    source: 'tour',
    tel: tour.tel,
    regionalZone: metro,
    metro: metro,
    areaCode: resolvedArea,
    moiCode: MOI_CODE_BY_METRO[metro] || '41',
  };
}

export function toPlace(item) {
  const contentId = text(item.contentid);
  const title = text(item.title);
  if (!contentId || !title) return null;
  const contentTypeId = text(item.contenttypeid);
  const dist = Number(item.dist);
  return {
    contentId: contentId,
    contentTypeId: contentTypeId,
    title: title,
    address: text(item.addr1),
    firstImage: secureImage(item.firstimage) || undefined,
    mapX: toCoord(item.mapx),
    mapY: toCoord(item.mapy),
    tel: text(item.tel) || undefined,
    distanceMeters: Number.isFinite(dist) ? dist : undefined,
    kind: placeKind(contentTypeId),
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const LAST_OK_FESTIVALS = new Map();

function festivalCacheKey(resolved) {
  return [resolved.metro || '', resolved.areaCode || '', resolved.month || '', resolved.year || ''].join(':');
}

function builtinFestivals(resolved) {
  const metro = resolved.metro || 'GYEONGGI';
  if (metro !== 'GYEONGGI' && resolved.areaCode !== '31') return [];
  return [
    { contentId: 'suwon-hwaseong', contentTypeId: '15', title: '수원화성문화제', address: '경기도 수원시 팔달구 정조로 825', eventStartDate: '2026-08-19', eventEndDate: '2026-09-21', firstImage: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=800&q=80', mapX: 127.013, mapY: 37.287, tel: '031-228-3675', category: '문화/예술', overview: '세계유산 수원화성을 무대로 펼쳐지는 야간 퍼레이드와 전통 공연', areaCode: '31' },
    { contentId: 'yongin-folk', contentTypeId: '15', title: '용인 한국민속촌 축제', address: '경기도 용인시 기흥구 민속촌로 90', eventStartDate: '2026-08-21', eventEndDate: '2026-09-11', firstImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80', mapX: 127.117, mapY: 37.259, tel: '031-288-0000', category: '가족', overview: '전통 가옥과 장터 체험이 이어지는 용인 대표 가족 축제', areaCode: '31' },
    { contentId: 'gapyeong-jazz', contentTypeId: '15', title: '가평 자라섬 재즈페스티벌', address: '경기도 가평군 가평읍 자라섬로 60', eventStartDate: '2026-08-22', eventEndDate: '2026-09-05', firstImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', mapX: 127.513, mapY: 37.823, tel: '031-582-0174', category: '계절축제', overview: '북한강 위 자라섬에서 열리는 국내 대표 재즈 페스티벌', areaCode: '31' },
    { contentId: 'suwon-yeongdong', contentTypeId: '15', title: '수원 영동시장 먹거리 축제', address: '경기도 수원시 팔달구 수원천로 255', eventStartDate: '2026-08-20', eventEndDate: '2026-09-09', firstImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', mapX: 127.0168, mapY: 37.2762, tel: '031-241-1101', category: '먹거리', overview: '영동시장 골목 상인과 함께하는 먹거리 축제', areaCode: '31' },
    { contentId: 'yongin-flea', contentTypeId: '15', title: '용인 플리마켓 위크', address: '경기도 용인시 기흥구 구갈로 70', eventStartDate: '2026-08-22', eventEndDate: '2026-09-01', firstImage: 'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=800&q=80', mapX: 127.1148, mapY: 37.2755, tel: '031-324-2114', category: '플리마켓', overview: '빈티지·수공예 셀러가 모이는 용인 야외 플리마켓', areaCode: '31' },
  ];
}

async function tourGet(path, query, fetchImpl) {
  const key = tourServiceKey();
  if (!key) throw new Error('TOUR_API_SERVICE_KEY 가 없습니다.');
  const params = new URLSearchParams();
  params.set('serviceKey', key);
  params.set('MobileOS', 'ETC');
  params.set('MobileApp', 'kdanji');
  params.set('_type', 'json');
  Object.entries(query || {}).forEach(([name, value]) => {
    if (value == null || value === '') return;
    params.set(name, String(value));
  });
  const url = KOR_SERVICE2 + path + '?' + params.toString();
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await (fetchImpl || fetch)(url, { headers: { Accept: 'application/json' } });
    if (response.status === 429) {
      lastErr = new Error('TourAPI HTTP 429');
      if (attempt < 3 && !fetchImpl) await sleep(350 * attempt);
      else if (attempt < 3 && fetchImpl) break;
      continue;
    }
    if (!response.ok) throw new Error('TourAPI HTTP ' + response.status);
    const payload = await response.json();
    const code = payload && payload.response && payload.response.header && payload.response.header.resultCode;
    if (code && code !== '0000') {
      throw new Error(payload.response.header.resultMsg || code);
    }
    const items = payload && payload.response && payload.response.body && payload.response.body.items;
    if (!items || typeof items === 'string') return [];
    return asList(items.item);
  }
  throw lastErr || new Error('TourAPI HTTP 429');
}

export async function searchFestival2(input, fetchImpl) {
  const resolved = resolveFestivalQuery(input);
  const query = { ...resolved.params };
  delete query.serviceKey;
  delete query.MobileOS;
  delete query.MobileApp;
  delete query._type;
  const key = festivalCacheKey(resolved);
  try {
    const items = await tourGet(resolved.path, query, fetchImpl);
    if (!items.length && query.lDongRegnCd && resolved.areaCode) {
      const retry = { ...query };
      delete retry.lDongRegnCd;
      retry.areaCode = resolved.areaCode;
      items.splice(0, items.length, ...(await tourGet(resolved.path, retry, fetchImpl)));
    }
    let festivals = items.map(toTourFestival).filter(Boolean);
    if (resolved.month) {
      const start = ymd(resolved.year, resolved.month, 1);
      const end = resolved.params.eventEndDate;
      festivals = festivals.filter((item) => {
        const a = String(item.eventStartDate || '').replace(/\D/g, '');
        const b = String(item.eventEndDate || item.eventStartDate || '').replace(/\D/g, '');
        return a && b && a <= end && b >= start;
      });
    }
    if (input.category) {
      festivals = festivals.filter((item) => item.category === input.category);
    }
    if (festivals.length) {
      LAST_OK_FESTIVALS.set(key, festivals);
      return { ...resolved, festivals: festivals, source: 'searchFestival2' };
    }
    const cached = LAST_OK_FESTIVALS.get(key) || [];
    if (cached.length) return { ...resolved, festivals: cached, source: 'cache' };
    const fallback = builtinFestivals(resolved);
    return { ...resolved, festivals: fallback, source: fallback.length ? 'fallback' : 'none' };
  } catch (err) {
    const cached = LAST_OK_FESTIVALS.get(key) || [];
    if (cached.length) return { ...resolved, festivals: cached, source: 'cache' };
    const fallback = builtinFestivals(resolved);
    if (fallback.length) return { ...resolved, festivals: fallback, source: 'fallback' };
    throw err;
  }
}

export async function searchNearby2(params, fetchImpl) {
  const items = await tourGet('/locationBasedList2', {
    mapX: params.mapX,
    mapY: params.mapY,
    radius: params.radius || 3000,
    arrange: 'E',
    numOfRows: params.numOfRows || 120,
    pageNo: 1,
    contentTypeId: params.contentTypeId,
  }, fetchImpl);
  return items
    .map(toPlace)
    .filter(Boolean)
    .filter((item) => (params.contentTypeId ? true : NEARBY_TYPES.has(item.contentTypeId)));
}

export async function getTourDetail2(contentId, contentTypeId, fetchImpl) {
  const id = text(contentId);
  if (!id) throw new Error('콘텐츠 ID가 필요합니다.');
  const typeHint = text(contentTypeId) || CONTENT_FESTIVAL;
  const [commonItems, introItems, imageItems] = await Promise.all([
    tourGet('/detailCommon2', { contentId: id }, fetchImpl),
    tourGet('/detailIntro2', { contentId: id, contentTypeId: typeHint }, fetchImpl).catch(() => []),
    tourGet('/detailImage2', { contentId: id, imageYN: 'Y', numOfRows: 20 }, fetchImpl).catch(() => []),
  ]);
  const common = commonItems[0];
  if (!common) throw new Error('해당 관광 정보를 찾을 수 없습니다.');
  const intro = introItems[0] || {};
  const firstImage = secureImage(common.firstimage) || secureImage(common.firstimage2) || undefined;
  const images = imageItems
    .map((img) => ({
      originUrl: secureImage(img.originimgurl),
      smallUrl: secureImage(img.smallimageurl) || undefined,
      name: text(img.imgname) || undefined,
    }))
    .filter((img) => img.originUrl);
  if (firstImage && !images.some((img) => img.originUrl === firstImage)) {
    images.unshift({ originUrl: firstImage });
  }
  const title = text(common.title) || '축제 상세';
  return {
    contentId: text(common.contentid) || id,
    contentTypeId: text(contentTypeId) || text(common.contenttypeid) || CONTENT_FESTIVAL,
    title: title,
    overview: stripHtml(common.overview) || title + '의 상세 개요입니다.',
    address: [common.addr1, common.addr2].filter(Boolean).join(' ') || '주소 확인 중',
    tel: text(common.tel) || text(intro.sponsor1tel) || text(intro.infocenter) || undefined,
    homepage: stripHtml(common.homepage) || undefined,
    firstImage: firstImage,
    mapX: toCoord(common.mapx),
    mapY: toCoord(common.mapy),
    eventStartDate: formatYmd(intro.eventstartdate),
    eventEndDate: formatYmd(intro.eventenddate),
    eventPlace: text(intro.eventplace) || undefined,
    playtime: text(intro.playtime) || undefined,
    fee: text(intro.usefee) || text(intro.usetimefestival) || undefined,
    images: images,
    category: classifyFestival(title, common.overview || ''),
  };
}

export function metroRegions() {
  return Object.entries(REGION_META).map(([id, meta]) => ({
    id: id,
    label: meta.label,
    ready: true,
  }));
}
