import type { MapRegion } from '../types/map';

export function validLatLng(lat?: number, lng?: number) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude !== 0
    && longitude !== 0
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180;
}

function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function categoryPinColor(category?: string) {
  const text = String(category || '');
  if (text.includes('역사')) return 'orange';
  if (text.includes('시장')) return 'green';
  if (text.includes('맛집') || text.includes('음식')) return 'orange';
  if (text.includes('축제')) return 'blue';
  if (text.includes('관광')) return 'violet';
  if (text.includes('문화')) return 'blue';
  if (text.includes('캠핑') || text.includes('숙박')) return 'violet';
  return 'teal';
}

/** 남한 육지·연안에 해당하는 대략 범위. 바다·외국 좌표를 걸러낸다. */
export function koreaLandCoords(lat?: number, lng?: number) {
  if (!validLatLng(lat, lng)) return false;
  return lat! >= 33.05 && lat! <= 38.75 && lng! >= 124.55 && lng! <= 132.05;
}

/** 권역별 지도 핀 허용 박스. 인접 광역 도시가 섞이지 않게 좁힌다. */
export const METRO_MAP_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  SEOUL: { minLat: 37.42, maxLat: 37.71, minLng: 126.78, maxLng: 127.19 },
  BUSAN: { minLat: 34.95, maxLat: 35.40, minLng: 128.75, maxLng: 129.32 },
  DAEGU: { minLat: 35.70, maxLat: 36.05, minLng: 128.40, maxLng: 128.80 },
  INCHEON: { minLat: 37.22, maxLat: 37.86, minLng: 126.10, maxLng: 126.78 },
  GWANGJU: { minLat: 35.06, maxLat: 35.26, minLng: 126.70, maxLng: 127.02 },
  DAEJEON: { minLat: 36.22, maxLat: 36.50, minLng: 127.25, maxLng: 127.55 },
  ULSAN: { minLat: 35.40, maxLat: 35.72, minLng: 129.05, maxLng: 129.48 },
  SEJONG: { minLat: 36.42, maxLat: 36.68, minLng: 127.14, maxLng: 127.42 },
  GYEONGGI: { minLat: 36.88, maxLat: 38.32, minLng: 126.38, maxLng: 127.90 },
  GANGWON: { minLat: 37.00, maxLat: 38.62, minLng: 127.05, maxLng: 129.40 },
  CHUNGBUK: { minLat: 36.10, maxLat: 37.25, minLng: 127.25, maxLng: 128.70 },
  CHUNGNAM: { minLat: 35.95, maxLat: 37.10, minLng: 125.95, maxLng: 127.65 },
  JEONBUK: { minLat: 35.20, maxLat: 36.20, minLng: 126.40, maxLng: 127.90 },
  JEONNAM: { minLat: 33.95, maxLat: 35.50, minLng: 125.05, maxLng: 127.90 },
  GYEONGBUK: { minLat: 35.50, maxLat: 37.55, minLng: 127.80, maxLng: 129.70 },
  GYEONGNAM: { minLat: 34.55, maxLat: 35.75, minLng: 127.55, maxLng: 129.30 },
  JEJU: { minLat: 33.10, maxLat: 33.56, minLng: 126.14, maxLng: 126.98 },
};

export function coordsInMetroBBox(lat: number, lng: number, metro: string) {
  if (!koreaLandCoords(lat, lng)) return false;
  const box = METRO_MAP_BOUNDS[String(metro || '').toUpperCase()];
  if (!box) return true;
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

/** 권역 중심과 거의 같은 좌표는 주소 없는 기본값으로 보고 미니맵에서 뺀다. */
export function isMetroCenterCoord(
  lat: number,
  lng: number,
  origin: { latitude: number; longitude: number },
  epsilon = 0.0008,
) {
  return Math.abs(lat - origin.latitude) < epsilon && Math.abs(lng - origin.longitude) < epsilon;
}

/** 홈 미니맵에 올릴 실제 장소 좌표만 남긴다. 권역 기본점·바다·타 권역은 제외. */
export function eligibleHomeMapPins<T extends { latitude: number; longitude: number }>(
  items: T[],
  metro: string,
  origin: { latitude: number; longitude: number },
  limit = 28,
): T[] {
  return items
    .filter((item) =>
      validLatLng(item.latitude, item.longitude)
      && coordsInMetroBBox(item.latitude, item.longitude, metro)
      && !isMetroCenterCoord(item.latitude, item.longitude, origin),
    )
    .slice(0, limit);
}

/** 선택 권역 중심에서 벗어난 핀은 버리고, 없으면 빈 배열을 반환한다. */
export function pinsInSelectedRegion<T extends { latitude: number; longitude: number }>(
  pins: T[],
  origin: { latitude: number; longitude: number },
  maxKm: number,
): T[] {
  const valid = pins.filter((point) => validLatLng(point.latitude, point.longitude));
  if (!validLatLng(origin.latitude, origin.longitude)) return valid;
  return valid.filter((point) => kmBetween(origin.latitude, origin.longitude, point.latitude, point.longitude) <= maxKm);
}

/** 타 지역 핀이 섞여 지도가 광역으로 벌어지지 않게 시·군 반경 안으로 자른다. */
export function boundToLocality(
  points: { latitude: number; longitude: number }[],
  maxKm = 28,
  origin?: { latitude: number; longitude: number },
) {
  const valid = points.filter((point) => validLatLng(point.latitude, point.longitude));
  if (valid.length <= 1) return valid;
  const lats = valid.map((point) => point.latitude).sort((a, b) => a - b);
  const lngs = valid.map((point) => point.longitude).sort((a, b) => a - b);
  const lat = origin && validLatLng(origin.latitude, origin.longitude)
    ? origin.latitude
    : lats[Math.floor(lats.length / 2)];
  const lng = origin && validLatLng(origin.latitude, origin.longitude)
    ? origin.longitude
    : lngs[Math.floor(lngs.length / 2)];
  const kept = valid.filter((point) => kmBetween(lat, lng, point.latitude, point.longitude) <= maxKm);
  return kept.length ? kept : valid;
}

export function regionFromPoints(
  points: { latitude: number; longitude: number }[],
  minDelta = 0.04,
): MapRegion | null {
  const valid = boundToLocality(points);
  if (!valid.length) return null;
  const lats = valid.map((point) => point.latitude);
  const lngs = valid.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.min(Math.max((maxLat - minLat) * 1.8, minDelta), 0.22),
    longitudeDelta: Math.min(Math.max((maxLng - minLng) * 1.8, minDelta), 0.22),
  };
}
