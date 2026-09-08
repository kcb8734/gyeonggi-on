export interface GyeonggiEventGuide {
  overview: string;
  homepage: string;
  homepageLabel: string;
}

const GUIDES: Array<{ tokens: string[]; ids?: string[]; guide: GyeonggiEventGuide }> = [
  {
    tokens: ['세미원', '연꽃문화제'],
    ids: ['semiwon-lotus'],
    guide: {
      overview:
        '양평 두물머리에 자리한 세미원에서 연꽃이 만개하는 한여름, 연꽃단지 산책과 수생식물 전시, 문화공연이 이어지는 경기도 대표 연꽃 축제입니다. 두물머리·세미원 연꽃길과 양평 전통시장을 한 동선으로 둘러볼 수 있으며, 공식 홈페이지에서 개장 시간·전시 프로그램·입장 안내를 확인할 수 있습니다.',
      homepage: 'https://www.semiwon.or.kr',
      homepageLabel: '세미원 공식 홈페이지',
    },
  },
  {
    tokens: ['수원화성문화제', '화성문화제'],
    ids: ['suwon-hwaseong', 'gg-1'],
    guide: {
      overview:
        '유네스코 세계유산 수원화성을 무대로 정조대왕 능행차 재현, 야간 퍼레이드, 행궁 야행과 전통 공연이 펼쳐지는 수원 대표 문화축제입니다. 화성행궁·장안문 일대에서 야간 조명을 배경으로 체험·공연 프로그램이 이어지며, 일정과 좌석 안내는 공식 페이지에서 확인할 수 있습니다.',
      homepage: 'https://www.swcf.or.kr',
      homepageLabel: '수원문화재단 홈페이지',
    },
  },
  {
    tokens: ['자라섬', '재즈페스티벌', '재즈페스티벌'],
    ids: ['gapyeong-jazz', 'gg-3'],
    guide: {
      overview:
        '북한강 위 가평 자라섬에서 열리는 국내 대표 재즈 페스티벌입니다. 선셋 무대와 강변 피크닉, 푸드존이 함께해 가족·연인 관람객이 많습니다. 라인업·티켓·셔틀 안내는 공식 홈페이지에서 확인할 수 있습니다.',
      homepage: 'https://www.jarasumjazz.com',
      homepageLabel: '자라섬 재즈페스티벌 홈페이지',
    },
  },
  {
    tokens: ['이천쌀문화축제', '쌀문화축제'],
    ids: ['icheon-rice', 'gg-7'],
    guide: {
      overview:
        '임금님표 이천쌀을 주제로 가마솥 밥 짓기, 벼 베기, 농경 체험과 지역 먹거리가 이어지는 이천 대표 수확 축제입니다. 현장 프로그램과 입장·체험 예약은 공식 홈페이지에서 안내합니다.',
      homepage: 'https://www.ricefestival.or.kr',
      homepageLabel: '이천쌀문화축제 홈페이지',
    },
  },
  {
    tokens: ['국제거리극', '안산 국제거리극'],
    ids: ['ansan-street', 'gg-8'],
    guide: {
      overview:
        '안산 중앙역·화랑유원지 일대에서 세계 거리극·서커스·야외 공연이 펼쳐지는 국제 축제입니다. 무료 거리 공연과 유료 초청작이 섞여 있으며, 프로그램 북과 공연 장소는 공식 홈페이지에서 확인할 수 있습니다.',
      homepage: 'https://www.ansanfest.com',
      homepageLabel: '안산국제거리극축제 홈페이지',
    },
  },
  {
    tokens: ['한국민속촌', '민속촌'],
    ids: ['yongin-folk', 'gg-2'],
    guide: {
      overview:
        '용인 한국민속촌에서 전통 가옥·장터 체험, 민속 공연과 계절 테마 축제가 하루 종일 이어집니다. 가족 단위 관람객을 위한 체험 프로그램과 공연 시간표는 공식 홈페이지에서 확인할 수 있습니다.',
      homepage: 'https://www.koreanfolk.co.kr',
      homepageLabel: '한국민속촌 홈페이지',
    },
  },
  {
    tokens: ['장단콩'],
    ids: ['paju-jangdan', 'gg-6'],
    guide: {
      overview:
        '파주 임진각 일대에서 장단콩·한우·지역 농산물을 선보이는 파주 대표 미식 축제입니다. 콩 음식 체험과 직거래 장터가 열리며, 개최 일정은 파주시 공식 안내를 참고하세요.',
      homepage: 'https://www.paju.go.kr',
      homepageLabel: '파주시 홈페이지',
    },
  },
  {
    tokens: ['영동시장'],
    ids: ['suwon-yeongdong', 'gg-4'],
    guide: {
      overview:
        '수원 영동시장 골목 상인과 함께하는 먹거리 축제입니다. 시장 골목 시식·할인 행사와 버스킹이 이어지며, 시장 안내와 점포 정보는 영동시장 페이지에서 확인할 수 있습니다.',
      homepage: 'https://www.suwon.go.kr',
      homepageLabel: '수원시 홈페이지',
    },
  },
];

const GENERIC_MARKERS = [
  '확인되는 대로',
  '추천코스로 이을 수',
  '의 상세 개요입니다',
  'TourAPI에서 수집한 행사',
  'TourAPI에서 수집한 축제',
];

export function isGenericFestivalOverview(text?: string | null): boolean {
  const value = String(text || '').trim();
  if (!value) return true;
  return GENERIC_MARKERS.some((marker) => value.includes(marker));
}

export function extractHomepageUrl(raw?: string | null): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;
  const href = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (href?.[0]) return href[0].replace(/[),.;]+$/g, '');
  const www = text.match(/\bwww\.[^\s"'<>]+/i);
  if (www?.[0]) return `https://${www[0].replace(/[),.;]+$/g, '')}`;
  return null;
}

export function visitkoreaSearchUrl(title: string): string {
  return `https://korean.visitkorea.or.kr/search/search_list.do?keyword=${encodeURIComponent(title)}`;
}

export function resolveGyeonggiEventGuide(title?: string, contentId?: string): GyeonggiEventGuide | null {
  const hay = String(title || '');
  const id = String(contentId || '');
  const hit = GUIDES.find((row) =>
    (id && row.ids?.includes(id))
    || row.tokens.some((token) => hay.includes(token)),
  );
  return hit?.guide ?? null;
}

export function gyeonggiEventCopy(title?: string, contentId?: string, metro?: string): GyeonggiEventGuide | null {
  const named = resolveGyeonggiEventGuide(title, contentId);
  if (named) return named;
  if (String(metro || '').toUpperCase() !== 'GYEONGGI') return null;
  const name = String(title || '경기도 축제').trim() || '경기도 축제';
  return {
    overview: `${name}은 경기도에서 열리는 지역 축제입니다. 공연·체험·먹거리 프로그램과 행사장 운영 시간은 주최 기관 안내를 따르며, 아래 링크에서 공식 소개와 최신 일정을 확인할 수 있습니다.`,
    homepage: visitkoreaSearchUrl(name),
    homepageLabel: '한국관광공사에서 행사 정보 보기',
  };
}
