import type { HomeFestival, HomePromotion } from '../types/home';

export type CouponKind = 'OFFICIAL' | 'SELF';

export interface RegionPreset {
  id: string;
  label: string;
  code: string;
  name: string;
  areaCodes: string[];
  officialMatching: boolean;
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const REGION_PRESETS: RegionPreset[] = [
  { id: 'GYEONGGI', label: '경기온', code: '31', name: '경기도', areaCodes: ['31'], officialMatching: true, latitude: 37.4138, longitude: 127.5183, latitudeDelta: 1.6, longitudeDelta: 1.6 },
  { id: 'SEOUL', label: '서울온', code: '1', name: '서울특별시', areaCodes: ['1'], officialMatching: false, latitude: 37.5665, longitude: 126.9780, latitudeDelta: 0.35, longitudeDelta: 0.35 },
  { id: 'INCHEON', label: '인천온', code: '2', name: '인천광역시', areaCodes: ['2'], officialMatching: false, latitude: 37.4563, longitude: 126.7052, latitudeDelta: 0.45, longitudeDelta: 0.45 },
  { id: 'GANGWON', label: '강원온', code: '32', name: '강원특별자치도', areaCodes: ['32'], officialMatching: false, latitude: 37.8228, longitude: 128.1555, latitudeDelta: 1.8, longitudeDelta: 1.8 },
  { id: 'CHUNGCHEONG', label: '충청온', code: '33', name: '충청권', areaCodes: ['33', '34', '3', '8'], officialMatching: false, latitude: 36.6372, longitude: 127.4897, latitudeDelta: 1.6, longitudeDelta: 1.6 },
  { id: 'JEOLLA', label: '전라온', code: '35', name: '전라권', areaCodes: ['35', '36', '5'], officialMatching: false, latitude: 35.8242, longitude: 127.1480, latitudeDelta: 2.0, longitudeDelta: 2.0 },
  { id: 'GYEONGSANG', label: '경상온', code: '37', name: '경상권', areaCodes: ['37', '38', '4', '6', '7'], officialMatching: false, latitude: 35.8714, longitude: 128.6014, latitudeDelta: 2.2, longitudeDelta: 2.2 },
  { id: 'JEJU', label: '제주온', code: '39', name: '제주특별자치도', areaCodes: ['39'], officialMatching: false, latitude: 33.4996, longitude: 126.5312, latitudeDelta: 0.7, longitudeDelta: 0.7 },
];

export function regionById(id?: string) {
  return REGION_PRESETS.find((item) => item.id === id) ?? REGION_PRESETS[0];
}

export function couponTypeForRegion(id?: string): CouponKind {
  return regionById(id).officialMatching ? 'OFFICIAL' : 'SELF';
}

function fest(
  id: string,
  title: string,
  city: string,
  lat: number,
  lng: number,
  start: string,
  end: string,
  category: string,
): HomeFestival {
  return {
    id,
    contentId: id,
    contentTypeId: '15',
    title,
    location_name: city,
    latitude: lat,
    longitude: lng,
    start_date: start,
    end_date: end,
    municipality_name: city.split(' ')[0],
    category,
    image_url: null,
    is_trending: true,
    source: 'gov',
  };
}

export const REGION_FESTIVAL_FALLBACKS: Record<string, HomeFestival[]> = {
  GANGWON: [
    fest('gw-1', '춘천마임축제', '강원특별자치도 춘천시', 37.8813, 127.7300, '2026-05-21', '2026-05-31', '공연'),
    fest('gw-2', '강릉커피축제', '강원특별자치도 강릉시', 37.7519, 128.8761, '2026-10-02', '2026-10-06', '먹거리'),
    fest('gw-3', '평창효석문화제', '강원특별자치도 평창군', 37.5090, 128.4280, '2026-09-04', '2026-09-07', '문화/예술'),
    fest('gw-4', '속초해변축제', '강원특별자치도 속초시', 38.2070, 128.5918, '2026-07-24', '2026-07-27', '가족'),
  ],
  SEOUL: [
    fest('su-1', '서울거리예술축제', '서울특별시 종로구', 37.5720, 126.9769, '2026-09-26', '2026-10-04', '공연'),
    fest('su-2', '서울빛초롱축제', '서울특별시 중구', 37.5694, 126.9783, '2026-12-12', '2027-01-04', '계절축제'),
  ],
  INCHEON: [
    fest('ic-1', '인천펜타포트락페스티벌', '인천광역시 연수구', 37.3890, 126.6430, '2026-08-07', '2026-08-09', '공연'),
    fest('ic-2', '강화고인돌문화축제', '인천광역시 강화군', 37.7460, 126.4880, '2026-10-10', '2026-10-12', '체험'),
  ],
  CHUNGCHEONG: [
    fest('cc-1', '청주직지축제', '충청북도 청주시', 36.6424, 127.4890, '2026-09-03', '2026-09-07', '문화/예술'),
    fest('cc-2', '보령머드축제', '충청남도 보령시', 36.3330, 126.6120, '2026-07-17', '2026-07-26', '체험'),
  ],
  JEOLLA: [
    fest('jl-1', '전주한지문화축제', '전북특별자치도 전주시', 35.8150, 127.1530, '2026-05-01', '2026-05-05', '문화/예술'),
    fest('jl-2', '여수밤바다불꽃축제', '전라남도 여수시', 34.7604, 127.6622, '2026-10-31', '2026-11-01', '공연'),
  ],
  GYEONGSANG: [
    fest('gs-1', '진주남강유등축제', '경상남도 진주시', 35.1800, 128.1080, '2026-10-01', '2026-10-12', '문화/예술'),
    fest('gs-2', '경주벚꽃축제', '경상북도 경주시', 35.8562, 129.2247, '2026-04-03', '2026-04-12', '계절축제'),
    fest('gs-3', '부산불꽃축제', '부산광역시 수영구', 35.1530, 129.1180, '2026-10-24', '2026-10-25', '공연'),
  ],
  JEJU: [
    fest('jj-1', '제주들불축제', '제주특별자치도 제주시', 33.4590, 126.5170, '2026-03-06', '2026-03-09', '계절축제'),
    fest('jj-2', '서귀포칠십리축제', '제주특별자치도 서귀포시', 33.2530, 126.5600, '2026-10-09', '2026-10-12', '문화/예술'),
  ],
};

export function fallbackPromotions(metro: string): HomePromotion[] {
  const official = couponTypeForRegion(metro) === 'OFFICIAL';
  const festivals = REGION_FESTIVAL_FALLBACKS[metro] ?? [];
  return festivals.slice(0, 2).map((item, index) => ({
    id: `self-${metro}-${index}`,
    title: `${item.title} 제휴 할인`,
    festival_id: item.id,
    festival_title: item.title,
    business_name: `${item.municipality_name} 상생가게`,
    merchant_discount_rate: official ? 10 : 15,
    gov_matching_rate: official ? 10 : 0,
    total_discount_rate: official ? 20 : 15,
    remaining_quantity: 80,
    funding_type: official ? 'MATCHED' : 'MERCHANT_ONLY',
    coupon_type: official ? 'OFFICIAL' : 'SELF',
    metro,
    municipality_name: item.municipality_name,
    address: item.location_name,
    latitude: item.latitude,
    longitude: item.longitude,
  }));
}
