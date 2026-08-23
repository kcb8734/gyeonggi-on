export interface MetroRegion {
  id: string;
  label: string;
  ready: boolean;
  covers: string;
  governments: string[];
}

export interface Locality {
  id: string;
  label: string;
  /** 시·군·구 이름에서 매칭할 토큰 */
  nameTokens: string[];
  /** 광역 접두 (중복 구 이름 구분). 하나라도 맞으면 통과 */
  areaTokens?: string[];
}

export const METRO_REGIONS: MetroRegion[] = [
  { id: 'GYEONGGI', label: '경기온', ready: true, covers: '경기도 31개 시·군', governments: ['경기도'] },
  { id: 'SEOUL', label: '서울온', ready: true, covers: '서울특별시 25개 자치구', governments: ['서울특별시'] },
  { id: 'INCHEON', label: '인천온', ready: true, covers: '인천광역시 8구 2군', governments: ['인천광역시'] },
  { id: 'GANGWON', label: '강원온', ready: true, covers: '강원특별자치도 18개 시·군', governments: ['강원특별자치도'] },
  { id: 'CHUNGCHEONG', label: '충청온', ready: true, covers: '충북·충남·세종·대전', governments: ['충청북도', '충청남도', '세종특별자치시', '대전광역시'] },
  { id: 'JEOLLA', label: '전라온', ready: true, covers: '전북·전남·광주', governments: ['전북특별자치도', '전라남도', '광주광역시'] },
  { id: 'GYEONGSANG', label: '경상온', ready: true, covers: '경북·경남·대구·울산·부산', governments: ['경상북도', '경상남도', '대구광역시', '울산광역시', '부산광역시'] },
  { id: 'JEJU', label: '제주온', ready: true, covers: '제주특별자치도 제주시·서귀포시', governments: ['제주특별자치도'] },
];

function city(name: string, area?: string, areaTokens?: string[]): Locality {
  const stripped = name.replace(/(시|군)$/, '');
  const nameTokens = name.endsWith('구') ? [name] : [stripped, name];
  return {
    id: area ? `${area}-${name}` : name,
    label: area ? `${area} ${name}` : name,
    nameTokens,
    areaTokens,
  };
}

function cities(names: string[], area?: string, areaTokens?: string[]): Locality[] {
  return names.map((name) => city(name, area, areaTokens));
}

export const METRO_LOCALITIES: Record<string, Locality[]> = {
  GYEONGGI: cities([
    '수원시', '용인시', '고양시', '화성시', '성남시', '부천시', '남양주시', '안산시',
    '안양시', '평택시', '시흥시', '파주시', '김포시', '의정부시', '광주시', '하남시',
    '광명시', '군포시', '오산시', '이천시', '양주시', '구리시', '안성시', '포천시',
    '의왕시', '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군',
  ]),
  SEOUL: cities([
    '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구',
    '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구',
    '구로구', '금천구', '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구',
  ], undefined, ['서울']),
  INCHEON: cities([
    '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군',
  ], '인천', ['인천']),
  GANGWON: cities([
    '춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시',
    '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군',
    '양구군', '인제군', '고성군', '양양군',
  ]),
  CHUNGCHEONG: [
    ...cities(['동구', '중구', '서구', '유성구', '대덕구'], '대전', ['대전']),
    city('세종시', undefined, ['세종']),
    ...cities(
      ['청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
      '충북',
      ['충북', '충청북'],
    ),
    ...cities(
      ['천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
      '충남',
      ['충남', '충청남'],
    ),
  ],
  JEOLLA: [
    ...cities(['동구', '서구', '남구', '북구', '광산구'], '광주', ['광주']),
    ...cities(
      ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
      '전북',
      ['전북', '전라북'],
    ),
    ...cities(
      ['목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
      '전남',
      ['전남', '전라남'],
    ),
  ],
  GYEONGSANG: [
    ...cities(['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'], '대구', ['대구']),
    ...cities(['중구', '남구', '동구', '북구', '울주군'], '울산', ['울산']),
    ...cities(
      ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
      '부산',
      ['부산'],
    ),
    ...cities(
      ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
      '경북',
      ['경북', '경상북'],
    ),
    ...cities(
      ['창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
      '경남',
      ['경남', '경상남'],
    ),
  ],
  JEJU: cities(['제주시', '서귀포시']),
};

export const FESTIVAL_CATEGORIES = [
  { id: '먹거리', icon: '🍜', label: '먹거리' },
  { id: '체험', icon: '🎟️', label: '체험' },
  { id: '공연', icon: '🎤', label: '공연' },
  { id: '문화/예술', icon: '🎭', label: '문화예술' },
  { id: '가족', icon: '👨‍👩‍👧', label: '가족' },
  { id: '계절축제', icon: '🌸', label: '계절축제' },
  { id: '플리마켓', icon: '🧺', label: '플리마켓' },
] as const;

export const GYEONGGI_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
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
};

export const COMING_SOON_MESSAGE = '해당 지역 서비스 준비 중입니다';

export function getLocalities(metroId: string): Locality[] {
  return [...(METRO_LOCALITIES[metroId] ?? [])].sort((a, b) => a.label.localeCompare(b.label, 'ko'));
}

export function localityMatches(haystack: string, locality: Locality | null): boolean {
  if (!locality) return true;
  const hay = haystack;
  const hasName = locality.nameTokens.some((token) => hay.includes(token));
  if (!hasName) return false;
  if (!locality.areaTokens?.length) return true;
  return locality.areaTokens.some((token) => hay.includes(token));
}
