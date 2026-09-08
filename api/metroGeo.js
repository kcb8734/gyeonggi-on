import { AREA_CODE_BY_METRO, METRO_LOCALITIES, REGION_META, normalizeMetroId } from './metroLocalities.js';

export const METRO_CENTERS = {
  SEOUL: { lat: 37.5665, lng: 126.9780 },
  BUSAN: { lat: 35.1796, lng: 129.0756 },
  DAEGU: { lat: 35.8714, lng: 128.6014 },
  INCHEON: { lat: 37.4563, lng: 126.7052 },
  GWANGJU: { lat: 35.1595, lng: 126.8526 },
  DAEJEON: { lat: 36.3504, lng: 127.3845 },
  ULSAN: { lat: 35.5384, lng: 129.3114 },
  SEJONG: { lat: 36.4800, lng: 127.2890 },
  GYEONGGI: { lat: 37.4138, lng: 127.5183 },
  GANGWON: { lat: 37.8228, lng: 128.1555 },
  CHUNGBUK: { lat: 36.6357, lng: 127.4914 },
  CHUNGNAM: { lat: 36.5184, lng: 126.8000 },
  JEONBUK: { lat: 35.7175, lng: 127.1530 },
  JEONNAM: { lat: 34.8161, lng: 126.4629 },
  GYEONGBUK: { lat: 36.4919, lng: 128.8889 },
  GYEONGNAM: { lat: 35.4606, lng: 128.2132 },
  JEJU: { lat: 33.4996, lng: 126.5312 },
};

export const SIDO_NAME = {
  SEOUL: '서울특별시',
  BUSAN: '부산광역시',
  DAEGU: '대구광역시',
  INCHEON: '인천광역시',
  GWANGJU: '광주광역시',
  DAEJEON: '대전광역시',
  ULSAN: '울산광역시',
  SEJONG: '세종특별자치시',
  GYEONGGI: '경기도',
  GANGWON: '강원특별자치도',
  CHUNGBUK: '충청북도',
  CHUNGNAM: '충청남도',
  JEONBUK: '전북특별자치도',
  JEONNAM: '전라남도',
  GYEONGBUK: '경상북도',
  GYEONGNAM: '경상남도',
  JEJU: '제주특별자치도',
};

const SIDO_TOKENS = [
  ['서울특별시', 'SEOUL'], ['서울시', 'SEOUL'], ['서울', 'SEOUL'],
  ['부산광역시', 'BUSAN'], ['부산', 'BUSAN'],
  ['대구광역시', 'DAEGU'], ['대구', 'DAEGU'],
  ['인천광역시', 'INCHEON'], ['인천', 'INCHEON'],
  ['광주광역시', 'GWANGJU'],
  ['대전광역시', 'DAEJEON'], ['대전', 'DAEJEON'],
  ['울산광역시', 'ULSAN'], ['울산', 'ULSAN'],
  ['세종특별자치시', 'SEJONG'], ['세종시', 'SEJONG'], ['세종', 'SEJONG'],
  ['경기도', 'GYEONGGI'], ['경기', 'GYEONGGI'],
  ['강원특별자치도', 'GANGWON'], ['강원도', 'GANGWON'], ['강원', 'GANGWON'],
  ['충청북도', 'CHUNGBUK'], ['충북', 'CHUNGBUK'],
  ['충청남도', 'CHUNGNAM'], ['충남', 'CHUNGNAM'],
  ['전북특별자치도', 'JEONBUK'], ['전라북도', 'JEONBUK'], ['전북', 'JEONBUK'],
  ['전라남도', 'JEONNAM'], ['전남', 'JEONNAM'],
  ['경상북도', 'GYEONGBUK'], ['경북', 'GYEONGBUK'],
  ['경상남도', 'GYEONGNAM'], ['경남', 'GYEONGNAM'],
  ['제주특별자치도', 'JEJU'], ['제주도', 'JEJU'], ['제주', 'JEJU'],
];

