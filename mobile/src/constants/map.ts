import { Region } from 'react-native-maps';

/** 수원·용인 권이 한 화면에 보이도록 한 경기도 기본 영역 */
export const GYEONGGI_DEFAULT_REGION: Region = {
  latitude: 37.275,
  longitude: 127.15,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

export const FESTIVAL_FOCUS_DELTA = {
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export const ALL_CATEGORIES = '전체';
