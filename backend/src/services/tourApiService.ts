import { TtlCache, TWELVE_HOURS_MS, tourApiCache } from '../utils/ttlCache';

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

export const FESTIVAL_CATEGORIES = ['먹거리', '문화/예술', '가족', '계절축제', '플리마켓'] as const;
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
  mapX: number;
  mapY: number;
  tel?: string;
  category: FestivalCategory;
  overview?: string;
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
  if (/가족|어린이|키즈|유아|체험학습|어린이날/.test(hay)) return '가족';
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

function requireServiceKey(options: TourApiOptions): string {
  const serviceKey = options.serviceKey ?? process.env.TOUR_API_SERVICE_KEY ?? process.env.NTS_SERVICE_KEY;
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
    mapX: toCoord(item.mapx),
    mapY: toCoord(item.mapy),
    tel: text(item.tel) || undefined,
    category: classifyFestival(title, `${extra} ${item.overview ?? ''} ${item.cat3 ?? ''}`),
    overview: stripHtml(item.overview) || undefined,
  };
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
 * 경기(areaCode=31)는 법정동 광역코드 41로 조회한다.
 */
export async function searchFestivals(
  params: SearchFestivalsParams = {},
  options: TourApiOptions = {},
): Promise<TourFestival[]> {
  const now = new Date();
  const year = params.year ?? now.getFullYear();
  const month = params.month;
  const areaCode = params.areaCode ?? '31';
  const lDongRegnCd = resolveLDongRegnCd(areaCode, params.lDongRegnCd) ?? '41';
  const eventStartDate = params.eventStartDate
    ?? (month ? ymd(year, month, 1) : ymd(year, 1, 1));
  const eventEndDate = params.eventEndDate
    ?? (month ? ymd(year, month, lastDayOfMonth(year, month)) : undefined);

  const cacheKey = [
    'festivals',
    lDongRegnCd,
    eventStartDate,
    eventEndDate ?? '',
    params.category ?? '',
    String(params.numOfRows ?? 100),
  ].join(':');

  return cacheOf(options).wrap(cacheKey, async () => {
    const items = await tourGet<FestivalItem>('/searchFestival2', {
      // 경기(31)는 구 areaCode보다 법정동 코드(41) 조회가 훨씬 풍부하다.
      areaCode: AREA_TO_LDONG[areaCode] ? undefined : areaCode,
      lDongRegnCd,
      eventStartDate,
      eventEndDate,
      numOfRows: params.numOfRows ?? 100,
      pageNo: 1,
      arrange: 'C',
    }, options);

    let festivals = items.map((item) => toFestival(item)).filter((item): item is TourFestival => item != null);

    if (month) {
      festivals = festivals.filter((item) =>
        overlapsMonth(item.eventStartDate, item.eventEndDate, year, month),
      );
    }

    if (params.category && FESTIVAL_CATEGORIES.includes(params.category as FestivalCategory)) {
      festivals = festivals.filter((item) => item.category === params.category);
    }

    return festivals;
  }, ttlOf(options));
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

  return cacheOf(options).wrap(cacheKey, async () => {
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

  const cacheKey = `detail:${id}:${contentTypeId ?? ''}`;
  return cacheOf(options).wrap(cacheKey, async () => {
    const [commonItems, imageItems] = await Promise.all([
      // TourAPI 4.3: detailCommon2는 contentId만 사용. 구 YN 플래그는 오류/빈 응답을 낸다.
      tourGet<CommonItem>('/detailCommon2', { contentId: id }, options),
      tourGet<ImageItem>('/detailImage2', {
        contentId: id,
        imageYN: 'Y',
        numOfRows: 20,
      }, options),
    ]);

    const common = commonItems[0];
    if (!common) {
      throw new TourApiError('해당 관광 정보를 찾을 수 없습니다.', 404);
    }

    const typeId = text(contentTypeId) || text(common.contenttypeid) || CONTENT_TYPE.FESTIVAL;
    let intro: IntroItem | undefined;
    try {
      const introItems = await tourGet<IntroItem>('/detailIntro2', {
        contentId: id,
        contentTypeId: typeId,
      }, options);
      intro = introItems[0];
    } catch {
      intro = undefined;
    }

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
      title,
      overview: stripHtml(common.overview) || undefined,
      address: [text(common.addr1), text(common.addr2)].filter(Boolean).join(' '),
      tel,
      homepage: stripHtml(common.homepage) || undefined,
      firstImage,
      mapX: toCoord(common.mapx),
      mapY: toCoord(common.mapy),
      eventStartDate: formatYmd(intro?.eventstartdate) || undefined,
      eventEndDate: formatYmd(intro?.eventenddate) || undefined,
      eventPlace: text(intro?.eventplace) || undefined,
      playtime: text(intro?.playtime) || text(intro?.usetime) || text(intro?.usetimeculture) || text(intro?.opentimefood) || undefined,
      fee: text(intro?.usetimefestival) || undefined,
      images,
      category: typeId === CONTENT_TYPE.FESTIVAL ? classifyFestival(title, extra) : undefined,
    };
  }, ttlOf(options));
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
  };
}
