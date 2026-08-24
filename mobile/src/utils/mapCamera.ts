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

export function categoryPinColor(category?: string) {
  const text = String(category || '');
  if (text.includes('역사')) return 'orange';
  if (text.includes('시장')) return 'green';
  if (text.includes('축제')) return 'blue';
  if (text.includes('캠핑') || text.includes('숙박')) return 'violet';
  return 'teal';
}

export function regionFromPoints(
  points: { latitude: number; longitude: number }[],
  minDelta = 0.04,
): MapRegion | null {
  const valid = points.filter((point) => validLatLng(point.latitude, point.longitude));
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
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, minDelta),
    longitudeDelta: Math.max((maxLng - minLng) * 1.8, minDelta),
  };
}
