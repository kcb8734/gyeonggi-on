import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type UserLocationOk = {
  ok: true;
  latitude: number;
  longitude: number;
};

export type UserLocationFail = {
  ok: false;
  reason: 'denied' | 'unavailable' | 'timeout';
  message: string;
};

export type UserLocationResult = UserLocationOk | UserLocationFail;

export const LOCATION_DENIED_MESSAGE =
  '위치 정보 사용에 동의하면 내 주변 축제·제휴업소·맛집·관광지를 정확하게 보여줍니다.';
export const LOCATION_UNAVAILABLE_MESSAGE =
  '이 기기에서는 위치를 확인할 수 없어 선택하신 권역 중심으로 보여줍니다.';

function webLocation(): Promise<UserLocationResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unavailable', message: LOCATION_UNAVAILABLE_MESSAGE });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        if (err?.code === 1) {
          resolve({ ok: false, reason: 'denied', message: LOCATION_DENIED_MESSAGE });
          return;
        }
        resolve({
          ok: false,
          reason: err?.code === 3 ? 'timeout' : 'unavailable',
          message: LOCATION_DENIED_MESSAGE,
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 20000 },
    );
  });
}

export async function requestUserLocation(): Promise<UserLocationResult> {
  if (Platform.OS === 'web') {
    return webLocation();
  }
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return { ok: false, reason: 'denied', message: LOCATION_DENIED_MESSAGE };
    }
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      ok: true,
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    };
  } catch {
    return { ok: false, reason: 'unavailable', message: LOCATION_UNAVAILABLE_MESSAGE };
  }
}
