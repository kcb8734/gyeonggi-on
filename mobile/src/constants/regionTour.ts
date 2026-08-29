import type { HomeFestival, HomePromotion } from '../types/home';
import { festivalImageFor, shopPhotosFor } from './regionMedia';
import { METRO_REGIONS, normalizeMetroId } from './regions';
import { secureMediaUrl } from '../utils/mediaUrl';

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
  { id: 'SEOUL', label: '서울온', code: '1', name: '서울특별시', areaCodes: ['1'], officialMatching: false, latitude: 37.5665, longitude: 126.9780, latitudeDelta: 0.35, longitudeDelta: 0.35 },
  { id: 'BUSAN', label: '부산온', code: '6', name: '부산광역시', areaCodes: ['6'], officialMatching: false, latitude: 35.1796, longitude: 129.0756, latitudeDelta: 0.45, longitudeDelta: 0.45 },
  { id: 'DAEGU', label: '대구온', code: '4', name: '대구광역시', areaCodes: ['4'], officialMatching: false, latitude: 35.8714, longitude: 128.6014, latitudeDelta: 0.4, longitudeDelta: 0.4 },
  { id: 'INCHEON', label: '인천온', code: '2', name: '인천광역시', areaCodes: ['2'], officialMatching: false, latitude: 37.4563, longitude: 126.7052, latitudeDelta: 0.45, longitudeDelta: 0.45 },
  { id: 'GWANGJU', label: '광주온', code: '5', name: '광주광역시', areaCodes: ['5'], officialMatching: false, latitude: 35.1595, longitude: 126.8526, latitudeDelta: 0.35, longitudeDelta: 0.35 },
  { id: 'DAEJEON', label: '대전온', code: '3', name: '대전광역시', areaCodes: ['3'], officialMatching: false, latitude: 36.3504, longitude: 127.3845, latitudeDelta: 0.35, longitudeDelta: 0.35 },
  { id: 'ULSAN', label: '울산온', code: '7', name: '울산광역시', areaCodes: ['7'], officialMatching: false, latitude: 35.5384, longitude: 129.3114, latitudeDelta: 0.4, longitudeDelta: 0.4 },
  { id: 'SEJONG', label: '세종온', code: '8', name: '세종특별자치시', areaCodes: ['8'], officialMatching: false, latitude: 36.4800, longitude: 127.2890, latitudeDelta: 0.35, longitudeDelta: 0.35 },
  { id: 'GYEONGGI', label: '경기온', code: '31', name: '경기도', areaCodes: ['31'], officialMatching: true, latitude: 37.4138, longitude: 127.5183, latitudeDelta: 1.6, longitudeDelta: 1.6 },
  { id: 'GANGWON', label: '강원온', code: '32', name: '강원특별자치도', areaCodes: ['32'], officialMatching: false, latitude: 37.8228, longitude: 128.1555, latitudeDelta: 1.8, longitudeDelta: 1.8 },
  { id: 'CHUNGBUK', label: '충북온', code: '33', name: '충청북도', areaCodes: ['33'], officialMatching: false, latitude: 36.6357, longitude: 127.4914, latitudeDelta: 1.1, longitudeDelta: 1.1 },
  { id: 'CHUNGNAM', label: '충남온', code: '34', name: '충청남도', areaCodes: ['34'], officialMatching: false, latitude: 36.5184, longitude: 126.8000, latitudeDelta: 1.2, longitudeDelta: 1.2 },
  { id: 'JEONBUK', label: '전북온', code: '35', name: '전북특별자치도', areaCodes: ['35'], officialMatching: false, latitude: 35.7175, longitude: 127.1530, latitudeDelta: 1.2, longitudeDelta: 1.2 },
  { id: 'JEONNAM', label: '전남온', code: '36', name: '전라남도', areaCodes: ['36'], officialMatching: false, latitude: 34.8161, longitude: 126.4629, latitudeDelta: 1.6, longitudeDelta: 1.6 },
  { id: 'GYEONGBUK', label: '경북온', code: '37', name: '경상북도', areaCodes: ['37'], officialMatching: false, latitude: 36.4919, longitude: 128.8889, latitudeDelta: 1.6, longitudeDelta: 1.6 },
  { id: 'GYEONGNAM', label: '경남온', code: '38', name: '경상남도', areaCodes: ['38'], officialMatching: false, latitude: 35.4606, longitude: 128.2132, latitudeDelta: 1.4, longitudeDelta: 1.4 },
  { id: 'JEJU', label: '제주온', code: '39', name: '제주특별자치도', areaCodes: ['39'], officialMatching: false, latitude: 33.4996, longitude: 126.5312, latitudeDelta: 0.7, longitudeDelta: 0.7 },
];

