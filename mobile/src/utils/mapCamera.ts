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