export const CITY_COORDS = {
  수원시: { lat: 37.2636, lng: 127.0286 },
  용인시: { lat: 37.2411, lng: 127.1776 },
  고양시: { lat: 37.6584, lng: 126.8320 },
  화성시: { lat: 37.1995, lng: 126.8314 },
  성남시: { lat: 37.4200, lng: 127.1267 },
  부천시: { lat: 37.5034, lng: 126.7660 },
  남양주시: { lat: 37.6360, lng: 127.2165 },
  안산시: { lat: 37.3219, lng: 126.8309 },
  안양시: { lat: 37.3943, lng: 126.9568 },
  평택시: { lat: 36.9922, lng: 127.1127 },
  시흥시: { lat: 37.3800, lng: 126.8030 },
  파주시: { lat: 37.7600, lng: 126.7800 },
  김포시: { lat: 37.6153, lng: 126.7156 },
  의정부시: { lat: 37.7381, lng: 127.0338 },
  광주시: { lat: 37.4295, lng: 127.2551 },
  하남시: { lat: 37.5393, lng: 127.2146 },
  광명시: { lat: 37.4786, lng: 126.8646 },
  군포시: { lat: 37.3617, lng: 126.9352 },
  오산시: { lat: 37.1498, lng: 127.0773 },
  이천시: { lat: 37.2720, lng: 127.4350 },
  양주시: { lat: 37.7853, lng: 127.0458 },
  구리시: { lat: 37.5943, lng: 127.1296 },
  안성시: { lat: 37.0080, lng: 127.2797 },
  포천시: { lat: 37.8949, lng: 127.2004 },
  의왕시: { lat: 37.3446, lng: 126.9683 },
  여주시: { lat: 37.2983, lng: 127.6370 },
  양평군: { lat: 37.4910, lng: 127.4876 },
  동두천시: { lat: 37.9034, lng: 127.0605 },
  과천시: { lat: 37.4292, lng: 126.9877 },
  가평군: { lat: 37.8315, lng: 127.5096 },
  연천군: { lat: 38.0960, lng: 127.0750 },
  해운대구: { lat: 35.1631, lng: 129.1636 },
  기장군: { lat: 35.2445, lng: 129.2223 },
  부산진구: { lat: 35.1630, lng: 129.0532 },
  수성구: { lat: 35.8582, lng: 128.6306 },
  달서구: { lat: 35.8298, lng: 128.5326 },
  강화군: { lat: 37.7466, lng: 126.4879 },
  광산구: { lat: 35.1396, lng: 126.7937 },
  유성구: { lat: 36.3623, lng: 127.3565 },
  울주군: { lat: 35.5623, lng: 129.1260 },
  춘천시: { lat: 37.8813, lng: 127.7300 },
  강릉시: { lat: 37.7519, lng: 128.8761 },
  원주시: { lat: 37.3422, lng: 127.9202 },
  속초시: { lat: 38.2070, lng: 128.5918 },
  청주시: { lat: 36.6424, lng: 127.4890 },
  천안시: { lat: 36.8151, lng: 127.1139 },
  전주시: { lat: 35.8242, lng: 127.1480 },
  여수시: { lat: 34.7604, lng: 127.6622 },
  순천시: { lat: 34.9507, lng: 127.4872 },
  포항시: { lat: 36.0190, lng: 129.3435 },
  경주시: { lat: 35.8562, lng: 129.2247 },
  안동시: { lat: 36.5684, lng: 128.7294 },
  창원시: { lat: 35.2279, lng: 128.6819 },
  진주시: { lat: 35.1803, lng: 128.1076 },
  제주시: { lat: 33.4996, lng: 126.5312 },
  서귀포시: { lat: 33.2541, lng: 126.5600 },
};

function cityLabel(loc) {
  return String(loc && (loc.label || loc.id) || '').replace(/^(서울|부산|대구|인천|광주|대전|울산|충북|충남|전북|전남|경북|경남)\s+/, '');
}

const CITY_INDEX = Object.entries(METRO_LOCALITIES).flatMap(([metro, locs]) =>
  (locs || []).map((loc) => {
    const city = cityLabel(loc);
    return { metro, city, key: city.replace(/\s+/g, '') };
  }),
).sort((a, b) => b.key.length - a.key.length);

export function metroFromPlace(value) {
  const hay = String(value || '').replace(/\s+/g, '');
  if (!hay) return null;
  const compact = hay.toUpperCase();
  if (REGION_META[compact]) return normalizeMetroId(compact);
  if (hay.includes('광주광역') || hay.includes('광산구')) return 'GWANGJU';
  if (hay.includes('경기') && hay.includes('광주')) return 'GYEONGGI';
  for (const [token, metro] of SIDO_TOKENS) {
    if (hay.includes(token.replace(/\s+/g, ''))) return metro;
  }
  const hit = CITY_INDEX.find((row) => hay.includes(row.key) && row.key.length >= 2);
  return hit ? hit.metro : null;
}