export function regionById(id?: string) {
  const key = normalizeMetroId(id);
  return REGION_PRESETS.find((item) => item.id === key || item.id === id || item.code === id) ?? REGION_PRESETS.find((item) => item.id === 'GYEONGGI')!;
}

export function regionByAreaCode(areaCode?: string) {
  return REGION_PRESETS.find((item) => item.areaCodes.includes(String(areaCode || ''))) ?? REGION_PRESETS.find((item) => item.id === 'GYEONGGI')!;
}

export const ALL_TOUR_AREA_CODES = METRO_REGIONS.map((item) => item.tourAreaCode);

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
  metro: string,
  description?: string,
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
    municipality_name: city.split(' ').pop()?.replace(/(광역시|특별시|특별자치도|도)$/, '') || city,
    category,
    image_url: festivalImageFor(title, city, metro),
    is_trending: true,
    source: 'gov',
    description: description ?? `${title} 현장 프로그램과 인근 전통시장·캠핑을 On&On+ 추천코스로 이을 수 있습니다.`,
    regionalZone: metro,
    metro,
  };
}

export const REGION_FESTIVAL_FALLBACKS: Record<string, HomeFestival[]> = {
  GYEONGGI: [
    fest('gg-1', '수원화성문화제', '경기도 수원시', 37.287, 127.013, '2026-08-19', '2026-09-21', '문화/예술', 'GYEONGGI', '세계유산 수원화성을 무대로 펼쳐지는 야간 퍼레이드와 전통 공연, 행궁 야행 프로그램이 이어집니다.'),
    fest('gg-2', '용인 한국민속촌 축제', '경기도 용인시', 37.259, 127.117, '2026-08-21', '2026-09-11', '가족', 'GYEONGGI', '전통 가옥과 장터 체험, 가족 공연이 하루 종일 이어지는 용인 대표 가족 축제입니다.'),
    fest('gg-3', '가평 자라섬 재즈페스티벌', '경기도 가평군', 37.823, 127.513, '2026-08-22', '2026-09-05', '계절축제', 'GYEONGGI', '북한강 위 자라섬에서 열리는 국내 대표 재즈 페스티벌. 선셋 무대와 푸드존이 함께합니다.'),
    fest('gg-4', '수원 영동시장 먹거리 축제', '경기도 수원시', 37.2762, 127.0168, '2026-08-20', '2026-09-09', '먹거리', 'GYEONGGI', '영동시장 골목 상인과 함께하는 먹거리 축제입니다.'),
    fest('gg-5', '용인 플리마켓 위크', '경기도 용인시', 37.2755, 127.1148, '2026-08-22', '2026-09-01', '플리마켓', 'GYEONGGI', '빈티지·수공예 셀러가 모이는 용인 야외 플리마켓입니다.'),
    fest('gg-6', '파주 장단콩축제', '경기도 파주시', 37.889, 126.758, '2026-11-14', '2026-11-16', '먹거리', 'GYEONGGI'),
    fest('gg-7', '이천쌀문화축제', '경기도 이천시', 37.272, 127.443, '2026-10-22', '2026-10-26', '가족', 'GYEONGGI'),
    fest('gg-8', '안산 국제거리극축제', '경기도 안산시', 37.321, 126.831, '2026-05-15', '2026-05-18', '공연', 'GYEONGGI'),
    fest('gg-9', '양평 세미원 연꽃문화제', '경기도 양평군', 37.5411, 127.3705, '2026-08-01', '2026-08-31', '계절축제', 'GYEONGGI'),
    fest('gg-10', '고양국제꽃박람회', '경기도 고양시', 37.674, 126.767, '2026-04-24', '2026-05-10', '가족', 'GYEONGGI'),
  ],
  GANGWON: [
    fest('gw-1', '춘천마임축제', '강원특별자치도 춘천시', 37.8813, 127.7300, '2026-05-21', '2026-05-31', '공연', 'GANGWON'),
    fest('gw-2', '강릉커피축제', '강원특별자치도 강릉시', 37.7519, 128.8761, '2026-10-02', '2026-10-06', '먹거리', 'GANGWON'),
    fest('gw-3', '평창효석문화제', '강원특별자치도 평창군', 37.5090, 128.4280, '2026-09-04', '2026-09-07', '문화/예술', 'GANGWON'),
    fest('gw-4', '속초해변축제', '강원특별자치도 속초시', 38.2070, 128.5918, '2026-07-24', '2026-07-27', '가족', 'GANGWON'),
    fest('gw-5', '화천산천어축제', '강원특별자치도 화천군', 38.106, 127.708, '2026-01-10', '2026-02-01', '체험', 'GANGWON'),
    fest('gw-6', '정선아리랑제', '강원특별자치도 정선군', 37.381, 128.661, '2026-09-18', '2026-09-21', '문화/예술', 'GANGWON'),
  ],
  SEOUL: [
    fest('su-1', '서울거리예술축제', '서울특별시 종로구', 37.5720, 126.9769, '2026-09-26', '2026-10-04', '공연', 'SEOUL'),
    fest('su-2', '서울빛초롱축제', '서울특별시 중구', 37.5694, 126.9783, '2026-12-12', '2027-01-04', '계절축제', 'SEOUL'),
    fest('su-3', '중랑 서울장미축제', '서울특별시 중랑구', 37.6060, 127.0930, '2026-05-16', '2026-05-25', '가족', 'SEOUL'),
    fest('su-4', '한강몽땅 여름축제', '서울특별시 영등포구', 37.5270, 126.9340, '2026-07-25', '2026-08-10', '가족', 'SEOUL'),
    fest('su-5', '서울드럼페스티벌', '서울특별시 종로구', 37.572, 126.977, '2026-10-02', '2026-10-04', '공연', 'SEOUL'),
    fest('su-6', '서울억새축제', '서울특별시 마포구', 37.568, 126.884, '2026-10-10', '2026-10-19', '계절축제', 'SEOUL'),
  ],
  INCHEON: [
    fest('ic-1', '인천펜타포트락페스티벌', '인천광역시 연수구', 37.3890, 126.6430, '2026-08-07', '2026-08-09', '공연', 'INCHEON'),
    fest('ic-2', '강화고인돌문화축제', '인천광역시 강화군', 37.7460, 126.4880, '2026-10-10', '2026-10-12', '체험', 'INCHEON'),
    fest('ic-3', '인천개항장문화재야행', '인천광역시 중구', 37.4728, 126.6219, '2026-10-17', '2026-10-18', '문화/예술', 'INCHEON'),
    fest('ic-4', '부평풍물대축제', '인천광역시 부평구', 37.489, 126.722, '2026-09-18', '2026-09-20', '공연', 'INCHEON'),
  ],
  CHUNGBUK: [
    fest('cb-1', '청주직지축제', '충청북도 청주시', 36.6424, 127.4890, '2026-09-03', '2026-09-07', '문화/예술', 'CHUNGBUK'),
    fest('cb-2', '단양마늘축제', '충청북도 단양군', 36.985, 128.366, '2026-09-11', '2026-09-13', '먹거리', 'CHUNGBUK'),
    fest('cb-3', '제천한방바이오축제', '충청북도 제천시', 37.132, 128.191, '2026-09-18', '2026-09-21', '체험', 'CHUNGBUK'),
    fest('cb-4', '충주호 벚꽃축제', '충청북도 충주시', 37.007, 127.928, '2026-04-04', '2026-04-12', '계절축제', 'CHUNGBUK'),
  ],
  CHUNGNAM: [
    fest('cn-1', '보령머드축제', '충청남도 보령시', 36.3330, 126.6120, '2026-07-17', '2026-07-26', '체험', 'CHUNGNAM', '대천해수욕장 머드광장에서 머드 체험·퍼레이드·해변 공연이 이어지는 보령 대표 여름 축제입니다.'),
    fest('cn-2', '부여서동연꽃축제', '충청남도 부여군', 36.2750, 126.9120, '2026-07-04', '2026-07-12', '계절축제', 'CHUNGNAM'),
    fest('cn-3', '공주 밤축제', '충청남도 공주시', 36.451, 127.119, '2026-10-02', '2026-10-05', '먹거리', 'CHUNGNAM'),
    fest('cn-4', '태안 세계튤립축제', '충청남도 태안군', 36.672, 126.297, '2026-04-10', '2026-04-26', '가족', 'CHUNGNAM'),
  ],
  DAEJEON: [
    fest('dj-1', '대전 0시 축제', '대전광역시 중구', 36.3280, 127.4270, '2026-08-08', '2026-08-11', '공연', 'DAEJEON'),
    fest('dj-2', '대전사이언스페스티벌', '대전광역시 유성구', 36.377, 127.388, '2026-08-14', '2026-08-16', '가족', 'DAEJEON'),
    fest('dj-3', '성심당 빵축제', '대전광역시 중구', 36.327, 127.426, '2026-09-11', '2026-09-13', '먹거리', 'DAEJEON'),
  ],
  SEJONG: [
    fest('sj-1', '세종축제', '세종특별자치시', 36.4800, 127.2890, '2026-10-10', '2026-10-12', '가족', 'SEJONG'),
    fest('sj-2', '세종 옥녀봉 해맞이', '세종특별자치시', 36.447, 127.284, '2026-01-01', '2026-01-01', '계절축제', 'SEJONG'),
    fest('sj-3', '세종정원페스티벌', '세종특별자치시', 36.480, 127.280, '2026-05-02', '2026-05-05', '가족', 'SEJONG'),
  ],
  JEONBUK: [
    fest('jb-1', '전주한지문화축제', '전북특별자치도 전주시', 35.8150, 127.1530, '2026-05-01', '2026-05-05', '문화/예술', 'JEONBUK'),
    fest('jb-2', '전주비빔밥축제', '전북특별자치도 전주시', 35.815, 127.152, '2026-10-09', '2026-10-12', '먹거리', 'JEONBUK'),
    fest('jb-3', '남원춘향제', '전북특별자치도 남원시', 35.416, 127.390, '2026-05-05', '2026-05-09', '문화/예술', 'JEONBUK'),
    fest('jb-4', '무주반딧불축제', '전북특별자치도 무주군', 35.863, 127.661, '2026-06-12', '2026-06-21', '계절축제', 'JEONBUK'),
  ],
  JEONNAM: [
    fest('jn-1', '여수밤바다불꽃축제', '전라남도 여수시', 34.7604, 127.6622, '2026-10-31', '2026-11-01', '공연', 'JEONNAM'),
    fest('jn-2', '순천만갈대축제', '전라남도 순천시', 34.8860, 127.5090, '2026-10-24', '2026-11-02', '계절축제', 'JEONNAM'),
    fest('jn-3', '보성차밭빛축제', '전라남도 보성군', 34.763, 127.080, '2026-12-05', '2027-01-04', '계절축제', 'JEONNAM'),
    fest('jn-4', '목포항구축제', '전라남도 목포시', 34.794, 126.392, '2026-08-07', '2026-08-09', '공연', 'JEONNAM'),
  ],
  GWANGJU: [
    fest('gj-1', '광주김치축제', '광주광역시 서구', 35.1595, 126.8526, '2026-10-23', '2026-10-27', '먹거리', 'GWANGJU'),
    fest('gj-2', '광주비엔날레 시민축제', '광주광역시 북구', 35.183, 126.890, '2026-09-04', '2026-11-29', '문화/예술', 'GWANGJU'),
    fest('gj-3', '충장축제', '광주광역시 동구', 35.146, 126.917, '2026-10-02', '2026-10-06', '공연', 'GWANGJU'),
  ],
  GYEONGBUK: [
    fest('gb-1', '경주벚꽃축제', '경상북도 경주시', 35.8562, 129.2247, '2026-04-03', '2026-04-12', '계절축제', 'GYEONGBUK'),
    fest('gb-2', '안동국제탈춤페스티벌', '경상북도 안동시', 36.568, 128.729, '2026-09-25', '2026-10-04', '공연', 'GYEONGBUK'),
    fest('gb-3', '포항국제불빛축제', '경상북도 포항시', 36.056, 129.379, '2026-05-29', '2026-06-07', '공연', 'GYEONGBUK'),
    fest('gb-4', '울릉도오징어축제', '경상북도 울릉군', 37.484, 130.905, '2026-08-14', '2026-08-16', '먹거리', 'GYEONGBUK'),
  ],
  GYEONGNAM: [
    fest('gn-1', '진주남강유등축제', '경상남도 진주시', 35.1800, 128.1080, '2026-10-01', '2026-10-12', '문화/예술', 'GYEONGNAM'),
    fest('gn-2', '통영한산대첩축제', '경상남도 통영시', 34.854, 128.425, '2026-08-10', '2026-08-15', '문화/예술', 'GYEONGNAM'),
    fest('gn-3', '거제섬꽃축제', '경상남도 거제시', 34.888, 128.621, '2026-04-10', '2026-04-19', '계절축제', 'GYEONGNAM'),
    fest('gn-4', '하동 야생차문화축제', '경상남도 하동군', 35.190, 127.634, '2026-05-01', '2026-05-04', '체험', 'GYEONGNAM'),
  ],
  BUSAN: [
    fest('bs-1', '부산불꽃축제', '부산광역시 수영구', 35.1530, 129.1180, '2026-10-24', '2026-10-25', '공연', 'BUSAN'),
    fest('bs-2', '부산바다축제', '부산광역시 해운대구', 35.158, 129.160, '2026-08-01', '2026-08-10', '가족', 'BUSAN'),
    fest('bs-3', '자갈치축제', '부산광역시 중구', 35.097, 129.026, '2026-10-08', '2026-10-12', '먹거리', 'BUSAN'),
    fest('bs-4', '부산국제영화제 거리축제', '부산광역시 해운대구', 35.171, 129.127, '2026-10-02', '2026-10-11', '문화/예술', 'BUSAN'),
  ],
  DAEGU: [
    fest('dg-1', '대구치맥페스티벌', '대구광역시 수성구', 35.8290, 128.6940, '2026-07-24', '2026-07-28', '먹거리', 'DAEGU'),
    fest('dg-2', '대구컬러풀페스티벌', '대구광역시 중구', 35.871, 128.595, '2026-05-29', '2026-05-31', '공연', 'DAEGU'),
    fest('dg-3', '대구약령시한방문화축제', '대구광역시 중구', 35.868, 128.590, '2026-05-08', '2026-05-10', '체험', 'DAEGU'),
  ],
  ULSAN: [
    fest('us-1', '울산고래축제', '울산광역시 남구', 35.5040, 129.4300, '2026-05-22', '2026-05-25', '가족', 'ULSAN'),
    fest('us-2', '태화강 봄꽃축제', '울산광역시 중구', 35.550, 129.329, '2026-04-04', '2026-04-12', '계절축제', 'ULSAN'),
    fest('us-3', '울산공업축제', '울산광역시 남구', 35.538, 129.338, '2026-10-09', '2026-10-12', '문화/예술', 'ULSAN'),
  ],
  JEJU: [
    fest('jj-1', '제주들불축제', '제주특별자치도 제주시', 33.4590, 126.5170, '2026-03-06', '2026-03-09', '계절축제', 'JEJU'),
    fest('jj-2', '서귀포칠십리축제', '제주특별자치도 서귀포시', 33.2530, 126.5600, '2026-10-09', '2026-10-12', '문화/예술', 'JEJU'),
    fest('jj-3', '제주유채꽃축제', '제주특별자치도 제주시', 33.3890, 126.2390, '2026-04-04', '2026-04-13', '가족', 'JEJU'),
    fest('jj-4', '제주말축제', '제주특별자치도 제주시', 33.508, 126.670, '2026-10-02', '2026-10-05', '체험', 'JEJU'),
  ],
};

