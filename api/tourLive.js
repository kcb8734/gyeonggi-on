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
    numOfRows: String(input.numOfRows || 200),
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
  const source = text(item.source).toLowerCase();
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
    source: source === 'fallback' || source === 'sample' ? source : undefined,
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
    source: tour.source === 'fallback' || tour.source === 'sample' ? tour.source : 'tour',
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

const BUILTIN_BY_METRO = {
  GYEONGGI: [
    { contentId: 'suwon-hwaseong', contentTypeId: '15', title: '수원화성문화제', address: '경기도 수원시 팔달구 정조로 825', eventStartDate: '2026-08-19', eventEndDate: '2026-09-21', firstImage: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=800&q=80', mapX: 127.013, mapY: 37.287, tel: '031-228-3675', category: '문화/예술', overview: '세계유산 수원화성을 무대로 펼쳐지는 야간 퍼레이드와 전통 공연', areaCode: '31' },
    { contentId: 'yongin-folk', contentTypeId: '15', title: '용인 한국민속촌 축제', address: '경기도 용인시 기흥구 민속촌로 90', eventStartDate: '2026-08-21', eventEndDate: '2026-09-11', firstImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80', mapX: 127.117, mapY: 37.259, tel: '031-288-0000', category: '가족', overview: '전통 가옥과 장터 체험이 이어지는 용인 대표 가족 축제', areaCode: '31' },
    { contentId: 'gapyeong-jazz', contentTypeId: '15', title: '가평 자라섬 재즈페스티벌', address: '경기도 가평군 가평읍 자라섬로 60', eventStartDate: '2026-08-22', eventEndDate: '2026-09-05', firstImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', mapX: 127.513, mapY: 37.823, tel: '031-582-0174', category: '계절축제', overview: '북한강 위 자라섬에서 열리는 국내 대표 재즈 페스티벌', areaCode: '31' },
    { contentId: 'suwon-yeongdong', contentTypeId: '15', title: '수원 영동시장 먹거리 축제', address: '경기도 수원시 팔달구 수원천로 255', eventStartDate: '2026-08-20', eventEndDate: '2026-09-09', firstImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', mapX: 127.0168, mapY: 37.2762, tel: '031-241-1101', category: '먹거리', overview: '영동시장 골목 상인과 함께하는 먹거리 축제', areaCode: '31' },
    { contentId: 'yongin-flea', contentTypeId: '15', title: '용인 플리마켓 위크', address: '경기도 용인시 기흥구 구갈로 70', eventStartDate: '2026-08-22', eventEndDate: '2026-09-01', firstImage: 'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=800&q=80', mapX: 127.1148, mapY: 37.2755, tel: '031-324-2114', category: '플리마켓', overview: '빈티지·수공예 셀러가 모이는 용인 야외 플리마켓', areaCode: '31' },
    { contentId: 'paju-jangdan', contentTypeId: '15', title: '파주 장단콩축제', address: '경기도 파주시 임진각로 148-40', eventStartDate: '2026-11-14', eventEndDate: '2026-11-16', firstImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', mapX: 126.758, mapY: 37.889, tel: '031-940-8615', category: '먹거리', overview: '임진각에서 열리는 파주 대표 콩·한우 미식 축제', areaCode: '31' },
    { contentId: 'icheon-rice', contentTypeId: '15', title: '이천쌀문화축제', address: '경기도 이천시 경충대로 2697', eventStartDate: '2026-10-22', eventEndDate: '2026-10-26', firstImage: 'https://images.unsplash.com/photo-1516684738272-a1c3c2c0f4b0?w=800&q=80', mapX: 127.443, mapY: 37.272, tel: '031-644-4135', category: '가족', overview: '임금님표 이천쌀과 가마솥 밥 체험이 이어지는 수확 축제', areaCode: '31' },
    { contentId: 'ansan-street', contentTypeId: '15', title: '안산 국제거리극축제', address: '경기도 안산시 단원구 화랑로 250', eventStartDate: '2026-05-15', eventEndDate: '2026-05-18', firstImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80', mapX: 126.831, mapY: 37.321, tel: '031-481-3000', category: '공연', overview: '중앙역 일대에서 펼쳐지는 세계 거리극·서커스 축제', areaCode: '31' },
    { contentId: 'yangpyeong-lotus', contentTypeId: '15', title: '양평 세미원 연꽃문화제', address: '경기도 양평군 양서면 양수로 93', eventStartDate: '2026-08-01', eventEndDate: '2026-08-31', firstImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', mapX: 127.3705, mapY: 37.5411, tel: '031-775-1834', category: '계절축제', overview: '두물머리 세미원 연꽃과 야간 조명', areaCode: '31' },
    { contentId: 'goyang-flower', contentTypeId: '15', title: '고양국제꽃박람회', address: '경기도 고양시 일산서구 호수로 595', eventStartDate: '2026-04-24', eventEndDate: '2026-05-10', firstImage: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80', mapX: 126.767, mapY: 37.674, tel: '031-8072-8300', category: '가족', overview: '호수공원 일대 국제 꽃박람회', areaCode: '31' },
  ],
  SEOUL: [
    { contentId: 'seoul-street', contentTypeId: '15', title: '서울거리예술축제', address: '서울특별시 종로구 세종대로 175', eventStartDate: '2026-09-26', eventEndDate: '2026-10-04', firstImage: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80', mapX: 126.9769, mapY: 37.572, tel: '02-399-1000', category: '공연', overview: '광화문·청계천 일대 거리예술 공연', areaCode: '1' },
    { contentId: 'seoul-lantern', contentTypeId: '15', title: '서울빛초롱축제', address: '서울특별시 중구 청계천로', eventStartDate: '2026-12-12', eventEndDate: '2027-01-04', firstImage: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80', mapX: 126.9783, mapY: 37.5694, tel: '02-3780-0514', category: '계절축제', overview: '청계천을 중심으로 수놓는 서울 겨울 초롱 축제', areaCode: '1' },
    { contentId: 'seoul-rose', contentTypeId: '15', title: '중랑 서울장미축제', address: '서울특별시 중랑구 묵동', eventStartDate: '2026-05-16', eventEndDate: '2026-05-25', firstImage: 'https://images.unsplash.com/photo-1496065187959-7f07b8353c32?w=800&q=80', mapX: 127.093, mapY: 37.606, tel: '02-2094-0114', category: '가족', overview: '중랑 장미공원 일대 봄 축제', areaCode: '1' },
    { contentId: 'seoul-hangang', contentTypeId: '15', title: '한강몽땅 여름축제', address: '서울특별시 영등포구 여의동로', eventStartDate: '2026-07-25', eventEndDate: '2026-08-10', firstImage: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&q=80', mapX: 126.934, mapY: 37.527, tel: '02-120', category: '가족', overview: '여의도 한강공원 여름 물놀이·공연 축제', areaCode: '1' },
    { contentId: 'seoul-drum', contentTypeId: '15', title: '서울드럼페스티벌', address: '서울특별시 종로구 세종대로', eventStartDate: '2026-10-02', eventEndDate: '2026-10-04', firstImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', mapX: 126.977, mapY: 37.572, tel: '02-399-1000', category: '공연', overview: '광화문 광장 드럼 퍼포먼스', areaCode: '1' },
    { contentId: 'seoul-silvergrass', contentTypeId: '15', title: '서울억새축제', address: '서울특별시 마포구 하늘공원로', eventStartDate: '2026-10-10', eventEndDate: '2026-10-19', firstImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80', mapX: 126.884, mapY: 37.568, tel: '02-300-5500', category: '계절축제', overview: '하늘공원 억새 물결 가을 축제', areaCode: '1' },
  ],
  INCHEON: [
    { contentId: 'incheon-pentaport', contentTypeId: '15', title: '인천펜타포트락페스티벌', address: '인천광역시 연수구 센트럴로 123', eventStartDate: '2026-08-07', eventEndDate: '2026-08-09', firstImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', mapX: 126.643, mapY: 37.389, tel: '032-832-0001', category: '공연', overview: '송도 달빛축제공원 록 페스티벌', areaCode: '2' },
    { contentId: 'incheon-dolmen', contentTypeId: '15', title: '강화고인돌문화축제', address: '인천광역시 강화군', eventStartDate: '2026-10-10', eventEndDate: '2026-10-12', firstImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', mapX: 126.488, mapY: 37.746, tel: '032-930-3114', category: '체험', overview: '강화 고인돌 공원 선사 체험', areaCode: '2' },
    { contentId: 'incheon-openport', contentTypeId: '15', title: '인천개항장문화재야행', address: '인천광역시 중구 개항로', eventStartDate: '2026-10-17', eventEndDate: '2026-10-18', firstImage: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80', mapX: 126.6219, mapY: 37.4728, tel: '032-760-7590', category: '문화/예술', overview: '개항장 거리 야간 문화재 탐방', areaCode: '2' },
    { contentId: 'incheon-bupyeong', contentTypeId: '15', title: '부평풍물대축제', address: '인천광역시 부평구 부평대로', eventStartDate: '2026-09-18', eventEndDate: '2026-09-20', firstImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80', mapX: 126.722, mapY: 37.489, tel: '032-509-6400', category: '공연', overview: '부평역 일대 풍물·거리공연', areaCode: '2' },
  ],
  BUSAN: [
    { contentId: 'busan-fireworks', contentTypeId: '15', title: '부산불꽃축제', address: '부산광역시 수영구 광안해변로', eventStartDate: '2026-10-24', eventEndDate: '2026-10-25', firstImage: 'https://images.unsplash.com/photo-1467810563316-b554cbb2ee97?w=800&q=80', mapX: 129.118, mapY: 35.153, tel: '051-610-4000', category: '공연', overview: '광안대교를 배경으로 열리는 부산 대표 불꽃축제', areaCode: '6' },
    { contentId: 'busan-sea', contentTypeId: '15', title: '부산바다축제', address: '부산광역시 해운대구 해운대해변로', eventStartDate: '2026-08-01', eventEndDate: '2026-08-10', firstImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', mapX: 129.16, mapY: 35.158, tel: '051-749-5700', category: '가족', overview: '해운대·광안리 여름 바다 축제', areaCode: '6' },
    { contentId: 'busan-jagalchi', contentTypeId: '15', title: '자갈치축제', address: '부산광역시 중구 자갈치해안로', eventStartDate: '2026-10-08', eventEndDate: '2026-10-12', firstImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', mapX: 129.026, mapY: 35.097, tel: '051-713-8000', category: '먹거리', overview: '자갈치시장 수산물 축제', areaCode: '6' },
    { contentId: 'busan-film', contentTypeId: '15', title: '부산국제영화제 거리축제', address: '부산광역시 해운대구 영화의전당', eventStartDate: '2026-10-02', eventEndDate: '2026-10-11', firstImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3cf?w=800&q=80', mapX: 129.127, mapY: 35.171, tel: '051-709-2000', category: '문화/예술', overview: '영화의전당·센텀 일대 영화제 거리 행사', areaCode: '6' },
  ],
  GANGWON: [
    { contentId: 'chuncheon-mime', contentTypeId: '15', title: '춘천마임축제', address: '강원특별자치도 춘천시 축제거리', eventStartDate: '2026-05-21', eventEndDate: '2026-05-31', firstImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', mapX: 127.73, mapY: 37.8813, tel: '033-242-2587', category: '공연', overview: '춘천 명동·공지천에서 열리는 마임 축제', areaCode: '32' },
    { contentId: 'gangneung-coffee', contentTypeId: '15', title: '강릉커피축제', address: '강원특별자치도 강릉시 창해로', eventStartDate: '2026-10-02', eventEndDate: '2026-10-06', firstImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80', mapX: 128.8761, mapY: 37.7519, tel: '033-640-4533', category: '먹거리', overview: '안목해변 커피거리 축제', areaCode: '32' },
    { contentId: 'pyeongchang-hyoseok', contentTypeId: '15', title: '평창효석문화제', address: '강원특별자치도 평창군 봉평면', eventStartDate: '2026-09-04', eventEndDate: '2026-09-07', firstImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80', mapX: 128.428, mapY: 37.509, tel: '033-330-2700', category: '문화/예술', overview: '메밀꽃 필 무렵 효석 문화제', areaCode: '32' },
    { contentId: 'sokcho-beach', contentTypeId: '15', title: '속초해변축제', address: '강원특별자치도 속초시 해오름로', eventStartDate: '2026-07-24', eventEndDate: '2026-07-27', firstImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', mapX: 128.5918, mapY: 38.207, tel: '033-639-2340', category: '가족', overview: '속초해수욕장 여름 축제', areaCode: '32' },
    { contentId: 'hwacheon-sancheoneo', contentTypeId: '15', title: '화천산천어축제', address: '강원특별자치도 화천군 산천어길', eventStartDate: '2026-01-10', eventEndDate: '2026-02-01', firstImage: 'https://images.unsplash.com/photo-1483664852095-d6cc68726232?w=800&q=80', mapX: 127.708, mapY: 38.106, tel: '033-440-2546', category: '체험', overview: '화천 얼음나라 산천어 축제', areaCode: '32' },
    { contentId: 'jeongseon-ari', contentTypeId: '15', title: '정선아리랑제', address: '강원특별자치도 정선군 봉양리', eventStartDate: '2026-09-18', eventEndDate: '2026-09-21', firstImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80', mapX: 128.661, mapY: 37.381, tel: '033-560-2360', category: '문화/예술', overview: '정선 아리랑 한마당', areaCode: '32' },
  ],
  DAEGU: [
    { contentId: 'daegu-chimac', contentTypeId: '15', title: '대구치맥페스티벌', address: '대구광역시 수성구 두산동', eventStartDate: '2026-07-24', eventEndDate: '2026-07-28', firstImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', mapX: 128.694, mapY: 35.829, tel: '053-803-8000', category: '먹거리', overview: '두류공원 치맥 페스티벌', areaCode: '4' },
    { contentId: 'daegu-color', contentTypeId: '15', title: '대구컬러풀페스티벌', address: '대구광역시 중구 동성로', eventStartDate: '2026-05-29', eventEndDate: '2026-05-31', firstImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80', mapX: 128.595, mapY: 35.871, tel: '053-803-3640', category: '공연', overview: '동성로 컬러 퍼레이드', areaCode: '4' },
    { contentId: 'daegu-yaknyeong', contentTypeId: '15', title: '대구약령시한방문화축제', address: '대구광역시 중구 약령시', eventStartDate: '2026-05-08', eventEndDate: '2026-05-10', firstImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80', mapX: 128.59, mapY: 35.868, tel: '053-253-4729', category: '체험', overview: '약령시 한방 체험 축제', areaCode: '4' },
  ],
  GWANGJU: [
    { contentId: 'gwangju-kimchi', contentTypeId: '15', title: '광주김치축제', address: '광주광역시 서구 상무시민공원', eventStartDate: '2026-10-23', eventEndDate: '2026-10-27', firstImage: 'https://images.unsplash.com/photo-1467260201071-6e2ed80abd56?w=800&q=80', mapX: 126.8526, mapY: 35.1595, tel: '062-613-8282', category: '먹거리', overview: '광주 대표 김치 문화 축제', areaCode: '5' },
    { contentId: 'gwangju-biennale', contentTypeId: '15', title: '광주비엔날레 시민축제', address: '광주광역시 북구 비엔날레로', eventStartDate: '2026-09-04', eventEndDate: '2026-11-29', firstImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80', mapX: 126.89, mapY: 35.183, tel: '062-608-4114', category: '문화/예술', overview: '비엔날레 전시와 시민 거리 축제', areaCode: '5' },
    { contentId: 'gwangju-chungjang', contentTypeId: '15', title: '충장축제', address: '광주광역시 동구 충장로', eventStartDate: '2026-10-02', eventEndDate: '2026-10-06', firstImage: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80', mapX: 126.917, mapY: 35.146, tel: '062-608-2114', category: '공연', overview: '충장로 퍼레이드와 거리공연', areaCode: '5' },
  ],
  DAEJEON: [
    { contentId: 'daejeon-0si', contentTypeId: '15', title: '대전 0시 축제', address: '대전광역시 중구 은행동', eventStartDate: '2026-08-08', eventEndDate: '2026-08-11', firstImage: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80', mapX: 127.427, mapY: 36.328, tel: '042-250-1234', category: '공연', overview: '으능정이 거리 심야 축제', areaCode: '3' },
    { contentId: 'daejeon-science', contentTypeId: '15', title: '대전사이언스페스티벌', address: '대전광역시 유성구 엑스포로', eventStartDate: '2026-08-14', eventEndDate: '2026-08-16', firstImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80', mapX: 127.388, mapY: 36.377, tel: '042-250-1111', category: '가족', overview: '엑스포과학공원 과학 축제', areaCode: '3' },
    { contentId: 'daejeon-bread', contentTypeId: '15', title: '성심당 빵축제', address: '대전광역시 중구 대종로', eventStartDate: '2026-09-11', eventEndDate: '2026-09-13', firstImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', mapX: 127.426, mapY: 36.327, tel: '042-256-6666', category: '먹거리', overview: '대전역 일대 빵·카페 축제', areaCode: '3' },
  ],
  ULSAN: [
    { contentId: 'ulsan-whale', contentTypeId: '15', title: '울산고래축제', address: '울산광역시 남구 장생포', eventStartDate: '2026-05-22', eventEndDate: '2026-05-25', firstImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', mapX: 129.43, mapY: 35.504, tel: '052-226-5400', category: '가족', overview: '장생포 고래문화마을 축제', areaCode: '7' },
    { contentId: 'ulsan-taehwagang', contentTypeId: '15', title: '태화강 봄꽃축제', address: '울산광역시 중구 태화강국가정원', eventStartDate: '2026-04-04', eventEndDate: '2026-04-12', firstImage: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80', mapX: 129.329, mapY: 35.55, tel: '052-229-2114', category: '계절축제', overview: '태화강 십리대숲 봄꽃', areaCode: '7' },
    { contentId: 'ulsan-industrial', contentTypeId: '15', title: '울산공업축제', address: '울산광역시 남구 삼산로', eventStartDate: '2026-10-09', eventEndDate: '2026-10-12', firstImage: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80', mapX: 129.338, mapY: 35.538, tel: '052-229-3731', category: '문화/예술', overview: '울산 공업탑 일대 시민 축제', areaCode: '7' },
  ],
  SEJONG: [
    { contentId: 'sejong-festival', contentTypeId: '15', title: '세종축제', address: '세종특별자치시 나성동', eventStartDate: '2026-10-10', eventEndDate: '2026-10-12', firstImage: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80', mapX: 127.289, mapY: 36.48, tel: '044-120', category: '가족', overview: '세종호수공원 시민 축제', areaCode: '8' },
    { contentId: 'sejong-oknyeobong', contentTypeId: '15', title: '세종 옥녀봉 해맞이', address: '세종특별자치시 금남면', eventStartDate: '2026-01-01', eventEndDate: '2026-01-01', firstImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', mapX: 127.284, mapY: 36.447, tel: '044-300-3114', category: '계절축제', overview: '옥녀봉 해돋이 행사', areaCode: '8' },
    { contentId: 'sejong-garden', contentTypeId: '15', title: '세종정원페스티벌', address: '세종특별자치시 연기면', eventStartDate: '2026-05-02', eventEndDate: '2026-05-05', firstImage: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80', mapX: 127.28, mapY: 36.48, tel: '044-300-7114', category: '가족', overview: '중앙공원 정원 전시', areaCode: '8' },
  ],
  CHUNGBUK: [
    { contentId: 'cheongju-jikji', contentTypeId: '15', title: '청주직지축제', address: '충청북도 청주시 흥덕구', eventStartDate: '2026-09-03', eventEndDate: '2026-09-07', firstImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80', mapX: 127.489, mapY: 36.6424, tel: '043-201-2029', category: '문화/예술', overview: '고인쇄박물관 직지 축제', areaCode: '33' },
    { contentId: 'danyang-garlic', contentTypeId: '15', title: '단양마늘축제', address: '충청북도 단양군 단양읍', eventStartDate: '2026-09-11', eventEndDate: '2026-09-13', firstImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', mapX: 128.366, mapY: 36.985, tel: '043-420-3035', category: '먹거리', overview: '단양 마늘·한우 축제', areaCode: '33' },
    { contentId: 'jecheon-herbal', contentTypeId: '15', title: '제천한방바이오축제', address: '충청북도 제천시 의림대로', eventStartDate: '2026-09-18', eventEndDate: '2026-09-21', firstImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', mapX: 128.191, mapY: 37.132, tel: '043-641-6732', category: '체험', overview: '의림지 한방 바이오 축제', areaCode: '33' },
    { contentId: 'chungju-hoam', contentTypeId: '15', title: '충주호 벚꽃축제', address: '충청북도 충주시 중앙탑면', eventStartDate: '2026-04-04', eventEndDate: '2026-04-12', firstImage: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80', mapX: 127.928, mapY: 37.007, tel: '043-850-6724', category: '계절축제', overview: '충주호 벚꽃 드라이브', areaCode: '33' },
  ],
  CHUNGNAM: [
    { contentId: 'boryeong-mud', contentTypeId: '15', title: '보령머드축제', address: '충청남도 보령시 머드광장로', eventStartDate: '2026-07-17', eventEndDate: '2026-07-26', firstImage: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80', mapX: 126.612, mapY: 36.333, tel: '041-930-3542', category: '체험', overview: '대천해수욕장 머드 축제', areaCode: '34' },
    { contentId: 'buyeo-lotus', contentTypeId: '15', title: '부여서동연꽃축제', address: '충청남도 부여군 궁남지', eventStartDate: '2026-07-04', eventEndDate: '2026-07-12', firstImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', mapX: 126.912, mapY: 36.275, tel: '041-830-2211', category: '계절축제', overview: '궁남지 연꽃 축제', areaCode: '34' },
    { contentId: 'gongju-chestnut', contentTypeId: '15', title: '공주 밤축제', address: '충청남도 공주시 금성동', eventStartDate: '2026-10-02', eventEndDate: '2026-10-05', firstImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', mapX: 127.119, mapY: 36.451, tel: '041-840-8114', category: '먹거리', overview: '공산성 일대 밤 축제', areaCode: '34' },
    { contentId: 'taean-tulip', contentTypeId: '15', title: '태안 세계튤립축제', address: '충청남도 태안군 남면', eventStartDate: '2026-04-10', eventEndDate: '2026-04-26', firstImage: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80', mapX: 126.297, mapY: 36.672, tel: '041-671-5000', category: '가족', overview: '두웅습지·꽃단지 튤립 축제', areaCode: '34' },
  ],
  JEONBUK: [
    { contentId: 'jeonju-hanji', contentTypeId: '15', title: '전주한지문화축제', address: '전북특별자치도 전주시 완산구', eventStartDate: '2026-05-01', eventEndDate: '2026-05-05', firstImage: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80', mapX: 127.153, mapY: 35.815, tel: '063-281-2553', category: '문화/예술', overview: '한옥마을 한지 문화 축제', areaCode: '35' },
    { contentId: 'jeonju-bibimbap', contentTypeId: '15', title: '전주비빔밥축제', address: '전북특별자치도 전주시 한옥마을', eventStartDate: '2026-10-09', eventEndDate: '2026-10-12', firstImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', mapX: 127.152, mapY: 35.815, tel: '063-281-2024', category: '먹거리', overview: '전주 비빔밥 한마당', areaCode: '35' },
    { contentId: 'namwon-chunhyang', contentTypeId: '15', title: '남원춘향제', address: '전북특별자치도 남원시 요천로', eventStartDate: '2026-05-05', eventEndDate: '2026-05-09', firstImage: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80', mapX: 127.39, mapY: 35.416, tel: '063-620-8799', category: '문화/예술', overview: '광한루원 춘향제', areaCode: '35' },
    { contentId: 'muju-firefly', contentTypeId: '15', title: '무주반딧불축제', address: '전북특별자치도 무주군 설천면', eventStartDate: '2026-06-12', eventEndDate: '2026-06-21', firstImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80', mapX: 127.661, mapY: 35.863, tel: '063-320-2535', category: '계절축제', overview: '반디랜드 반딧불 축제', areaCode: '35' },
  ],
  JEONNAM: [
    { contentId: 'yeosu-firework', contentTypeId: '15', title: '여수밤바다불꽃축제', address: '전라남도 여수시 종포해양공원', eventStartDate: '2026-10-31', eventEndDate: '2026-11-01', firstImage: 'https://images.unsplash.com/photo-1467810563316-b554652e1da4?w=800&q=80', mapX: 127.6622, mapY: 34.7604, tel: '061-659-3812', category: '공연', overview: '여수 밤바다 불꽃 축제', areaCode: '36' },
    { contentId: 'suncheon-reed', contentTypeId: '15', title: '순천만갈대축제', address: '전라남도 순천시 순천만길', eventStartDate: '2026-10-24', eventEndDate: '2026-11-02', firstImage: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80', mapX: 127.509, mapY: 34.886, tel: '061-749-3006', category: '계절축제', overview: '순천만 갈대밭 가을 축제', areaCode: '36' },
    { contentId: 'boseong-tea', contentTypeId: '15', title: '보성차밭빛축제', address: '전라남도 보성군 보성읍', eventStartDate: '2026-12-05', eventEndDate: '2027-01-04', firstImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', mapX: 127.08, mapY: 34.763, tel: '061-850-5211', category: '계절축제', overview: '녹차밭 겨울 빛 축제', areaCode: '36' },
    { contentId: 'mokpo-port', contentTypeId: '15', title: '목포항구축제', address: '전라남도 목포시 해안로', eventStartDate: '2026-08-07', eventEndDate: '2026-08-09', firstImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', mapX: 126.392, mapY: 34.794, tel: '061-270-8598', category: '공연', overview: '목포 해안 불꽃·공연 축제', areaCode: '36' },
  ],
  GYEONGBUK: [
    { contentId: 'gyeongju-cherry', contentTypeId: '15', title: '경주벚꽃축제', address: '경상북도 경주시 대릉원', eventStartDate: '2026-04-03', eventEndDate: '2026-04-12', firstImage: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80', mapX: 129.2247, mapY: 35.8562, tel: '054-779-6078', category: '계절축제', overview: '대릉원·황리단길 벚꽃', areaCode: '37' },
    { contentId: 'andong-mask', contentTypeId: '15', title: '안동국제탈춤페스티벌', address: '경상북도 안동시 축제장길', eventStartDate: '2026-09-25', eventEndDate: '2026-10-04', firstImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80', mapX: 128.729, mapY: 36.568, tel: '054-840-3600', category: '공연', overview: '하회마을 탈춤 축제', areaCode: '37' },
    { contentId: 'pohang-light', contentTypeId: '15', title: '포항국제불빛축제', address: '경상북도 포항시 북구 두호동', eventStartDate: '2026-05-29', eventEndDate: '2026-06-07', firstImage: 'https://images.unsplash.com/photo-1467810563316-b554cbb2ee97?w=800&q=80', mapX: 129.379, mapY: 36.056, tel: '054-270-2242', category: '공연', overview: '영일대 해상 불빛 축제', areaCode: '37' },
    { contentId: 'ulleung-squid', contentTypeId: '15', title: '울릉도오징어축제', address: '경상북도 울릉군 도동리', eventStartDate: '2026-08-14', eventEndDate: '2026-08-16', firstImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', mapX: 130.905, mapY: 37.484, tel: '054-790-6424', category: '먹거리', overview: '도동항 오징어 축제', areaCode: '37' },
  ],
  GYEONGNAM: [
    { contentId: 'jinju-lantern', contentTypeId: '15', title: '진주남강유등축제', address: '경상남도 진주시 남강로', eventStartDate: '2026-10-01', eventEndDate: '2026-10-12', firstImage: 'https://images.unsplash.com/photo-1528360983277-427c9a0e30ef?w=800&q=80', mapX: 128.108, mapY: 35.18, tel: '055-749-5174', category: '문화/예술', overview: '진주성 남강 유등 축제', areaCode: '38' },
    { contentId: 'tongyeong-hanryeo', contentTypeId: '15', title: '통영한산대첩축제', address: '경상남도 통영시 중앙동', eventStartDate: '2026-08-10', eventEndDate: '2026-08-15', firstImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', mapX: 128.425, mapY: 34.854, tel: '055-650-5412', category: '문화/예술', overview: '통제영 한산대첩 재현', areaCode: '38' },
    { contentId: 'geoje-island', contentTypeId: '15', title: '거제섬꽃축제', address: '경상남도 거제시 거제면', eventStartDate: '2026-04-10', eventEndDate: '2026-04-19', firstImage: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80', mapX: 128.621, mapY: 34.888, tel: '055-639-3404', category: '계절축제', overview: '거제 봄꽃 섬 축제', areaCode: '38' },
    { contentId: 'hadong-tea', contentTypeId: '15', title: '하동 야생차문화축제', address: '경상남도 하동군 화개면', eventStartDate: '2026-05-01', eventEndDate: '2026-05-04', firstImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', mapX: 127.634, mapY: 35.19, tel: '055-880-2375', category: '체험', overview: '화개장터 야생차 축제', areaCode: '38' },
  ],
  JEJU: [
    { contentId: 'jeju-fire', contentTypeId: '15', title: '제주들불축제', address: '제주특별자치도 제주시 애월읍', eventStartDate: '2026-03-06', eventEndDate: '2026-03-09', firstImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80', mapX: 126.517, mapY: 33.459, tel: '064-728-3394', category: '계절축제', overview: '새별오름 들불 축제', areaCode: '39' },
    { contentId: 'seogwipo-70ri', contentTypeId: '15', title: '서귀포칠십리축제', address: '제주특별자치도 서귀포시 서귀동', eventStartDate: '2026-10-09', eventEndDate: '2026-10-12', firstImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80', mapX: 126.56, mapY: 33.253, tel: '064-760-3191', category: '문화/예술', overview: '칠십리시공원 서귀포 축제', areaCode: '39' },
    { contentId: 'jeju-canola', contentTypeId: '15', title: '제주유채꽃축제', address: '제주특별자치도 제주시 한림읍', eventStartDate: '2026-04-04', eventEndDate: '2026-04-13', firstImage: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80', mapX: 126.239, mapY: 33.389, tel: '064-728-2752', category: '가족', overview: '가시리·협재 유채꽃 단지', areaCode: '39' },
    { contentId: 'jeju-horse', contentTypeId: '15', title: '제주말축제', address: '제주특별자치도 제주시 조천읍', eventStartDate: '2026-10-02', eventEndDate: '2026-10-05', firstImage: 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=800&q=80', mapX: 126.67, mapY: 33.508, tel: '064-728-3392', category: '체험', overview: '조랑말체험공원 말 축제', areaCode: '39' },
  ],
};

function builtinFestivals(resolved) {
  const metro = resolved.metro || metroForArea(resolved.areaCode, 'GYEONGGI');
  const rows = BUILTIN_BY_METRO[metro];
  const list = rows?.length ? rows : Object.values(BUILTIN_BY_METRO).flat();
  return list.map((item) => ({ ...item, source: 'fallback' }));
}

export function isLiveTourSource(source) {
  const value = String(source || '').toLowerCase();
  return value === 'searchfestival2' || value === 'cache';
}

export function liveTourFestivals(result) {
  if (!result || !isLiveTourSource(result.source)) return [];
  return (result.festivals || []).filter((item) => {
    const source = String(item && item.source || '').toLowerCase();
    return source !== 'fallback' && source !== 'sample';
  });
}

export function fallbackTourFestivals(input = {}) {
  return builtinFestivals(resolveFestivalQuery(input));
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
  const allowBuiltin = input && input.allowBuiltin !== false;
  const emptyLive = (reason, extra = {}) => {
    console.error('[searchFestival2] empty-or-error', {
      code: extra.code || 'EMPTY',
      message: reason,
      metro: resolved.metro || 'ALL',
      areaCode: resolved.areaCode || 'all',
      hasKey: Boolean(tourServiceKey()),
      allowBuiltin,
    });
    return { ...resolved, festivals: [], source: 'none', message: reason };
  };
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
    if (!allowBuiltin) return emptyLive('TourAPI 검색 결과가 0건입니다.', { code: 'EMPTY' });
    const fallback = builtinFestivals(resolved);
    return { ...resolved, festivals: fallback, source: fallback.length ? 'fallback' : 'none' };
  } catch (err) {
    const cached = LAST_OK_FESTIVALS.get(key) || [];
    if (cached.length) return { ...resolved, festivals: cached, source: 'cache' };
    const message = err && err.message ? err.message : 'TourAPI 조회에 실패했습니다.';
    if (!allowBuiltin) return emptyLive(message, { code: 'FETCH_FAIL' });
    const fallback = builtinFestivals(resolved);
    if (fallback.length) return { ...resolved, festivals: fallback, source: 'fallback', message };
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
