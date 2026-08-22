export const METRO_REGIONS = [
  { id: 'GYEONGGI', label: '경기온', ready: true },
  { id: 'SEOUL', label: '서울온', ready: false },
  { id: 'GANGWON', label: '강원온', ready: false },
  { id: 'CHUNGCHEONG', label: '충청온', ready: false },
  { id: 'JEOLLA', label: '전라온', ready: false },
  { id: 'GYEONGSANG', label: '경상온', ready: false },
  { id: 'JEJU', label: '제주온', ready: false },
] as const;

export const FESTIVAL_CATEGORIES = [
  { id: '먹거리', icon: '🍜', label: '먹거리' },
  { id: '문화/예술', icon: '🎭', label: '문화/예술' },
  { id: '가족', icon: '👨‍👩‍👧', label: '가족' },
  { id: '계절축제', icon: '🌸', label: '계절축제' },
  { id: '플리마켓', icon: '🧺', label: '플리마켓' },
] as const;

export const COMING_SOON_MESSAGE = '해당 지역 서비스 준비 중입니다';
