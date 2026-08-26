import { validLatLng } from './mapCamera';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export function haversineKm(a: LatLng, b: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function withinKm(point: LatLng, center: LatLng, km: number) {
  return haversineKm(point, center) <= km;
}

/** 같은 건물·같은 좌표에 쌓인 핀을 원형으로 벌려 각각 누를 수 있게 한다. */
export function spreadOverlappingPins<T extends LatLng>(pins: T[], minDeg = 0.0022): T[] {
  const groups = new Map<string, number[]>();
  pins.forEach((pin, index) => {
    if (!validLatLng(pin.latitude, pin.longitude)) return;
    const key = `${pin.latitude.toFixed(4)},${pin.longitude.toFixed(4)}`;
    const list = groups.get(key) ?? [];
    list.push(index);
    groups.set(key, list);
  });
  const next = pins.map((pin) => ({ ...pin }));
  groups.forEach((indexes) => {
    if (indexes.length < 2) return;
    const origin = pins[indexes[0]];
    indexes.forEach((index, i) => {
      const ring = Math.floor(i / 8);
      const slot = i % 8;
      const count = Math.min(8, indexes.length - ring * 8);
      const angle = (2 * Math.PI * slot) / count;
      const radius = minDeg * (1.4 + ring * 1.15);
      next[index] = {
        ...next[index],
        latitude: origin.latitude + Math.cos(angle) * radius,
        longitude: origin.longitude + Math.sin(angle) * radius,
      };
    });
  });
  return next;
}