const SHOP_HINTS: Array<{ token: string; shop: string; menu: string; features: string; kind: 'food' | 'cafe' | 'market' | 'night' }> = [
  { token: '마임', shop: '춘천 중앙시장 닭갈비', menu: '숯불닭갈비, 막국수, 감자전', features: '축제장에서 5분, 당일 손질 닭고기', kind: 'food' },
  { token: '커피', shop: '안목해변 커피거리', menu: '핸드드립, 강릉커피빵, 흑임자라떼', features: '경포·안목 해변 테라스 좌석', kind: 'cafe' },
  { token: '효석', shop: '봉평 메밀막국수', menu: '메밀막국수, 메밀전, 감자전', features: '이효석 생가 인근 메밀 전문', kind: 'food' },
  { token: '속초', shop: '속초관광수산시장', menu: '오징어순대, 닭강정, 회덮밥', features: '축제 해변과 이어지는 수산시장 골목', kind: 'market' },
  { token: '거리예술', shop: '광장시장 빈대떡', menu: '녹두빈대떡, 마약김밥, 육회', features: '청계천·종로 축제 동선에 붙은 노포', kind: 'market' },
  { token: '빛초롱', shop: '을지로 야행 포차', menu: '김치전, 막걸리, 오뎅탕', features: '청계천 초롱 야경이 보이는 골목', kind: 'night' },
  { token: '장미', shop: '중랑 장미정원 카페', menu: '장미에이드, 소금빵, 수제청', features: '장미축제장 입구 테라스', kind: 'cafe' },
  { token: '한강', shop: '여의도 한강 포장마차', menu: '닭꼬치, 맥주, 오뎅', features: '몽땅축제 메인 무대 옆 푸드존', kind: 'food' },
  { token: '펜타포트', shop: '송도 락페 푸드트럭', menu: '수제버거, 맥주, 나초', features: '달빛축제공원 공연장 앞', kind: 'food' },
  { token: '고인돌', shop: '강화 중앙시장', menu: '순무김치, 밴댕이회, 인삼약과', features: '고인돌 공원에서 차로 15분', kind: 'market' },
  { token: '개항장', shop: '신포국제시장 닭강정', menu: '양념닭강정, 짜장면, 공갈빵', features: '개항장 거리와 이어지는 시장 골목', kind: 'market' },
  { token: '직지', shop: '육거리시장 순대국', menu: '순대국밥, 칼국수, 튀김', features: '고인쇄박물관에서 도보 10분', kind: 'food' },
  { token: '머드', shop: '대천항 조개구이', menu: '조개구이, 해물라면, 모듬회', features: '머드 광장에서 가까운 항 포차', kind: 'food' },
  { token: '서동', shop: '부여 연꽃밥집', menu: '연잎밥, 한우구이, 버섯전골', features: '궁남지 연꽃단지 앞 한정식', kind: 'food' },
  { token: '한지', shop: '전주 남부시장 야시장', menu: '초코파이, 문어꼬치, 막걸리', features: '한옥마을·한지축제장과 이어지는 야시장', kind: 'market' },
  { token: '밤바다', shop: '여수 교동시장', menu: '서대회, 게장, 돌산갓김치', features: '밤바다 불꽃 관람 동선 위 시장', kind: 'market' },
  { token: '갈대', shop: '순천만 갈대밭 카페', menu: '꼬막비빔밥, 갈대빵, 쑥차', features: '정원 박람회장·갈대밭 입구', kind: 'cafe' },
  { token: '유등', shop: '진주중앙시장 비빔밥', menu: '진주비빔밥, 냉면, 육회', features: '남강 유등 산책로에서 5분', kind: 'food' },
  { token: '벚꽃', shop: '황리단길 황남빵', menu: '황남빵, 찰보리빵, 수정과', features: '대릉원 벚꽃길과 이어지는 빵집', kind: 'cafe' },
  { token: '부산불꽃', shop: '광안리 포장마차', menu: '회, 파전, 생맥주', features: '불꽃 관람석이 보이는 해변 포차', kind: 'night' },
  { token: '들불', shop: '동문재래시장', menu: '흑돼지, 오메기떡, 고기국수', features: '새별오름 들불 관람 후 이어지는 시장', kind: 'market' },
  { token: '칠십리', shop: '서귀포매일올레시장', menu: '갈치조림, 고기국수, 한라봉주스', features: '칠십리시공원에서 가까운 올레시장', kind: 'market' },
  { token: '유채', shop: '협재 해변 카페', menu: '한라봉에이드, 말차라떼, 오메기빵', features: '유채꽃 단지와 협재 에메랄드 해변 사이', kind: 'cafe' },
];

