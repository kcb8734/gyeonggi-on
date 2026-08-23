import { TtlCache, TWELVE_HOURS_MS, tourApiCache } from '../utils/ttlCache';
import { getFestivalOverride, listFestivalOverrides, type AdminFestivalOverride } from './festivalOverrideStore';
import { filterFallbackFestivals, findFallbackFestival } from './tourFallback';

/** KorService1은 폐기됨. TourAPI 4.0은 KorService2 엔드포인트를 사용한다. */
export const DEFAULT_TOUR_API_BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

export const CONTENT_TYPE = {
  ATTRACTION: '12',
  CULTURE: '14',
  FESTIVAL: '15',
  COURSE: '25',
  LEPORTS: '28',
  STAY: '32',
  SHOPPING: '38',
  FOOD: '39',
} as const;

export const NEARBY_CONTENT_TYPES = new Set<string>([
  CONTENT_TYPE.ATTRACTION,
  CONTENT_TYPE.CULTURE,
  CONTENT_TYPE.FESTIVAL,
  CONTENT_TYPE.SHOPPING,
  CONTENT_TYPE.FOOD,
]);

/** 구 지역코드 → 법정동 광역코드. 경기(31)는 lDongRegnCd=41이 결과 수가 많다. */
export const AREA_TO_LDONG: Record<string, string> = {
  '1': '11',
  '31': '41',
  '32': '51',
};

export const FESTIVAL_CATEGORIES = ['먹거리', '체험', '공연', '문화/예술', '가족', '계절축제', '플리마켓'] as const;
export type FestivalCategory = (typeof FESTIVAL_CATEGORIES)[number];

export class TourApiError extends Error {
  constructor(
    message: string,
    readonly statusCode = 502,
  ) {
    super(message);
    this.name = 'TourApiError';
  }
}

export interface TourApiOptions {
  serviceKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  cache?: TtlCache;
  ttlMs?: number;
  timeoutMs?: number;
  mobileApp?: string;
}

export interface SearchFestivalsParams {
  areaCode?: string;
  lDongRegnCd?: string;
  month?: number;
  year?: number;
  category?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  numOfRows?: number;
  /** 목록 상위 N건에 detailCommon2 + detailIntro2를 붙인다. 기본 20. */
  enrichLimit?: number;
}

export interface NearbyParams {
  mapX: number;
  mapY: number;
  radius?: number;
  contentTypeId?: string;
  numOfRows?: number;
}

export interface TourFestival {
  contentId: string;
  contentTypeId: string;
  title: string;
  address: string;
  eventStartDate: string;
  eventEndDate: string;
  firstImage?: string;
  firstImage2?: string;
  mapX: number;
  mapY: number;
  tel?: string;
  category: FestivalCategory;
  overview?: string;
  fee?: string;
  eventPlace?: string;
}

export interface TourPlace {
  contentId: string;
  contentTypeId: string;
  title: string;
  address: string;
  firstImage?: string;
  mapX: number;
  mapY: number;
  tel?: string;
  distanceMeters?: number;
  kind: TourPlaceKind;
}

export type TourPlaceKind = 'festival' | 'attraction' | 'food' | 'culture' | 'shopping' | 'stay' | 'other';

export interface TourImage {
  originUrl: string;
  smallUrl?: string;
  name?: string;
}

export interface TourDetail {
  contentId: string;
  contentTypeId: string;
  title: string;
  overview?: string;
  address: string;
  tel?: string;
  homepage?: string;
  firstImage?: string;
  mapX: number;
  mapY: number;
  eventStartDate?: string;
  eventEndDate?: string;
  eventPlace?: string;
  playtime?: string;
  fee?: string;
  images: TourImage[];
  category?: FestivalCategory;
}

interface TourEnvelope<T> {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: T | T[] } | string;
      numOfRows?: number;
      pageNo?: number;
      totalCount?: number;
    };
  };
}

interface FestivalItem {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  eventstartdate?: string;
  eventenddate?: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string | number;
  mapy?: string | number;
  tel?: string;
  cat2?: string;
  cat3?: string;
  overview?: string;
}