export function cityFromPlace(value, metroHint) {
  const hay = String(value || '').replace(/\s+/g, '');
  if (!hay) return null;
  const metro = metroHint ? normalizeMetroId(metroHint) : null;
  const pool = metro ? CITY_INDEX.filter((row) => row.metro === metro) : CITY_INDEX;
  const hit = pool.find((row) => hay.includes(row.key) && row.key.length >= 2);
  return hit ? hit.city : null;
}

export function municipalityFromAddress(address, metroHint) {
  const hay = String(address || '');
  const metro = metroHint ? normalizeMetroId(metroHint) : (metroFromPlace(hay) || 'GYEONGGI');
  const city = cityFromPlace(hay, metro);
  if (city) return city;
  return SIDO_NAME[metro] || '경기도';
}

export function municipalityRegionCode(name, metroHint = 'GYEONGGI') {
  const metro = normalizeMetroId(metroHint);
  const prefix = metro === 'GYEONGGI' ? 'GG' : metro;
  return `${prefix}_${String(name || '').replace(/\s+/g, '')}`;
}

export function hasValidCoords(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude !== 0
    && longitude !== 0
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180;
}

export function geocodePlace(text, metroHint) {
  const metro = metroHint ? normalizeMetroId(metroHint) : (metroFromPlace(text) || 'GYEONGGI');
  const city = cityFromPlace(text, metro);
  if (city && CITY_COORDS[city]) return { ...CITY_COORDS[city], metro, city };
  const center = METRO_CENTERS[metro] || METRO_CENTERS.GYEONGGI;
  return { ...center, metro, city: city || SIDO_NAME[metro] };
}

export function withCoords(item, metroHint) {
  const row = item || {};
  const lat = row.mapY ?? row.latitude;
  const lng = row.mapX ?? row.longitude;
  if (hasValidCoords(lat, lng)) {
    return { latitude: Number(lat), longitude: Number(lng) };
  }
  const geo = geocodePlace(`${row.address || ''} ${row.location_name || ''} ${row.title || ''}`, metroHint || row.metro);
  return { latitude: geo.lat, longitude: geo.lng };
}

const METRO_SPAN = {
  SEOUL: 0.45,
  BUSAN: 0.55,
  DAEGU: 0.5,
  INCHEON: 0.55,
  GWANGJU: 0.4,
  DAEJEON: 0.4,
  ULSAN: 0.5,
  SEJONG: 0.4,
  GYEONGGI: 1.7,
  GANGWON: 1.9,
  CHUNGBUK: 1.2,
  CHUNGNAM: 1.3,
  JEONBUK: 1.3,
  JEONNAM: 1.7,
  GYEONGBUK: 1.7,
  GYEONGNAM: 1.5,
  JEJU: 0.9,
};

/** 장소 문구·좌표를 우선하고, 요청 권역으로 덮어쓴 태그는 후순위로 본다. */
export function festivalBelongsToMetro(item, metroHint) {
  const wanted = normalizeMetroId(metroHint);
  const row = item || {};
  const hay = [row.title, row.location_name, row.municipality_name, row.address].filter(Boolean).join(' ');
  const inferred = metroFromPlace(hay);
  if (inferred) return inferred === wanted;

  const lat = Number(row.latitude ?? row.mapY);
  const lng = Number(row.longitude ?? row.mapX);
  if (hasValidCoords(lat, lng)) {
    const center = METRO_CENTERS[wanted] || METRO_CENTERS.GYEONGGI;
    const span = METRO_SPAN[wanted] || 1.2;
    return Math.abs(lat - center.lat) <= span && Math.abs(lng - center.lng) <= span;
  }

  const taggedRaw = String(row.metro || row.regionalZone || '').trim();
  if (taggedRaw) return normalizeMetroId(taggedRaw) === wanted;

  const area = String(row.areaCode || row.areacode || '').trim();
  if (area && area !== 'all') return area === String(AREA_CODE_BY_METRO[wanted] || '');

  return false;
}