function shopHint(title: string) {
  return SHOP_HINTS.find((item) => title.includes(item.token)) ?? {
    shop: '축제 상생가게',
    menu: '지역 대표 메뉴',
    features: '축제장 인근 제휴 점포',
    kind: 'food' as const,
  };
}

export function fallbackPromotions(metro: string): HomePromotion[] {
  const zone = normalizeMetroId(metro);
  const official = couponTypeForRegion(zone) === 'OFFICIAL';
  const festivals = REGION_FESTIVAL_FALLBACKS[zone] ?? [];
  const item = festivals[0];
  if (!item) return [];
  const hint = shopHint(item.title);
  const photos = shopPhotosFor(hint.kind);
  const merchant = official ? 10 : 15;
  const gov = official ? 10 : 0;
  return [{
    id: `${official ? 'off' : 'self'}-${zone}-${item.id}`,
    title: `${item.title} 제휴 할인`,
    festival_id: item.id,
    festival_title: item.title,
    business_name: hint.shop,
    merchant_discount_rate: merchant,
    gov_matching_rate: gov,
    total_discount_rate: merchant + gov,
    remaining_quantity: 80,
    funding_type: official ? 'MATCHED' : 'MERCHANT_ONLY',
    coupon_type: official ? 'OFFICIAL' : 'SELF',
    metro: zone,
    municipality_name: item.municipality_name,
    address: item.location_name,
    latitude: item.latitude,
    longitude: item.longitude,
    main_menu: hint.menu,
    features: hint.features,
    exterior_image_url: photos.exterior_image_url,
    interior_image_url: photos.interior_image_url,
    gps_confirmed: true,
    is_sample: true,
  }];
}

export function findFallbackFestival(contentId?: string, title?: string): HomeFestival | undefined {
  const all = Object.values(REGION_FESTIVAL_FALLBACKS).flat();
  return all.find((item) =>
    item.id === contentId
    || item.contentId === contentId
    || (title && item.title === title)
    || (title && item.title.includes(title))
    || (title && title.includes(item.title)),
  );
}

export function withFestivalImage(festival: HomeFestival, metro?: string): HomeFestival {
  const zone = festival.regionalZone || festival.metro || metro;
  return {
    ...festival,
    regionalZone: festival.regionalZone ?? zone,
    metro: festival.metro ?? zone,
    image_url: secureMediaUrl(festival.image_url) || festivalImageFor(festival.title, festival.location_name, zone),
  };
}
