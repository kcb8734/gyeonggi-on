const FESTIVAL_TYPE = '15';

const HERO = {
  hwaseong: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=1200&q=80',
  folk: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80',
  jazz: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
  food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80',
  flea: 'https://images.unsplash.com/photo-1515165562839-978bbcf01262?w=1200&q=80',
  lotus: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80',
};

export interface FallbackFestival {
  contentId: string;
  contentTypeId: string;
  title: string;
  address: string;
  eventStartDate: string;
  eventEndDate: string;
  firstImage?: string;
  firstImage2?: string;
  mapX: number;
  mapY: number;
  tel?: string;
  category: '먹거리' | '체험' | '공연' | '문화/예술' | '가족' | '계절축제' | '플리마켓';
  overview?: string;
  fee?: string;
  eventPlace?: string;
}

export const FALLBACK_FESTIVALS: FallbackFestival[] = [
  {
    contentId: '1000001',
    contentTypeId: FESTIVAL_TYPE,
    title: '수원화성문화제',
    address: '경기도 수원시 팔달구 정조로 825',
    eventStartDate: '2026-08-19',
    eventEndDate: '2026-09-21',
    firstImage: HERO.hwaseong,
    firstImage2: HERO.hwaseong,
    mapX: 127.013,
    mapY: 37.287,
    tel: '031-228-3675',
    category: '문화/예술',
    overview: '세계유산 수원화성을 무대로 펼쳐지는 야간 퍼레이드와 전통 공연, 행궁 야행 프로그램이 이어집니다.',
    fee: '무료 (일부 유료 공연)',
    eventPlace: '화성행궁·행궁광장',
  },
  {
    contentId: '1000002',
    contentTypeId: FESTIVAL_TYPE,
    title: '용인 한국민속촌 축제',
    address: '경기도 용인시 기흥구 민속촌로 90',
    eventStartDate: '2026-08-21',
    eventEndDate: '2026-09-11',
    firstImage: HERO.folk,
    firstImage2: HERO.folk,
    mapX: 127.117,
    mapY: 37.259,
    tel: '031-288-0000',
    category: '가족',
    overview: '전통 가옥과 장터 체험, 가족 공연이 하루 종일 이어지는 용인 대표 가족 축제입니다.',
    fee: '입장권 별도 · 공연 무료',
    eventPlace: '한국민속촌',
  },
  {
    contentId: '1000003',
    contentTypeId: FESTIVAL_TYPE,
    title: '가평 자라섬 재즈페스티벌',
    address: '경기도 가평군 가평읍 자라섬로 60',
    eventStartDate: '2026-08-22',
    eventEndDate: '2026-09-05',
    firstImage: HERO.jazz,
    firstImage2: HERO.jazz,
    mapX: 127.513,
    mapY: 37.823,
    tel: '031-582-0174',
    category: '계절축제',
    overview: '북한강 위 자라섬에서 열리는 국내 대표 재즈 페스티벌. 선셋 무대와 푸드존이 함께합니다.',
    fee: '일권 55,000원 / 현장 문의',
    eventPlace: '자라섬 특설무대',
  },
  {
    contentId: '1000004',
    contentTypeId: FESTIVAL_TYPE,
    title: '수원 영동시장 먹거리 축제',
    address: '경기도 수원시 팔달구 수원천로 259',
    eventStartDate: '2026-08-20',
    eventEndDate: '2026-09-09',
    firstImage: HERO.food,
    firstImage2: HERO.food,
    mapX: 127.0168,
    mapY: 37.2762,
    tel: '031-241-1101',
    category: '먹거리',
    overview: '영동시장 골목 상인과 함께하는 먹거리 축제. 온앤온 상생 쿠폰으로 꼬치·분식을 할인받을 수 있습니다.',
    fee: '메뉴별 상이 · 쿠폰 적용가',
    eventPlace: '수원 영동시장',
  },
  {
    contentId: '1000005',
    contentTypeId: FESTIVAL_TYPE,
    title: '용인 플리마켓 위크',
    address: '경기도 용인시 기흥구 광구대로 20',
    eventStartDate: '2026-08-22',
    eventEndDate: '2026-09-01',
    firstImage: HERO.flea,
    firstImage2: HERO.flea,
    mapX: 127.1148,
    mapY: 37.2755,
    tel: '031-324-2114',
    category: '플리마켓',
    overview: '빈티지·수공예 셀러가 모이는 용인 야외 플리마켓. 현장 피드 작성 시 지자체 매칭 포인트가 적립됩니다.',
    fee: '무료',
    eventPlace: '기흥구청 광장',
  },
  {
    contentId: '1000006',
    contentTypeId: FESTIVAL_TYPE,
    title: '양평 세미원 연꽃문화제',
    address: '경기도 양평군 양서면 양수로 93',
    eventStartDate: '2026-08-01',
    eventEndDate: '2026-08-31',
    firstImage: HERO.lotus,
    firstImage2: HERO.lotus,
    mapX: 127.3705,
    mapY: 37.5411,
    tel: '031-775-1834',
    category: '계절축제',
    overview: '두물머리 세미원에서 만개한 연꽃을 감상하고 야간 조명을 즐기는 여름 대표 축제입니다.',
    fee: '성인 8,000원',
    eventPlace: '세미원',
  },
];

export function filterFallbackFestivals(params: {
  month?: number;
  year?: number;
  category?: string;
}): FallbackFestival[] {
  const year = params.year ?? new Date().getFullYear();
  return FALLBACK_FESTIVALS.filter((item) => {
    if (params.category && item.category !== params.category) return false;
    if (!params.month) return true;
    const start = item.eventStartDate.replace(/\D/g, '');
    const end = (item.eventEndDate || item.eventStartDate).replace(/\D/g, '');
    const monthStart = `${year}${String(params.month).padStart(2, '0')}01`;
    const last = new Date(year, params.month, 0).getDate();
    const monthEnd = `${year}${String(params.month).padStart(2, '0')}${String(last).padStart(2, '0')}`;
    return start <= monthEnd && end >= monthStart;
  });
}

export function findFallbackFestival(contentId?: string): FallbackFestival {
  return FALLBACK_FESTIVALS.find((item) => item.contentId === contentId) ?? FALLBACK_FESTIVALS[0];
}