interface NearbyItem {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  firstimage?: string;
  mapx?: string | number;
  mapy?: string | number;
  tel?: string;
  dist?: string | number;
}

interface CommonItem extends FestivalItem {
  homepage?: string;
  zipcode?: string;
}

interface IntroItem {
  usefee?: string;
  usetimefestival?: string;
  playtime?: string;
  eventplace?: string;
  eventstartdate?: string;
  eventenddate?: string;
  sponsor1tel?: string;
  program?: string;
  subevent?: string;
  infocenter?: string;
  infocenterculture?: string;
  infocenterfood?: string;
  usetime?: string;
  usetimeculture?: string;
  opentimefood?: string;
  firstmenu?: string;
}

interface ImageItem {
  originimgurl?: string;
  smallimageurl?: string;
  imgname?: string;
}

function asList<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function toCoord(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function ymd(year: number, month: number, day: number): string {
  return `${year}${pad2(month)}${pad2(day)}`;
}

export function formatYmd(raw?: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length !== 8) return '';
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function overlapsMonth(startYmd: string, endYmd: string, year: number, month: number): boolean {
  const start = startYmd.replace(/\D/g, '');
  const end = (endYmd || startYmd).replace(/\D/g, '');
  if (start.length !== 8) return false;
  const monthStart = ymd(year, month, 1);
  const monthEnd = ymd(year, month, lastDayOfMonth(year, month));
  return start <= monthEnd && (end || start) >= monthStart;
}

export function secureImageUrl(url?: string): string | undefined {
  const value = text(url);
  if (!value) return undefined;
  return value.replace(/^http:\/\//i, 'https://');
}

export function classifyFestival(title: string, extra = ''): FestivalCategory {
  const hay = `${title} ${extra}`;
  if (/플리|마켓|장터|야시장|프리마켓/.test(hay)) return '플리마켓';
  if (/먹거리|음식|맛집|푸드|한우|막걸리|치킨|분식|야식/.test(hay)) return '먹거리';
  if (/공연|콘서트|뮤지컬|버스킹/.test(hay)) return '공연';
  if (/가족|어린이|키즈|유아|체험학습|어린이날/.test(hay)) return '가족';
  if (/체험|원데이|클래스|만들기/.test(hay)) return '체험';
  if (/봄|여름|가을|겨울|벚꽃|연꽃|단풍|눈꽃|해바라기|억새|계절/.test(hay)) return '계절축제';
  return '문화/예술';
}

export function placeKind(contentTypeId: string): TourPlaceKind {
  switch (String(contentTypeId)) {
    case CONTENT_TYPE.FESTIVAL:
      return 'festival';
    case CONTENT_TYPE.ATTRACTION:
      return 'attraction';
    case CONTENT_TYPE.FOOD:
      return 'food';
    case CONTENT_TYPE.CULTURE:
      return 'culture';
    case CONTENT_TYPE.SHOPPING:
      return 'shopping';
    case CONTENT_TYPE.STAY:
      return 'stay';
    default:
      return 'other';
  }
}

export function resolveLDongRegnCd(areaCode?: string, lDongRegnCd?: string): string | undefined {
  if (lDongRegnCd) return String(lDongRegnCd);
  if (!areaCode) return undefined;
  return AREA_TO_LDONG[String(areaCode)] ?? undefined;
}

function stripHtml(value?: string): string {
  return text(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

function resolveServiceKey(options: TourApiOptions): string | undefined {
  const serviceKey = options.serviceKey ?? process.env.TOUR_API_SERVICE_KEY ?? process.env.NTS_SERVICE_KEY;
  const trimmed = text(serviceKey);
  return trimmed || undefined;
}

function requireServiceKey(options: TourApiOptions): string {
  const serviceKey = resolveServiceKey(options);
  if (!serviceKey) {
    throw new TourApiError('한국관광공사 API 인증키(TOUR_API_SERVICE_KEY)가 설정되지 않았습니다.', 500);
  }
  return serviceKey;
}

function cacheOf(options: TourApiOptions): TtlCache {
  return options.cache ?? tourApiCache;
}

function ttlOf(options: TourApiOptions): number {
  return options.ttlMs ?? (Number(process.env.TOUR_API_CACHE_TTL_MS) || TWELVE_HOURS_MS);
}

async function tourGet<T>(
  path: string,
  query: Record<string, string | number | undefined>,
  options: TourApiOptions,
): Promise<T[]> {
  const serviceKey = requireServiceKey(options);
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = (options.baseUrl ?? process.env.TOUR_API_BASE_URL ?? DEFAULT_TOUR_API_BASE_URL).replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? 10000;
  const params = new URLSearchParams();
  params.set('serviceKey', serviceKey);
  params.set('MobileOS', 'ETC');
  params.set('MobileApp', options.mobileApp ?? 'GyeonggiOn');
  params.set('_type', 'json');
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '') continue;
    params.set(key, String(value));
  }

  const url = `${baseUrl}${path}?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new TourApiError('한국관광공사 API 요청이 시간 초과되었습니다.');
    }
    throw new TourApiError('한국관광공사 API에 연결하지 못했습니다.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new TourApiError(`한국관광공사 API가 실패했습니다. (HTTP ${response.status})`);
  }

  let payload: TourEnvelope<T>;
  try {
    payload = (await response.json()) as TourEnvelope<T>;
  } catch {
    throw new TourApiError('한국관광공사 응답을 해석하지 못했습니다.');
  }

  const code = payload.response?.header?.resultCode;
  if (code && code !== '0000') {
    throw new TourApiError(`한국관광공사 API 오류: ${payload.response?.header?.resultMsg ?? code}`);
  }

  const items = payload.response?.body?.items;
  if (!items || typeof items === 'string') return [];
  return asList(items.item);
}

function toFestival(item: FestivalItem, extra = ''): TourFestival | null {
  const contentId = text(item.contentid);
  const title = text(item.title);
  if (!contentId || !title) return null;
  const start = text(item.eventstartdate);
  const end = text(item.eventenddate) || start;
  return {
    contentId,
    contentTypeId: text(item.contenttypeid) || CONTENT_TYPE.FESTIVAL,
    title,
    address: [text(item.addr1), text(item.addr2)].filter(Boolean).join(' '),
    eventStartDate: formatYmd(start) || start,
    eventEndDate: formatYmd(end) || end,
    firstImage: secureImageUrl(item.firstimage) ?? secureImageUrl(item.firstimage2),
    firstImage2: secureImageUrl(item.firstimage2),
    mapX: toCoord(item.mapx),
    mapY: toCoord(item.mapy),
    tel: text(item.tel) || undefined,
    category: classifyFestival(title, `${extra} ${item.overview ?? ''} ${item.cat3 ?? ''}`),
    overview: stripHtml(item.overview) || undefined,
  };
}

function resolveFee(intro?: IntroItem): string | undefined {
  return text(intro?.usefee) || text(intro?.usetimefestival) || undefined;
}

function overrideToFestival(item: AdminFestivalOverride): TourFestival {
  return {
    contentId: item.contentId,
    contentTypeId: item.contentTypeId || CONTENT_TYPE.FESTIVAL,
    title: item.title,
    address: item.address,
    eventStartDate: item.eventStartDate ?? '',
    eventEndDate: item.eventEndDate ?? item.eventStartDate ?? '',
    firstImage: item.firstImage,
    firstImage2: item.firstImage2,
    mapX: item.mapX,
    mapY: item.mapY,
    tel: item.tel,
    category: (FESTIVAL_CATEGORIES.includes(item.category as FestivalCategory)
      ? item.category
      : classifyFestival(item.title, item.overview ?? '')) as FestivalCategory,
    overview: item.overview,
    fee: item.fee,
    eventPlace: item.eventPlace,
  };
}

function mergeFestival(base: TourFestival, patch?: Partial<TourFestival> | AdminFestivalOverride | null): TourFestival {
  if (!patch) return base;
  return {
    ...base,
    title: text(patch.title) || base.title,
    address: text('address' in patch ? patch.address : '') || base.address,
    eventStartDate: text('eventStartDate' in patch ? patch.eventStartDate : '') || base.eventStartDate,
    eventEndDate: text('eventEndDate' in patch ? patch.eventEndDate : '') || base.eventEndDate,
    firstImage: ('firstImage' in patch ? patch.firstImage : undefined) || base.firstImage,
    firstImage2: ('firstImage2' in patch ? patch.firstImage2 : undefined) || base.firstImage2,
    mapX: 'mapX' in patch && patch.mapX ? Number(patch.mapX) : base.mapX,
    mapY: 'mapY' in patch && patch.mapY ? Number(patch.mapY) : base.mapY,
    tel: ('tel' in patch ? patch.tel : undefined) || base.tel,
    overview: ('overview' in patch ? patch.overview : undefined) || base.overview,
    fee: ('fee' in patch ? patch.fee : undefined) || base.fee,
    eventPlace: ('eventPlace' in patch ? patch.eventPlace : undefined) || base.eventPlace,
    category: (FESTIVAL_CATEGORIES.includes((patch as TourFestival).category)
      ? (patch as TourFestival).category
      : base.category),
  };
}

function mergeWithOverrides(list: TourFestival[]): TourFestival[] {
  const byId = new Map(list.map((item) => [item.contentId, item]));
  for (const override of listFestivalOverrides()) {
    const current = byId.get(override.contentId);
    byId.set(override.contentId, current ? mergeFestival(current, override) : overrideToFestival(override));
  }
  return [...byId.values()];
}

function fallbackFestivals(params: SearchFestivalsParams): TourFestival[] {
  return mergeWithOverrides(filterFallbackFestivals(params).map((item) => ({
    ...item,
    contentTypeId: item.contentTypeId || CONTENT_TYPE.FESTIVAL,
  })));
}

function fallbackDetail(contentId: string, override?: AdminFestivalOverride): TourDetail {
  const base = findFallbackFestival(contentId);
  const title = override?.title || base.title;
  const firstImage = override?.firstImage || base.firstImage;
  return {
    contentId: override?.contentId || contentId || base.contentId,
    contentTypeId: override?.contentTypeId || base.contentTypeId,
    title,
    overview: override?.overview || base.overview || `${title} 상세 정보입니다.`,
    address: override?.address || base.address || '주소 확인 중',
    tel: override?.tel || base.tel,
    homepage: override?.homepage,
    firstImage,
    mapX: override?.mapX || base.mapX,
    mapY: override?.mapY || base.mapY,
    eventStartDate: override?.eventStartDate || base.eventStartDate,
    eventEndDate: override?.eventEndDate || base.eventEndDate,
    eventPlace: override?.eventPlace || base.eventPlace,
    playtime: override?.playtime,
    fee: override?.fee || base.fee || '현장 문의',
    images: firstImage ? [{ originUrl: firstImage }] : [],
    category: (override?.category as FestivalCategory) || base.category,
  };
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(limit, 1), items.length || 1) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * 목록 contentId로 detailCommon2 + detailIntro2를 필수 호출해 상세 필드를 채운다.
 */
export async function enrichFestivalDetails(
  festivals: TourFestival[],
  options: TourApiOptions = {},
  limit = 20,
): Promise<TourFestival[]> {
  const target = festivals.slice(0, Math.max(0, limit));
  const rest = festivals.slice(target.length);
  if (!target.length || !resolveServiceKey(options)) return festivals;

  const enriched = await mapPool(target, 6, async (item) => {
    try {
      const [commonItems, introItems] = await Promise.all([
        tourGet<CommonItem>('/detailCommon2', { contentId: item.contentId }, options),
        tourGet<IntroItem>('/detailIntro2', {
          contentId: item.contentId,
          contentTypeId: item.contentTypeId || CONTENT_TYPE.FESTIVAL,
        }, options),
      ]);
      const common = commonItems[0];
      const intro = introItems[0];
      const overview = stripHtml(common?.overview) || item.overview;
      return mergeFestival(item, {
        title: text(common?.title) || item.title,
        address: [text(common?.addr1), text(common?.addr2)].filter(Boolean).join(' ') || item.address,
        firstImage: secureImageUrl(common?.firstimage) ?? secureImageUrl(common?.firstimage2) ?? item.firstImage,
        firstImage2: secureImageUrl(common?.firstimage2) ?? item.firstImage2,
        tel: text(common?.tel) || text(intro?.sponsor1tel) || item.tel,
        overview,
        mapX: common?.mapx != null ? toCoord(common.mapx) : item.mapX,
        mapY: common?.mapy != null ? toCoord(common.mapy) : item.mapY,
        eventStartDate: formatYmd(intro?.eventstartdate) || item.eventStartDate,
        eventEndDate: formatYmd(intro?.eventenddate) || item.eventEndDate,
        fee: resolveFee(intro) || item.fee,
        eventPlace: text(intro?.eventplace) || item.eventPlace,
        category: classifyFestival(text(common?.title) || item.title, `${overview ?? ''} ${intro?.program ?? ''}`),
      });
    } catch {
      return item;
    }
  });

  return [...enriched, ...rest];
}

function toPlace(item: NearbyItem): TourPlace | null {
  const contentId = text(item.contentid);
  const title = text(item.title);
  if (!contentId || !title) return null;
  const contentTypeId = text(item.contenttypeid);
  const dist = Number(item.dist);
  return {
    contentId,
    contentTypeId,
    title,
    address: text(item.addr1),
    firstImage: secureImageUrl(item.firstimage),
    mapX: toCoord(item.mapx),
    mapY: toCoord(item.mapy),
    tel: text(item.tel) || undefined,
    distanceMeters: Number.isFinite(dist) ? dist : undefined,
    kind: placeKind(contentTypeId),
  };
}

/**
 * GET /searchFestival2
 * contentTypeId=15(행사/축제/공연). areaCode가 없거나 all이면 전국 조회.
 * 경기(areaCode=31)는 법정동 광역코드 41로 조회한다.
 */
export async function searchFestivals(
  params: SearchFestivalsParams = {},
  options: TourApiOptions = {},
): Promise<TourFestival[]> {
  const now = new Date();
  const year = params.year ?? now.getFullYear();
  const month = params.month;
  const rawArea = params.areaCode ?? 'all';
  const nationwide = !rawArea || rawArea === 'all';
  const areaCode = nationwide ? undefined : rawArea;
  const lDongRegnCd = nationwide
    ? params.lDongRegnCd
    : resolveLDongRegnCd(areaCode, params.lDongRegnCd) ?? (areaCode === '31' ? '41' : undefined);
  const eventStartDate = params.eventStartDate
    ?? (month ? ymd(year, month, 1) : ymd(year, 1, 1));
  const eventEndDate = params.eventEndDate
    ?? (month ? ymd(year, month, lastDayOfMonth(year, month)) : undefined);

  if (!resolveServiceKey(options)) {
    return fallbackFestivals({ ...params, year, month });
  }

  const cacheKey = [
    'festivals',
    nationwide ? 'all' : (lDongRegnCd ?? areaCode ?? ''),
    eventStartDate,
    eventEndDate ?? '',
    params.category ?? '',
    String(params.numOfRows ?? 100),
    String(params.enrichLimit ?? 20),
  ].join(':');

  try {
    const festivals = await cacheOf(options).wrap(cacheKey, async () => {
      const items = await tourGet<FestivalItem>('/searchFestival2', {
        contentTypeId: CONTENT_TYPE.FESTIVAL,
        areaCode: areaCode && AREA_TO_LDONG[areaCode] ? undefined : areaCode,
        lDongRegnCd,
        eventStartDate,
        eventEndDate,
        numOfRows: params.numOfRows ?? 100,
        pageNo: 1,
        arrange: 'C',
      }, options);

      let next = items.map((item) => toFestival(item)).filter((item): item is TourFestival => item != null);

      if (month) {
        next = next.filter((item) =>
          overlapsMonth(item.eventStartDate, item.eventEndDate, year, month),
        );
      }

      if (params.category && FESTIVAL_CATEGORIES.includes(params.category as FestivalCategory)) {
        next = next.filter((item) => item.category === params.category);
      }

      return enrichFestivalDetails(next, options, params.enrichLimit ?? 20);
    }, ttlOf(options));

    const merged = mergeWithOverrides(festivals);
    return merged.length ? merged : fallbackFestivals({ ...params, year, month });
  } catch (err) {
    console.warn('[searchFestivals] fallback mock:', err instanceof Error ? err.message : err);
    return fallbackFestivals({ ...params, year, month });
  }
}

/**
 * GET /locationBasedList2
 * mapX=경도, mapY=위도, radius=미터.
 */
export async function searchNearby(
  params: NearbyParams,
  options: TourApiOptions = {},
): Promise<TourPlace[]> {
  const radius = Math.min(Math.max(params.radius ?? 3000, 100), 20000);
  const cacheKey = [
    'nearby',
    params.mapX.toFixed(5),
    params.mapY.toFixed(5),
    String(radius),
    params.contentTypeId ?? '',
    String(params.numOfRows ?? 120),
  ].join(':');

  if (!resolveServiceKey(options)) {
    return [
      {
        contentId: '1000001',
        contentTypeId: CONTENT_TYPE.FESTIVAL,
        title: '수원화성문화제',
        address: '경기도 수원시 팔달구',
        mapX: 127.013,
        mapY: 37.287,
        tel: '031-228-3675',
        kind: 'festival',
      },
    ];
  }

  try {
    return await cacheOf(options).wrap(cacheKey, async () => {
      const items = await tourGet<NearbyItem>('/locationBasedList2', {
        mapX: params.mapX,
        mapY: params.mapY,
        radius,
        arrange: 'E',
        numOfRows: params.numOfRows ?? 120,
        pageNo: 1,
        contentTypeId: params.contentTypeId,
      }, options);

      return items
        .map(toPlace)
        .filter((item): item is TourPlace => item != null)
        .filter((item) => (params.contentTypeId ? true : NEARBY_CONTENT_TYPES.has(item.contentTypeId)));
    }, ttlOf(options));
  } catch (err) {
    console.warn('[searchNearby] fallback mock:', err instanceof Error ? err.message : err);
    return [
      {
        contentId: '1000001',
        contentTypeId: CONTENT_TYPE.FESTIVAL,
        title: '수원화성문화제',
        address: '경기도 수원시 팔달구',
        mapX: params.mapX,
        mapY: params.mapY,
        tel: '031-228-3675',
        kind: 'festival',
      },
    ];
  }
}

/**
 * GET /detailCommon2 + /detailIntro2 + /detailImage2
 */
export async function getTourDetail(
  contentId: string,
  contentTypeId?: string,
  options: TourApiOptions = {},
): Promise<TourDetail> {
  const id = text(contentId);
  if (!id) {
    throw new TourApiError('콘텐츠 ID가 필요합니다.', 400);
  }

  const override = getFestivalOverride(id);
  if (!resolveServiceKey(options)) {
    return fallbackDetail(id, override);
  }

  const cacheKey = `detail:${id}:${contentTypeId ?? ''}`;
  try {
    const detail = await cacheOf(options).wrap(cacheKey, async () => {
      const typeHint = text(contentTypeId) || CONTENT_TYPE.FESTIVAL;
      const [commonItems, introItems, imageItems] = await Promise.all([
        // TourAPI 4.3: detailCommon2는 contentId만 사용. 구 YN 플래그는 오류/빈 응답을 낸다.
        tourGet<CommonItem>('/detailCommon2', { contentId: id }, options),
        tourGet<IntroItem>('/detailIntro2', {
          contentId: id,
          contentTypeId: typeHint,
        }, options).catch(() => [] as IntroItem[]),
        tourGet<ImageItem>('/detailImage2', {
          contentId: id,
          imageYN: 'Y',
          numOfRows: 20,
        }, options).catch(() => [] as ImageItem[]),
      ]);

      const common = commonItems[0];
      if (!common) {
        throw new TourApiError('해당 관광 정보를 찾을 수 없습니다.', 404);
      }

      const typeId = text(contentTypeId) || text(common.contenttypeid) || CONTENT_TYPE.FESTIVAL;
      const intro = introItems[0];
      const title = text(common.title);
      const extra = `${stripHtml(common.overview)} ${intro?.program ?? ''} ${intro?.subevent ?? ''}`;
      const firstImage = secureImageUrl(common.firstimage) ?? secureImageUrl(common.firstimage2);
      const images = imageItems
        .map((img) => ({
          originUrl: secureImageUrl(img.originimgurl) ?? '',
          smallUrl: secureImageUrl(img.smallimageurl),
          name: text(img.imgname) || undefined,
        }))
        .filter((img) => img.originUrl);

      if (firstImage && !images.some((img) => img.originUrl === firstImage)) {
        images.unshift({ originUrl: firstImage, smallUrl: undefined, name: undefined });
      }

      const tel = text(common.tel)
        || text(intro?.sponsor1tel)
        || text(intro?.infocenter)
        || text(intro?.infocenterculture)
        || text(intro?.infocenterfood)
        || undefined;

      return {
        contentId: text(common.contentid) || id,
        contentTypeId: typeId,
        title: title || '축제 상세',
        overview: stripHtml(common.overview) || `${title || '이 행사'}의 상세 개요입니다.`,
        address: [text(common.addr1), text(common.addr2)].filter(Boolean).join(' ') || '주소 확인 중',
        tel,
        homepage: stripHtml(common.homepage) || undefined,
        firstImage,
        mapX: toCoord(common.mapx),
        mapY: toCoord(common.mapy),
        eventStartDate: formatYmd(intro?.eventstartdate) || undefined,
        eventEndDate: formatYmd(intro?.eventenddate) || undefined,
        eventPlace: text(intro?.eventplace) || undefined,
        playtime: text(intro?.playtime) || text(intro?.usetime) || text(intro?.usetimeculture) || text(intro?.opentimefood) || undefined,
        fee: resolveFee(intro) || '현장 문의',
        images,
        category: typeId === CONTENT_TYPE.FESTIVAL ? classifyFestival(title, extra) : undefined,
      };
    }, ttlOf(options));

    if (!override) return detail;
    return {
      ...detail,
      title: override.title || detail.title,
      overview: override.overview || detail.overview,
      address: override.address || detail.address,
      tel: override.tel || detail.tel,
      homepage: override.homepage || detail.homepage,
      firstImage: override.firstImage || detail.firstImage,
      mapX: override.mapX || detail.mapX,
      mapY: override.mapY || detail.mapY,
      eventStartDate: override.eventStartDate || detail.eventStartDate,
      eventEndDate: override.eventEndDate || detail.eventEndDate,
      eventPlace: override.eventPlace || detail.eventPlace,
      playtime: override.playtime || detail.playtime,
      fee: override.fee || detail.fee,
    };
  } catch (err) {
    console.warn('[getTourDetail] fallback mock:', err instanceof Error ? err.message : err);
    return fallbackDetail(id, override);
  }
}

export function toHomeFestival(festival: TourFestival) {
  return {
    id: `tour-${festival.contentId}`,
    contentId: festival.contentId,
    contentTypeId: festival.contentTypeId,
    title: festival.title,
    location_name: festival.address,
    latitude: festival.mapY,
    longitude: festival.mapX,
    start_date: festival.eventStartDate,
    end_date: festival.eventEndDate,
    municipality_name: festival.address.split(' ')[1] ?? null,
    description: festival.overview ?? null,
    category: festival.category,
    image_url: festival.firstImage ?? null,
    is_trending: Boolean(festival.firstImage),
    source: 'tour' as const,
    tel: festival.tel,
    fee: festival.fee,
  };
}
