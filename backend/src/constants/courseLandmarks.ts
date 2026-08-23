export type LandmarkKind = 'history' | 'market' | 'camp';

export interface Landmark {
  name: string;
  lat: number;
  lng: number;
  hint: string;
}

const DEFAULTS: Record<LandmarkKind, Landmark> = {
  history: { name: '수원화성행궁', lat: 37.2819, lng: 127.0139, hint: '조선 후기 성곽과 행궁을 둘러보며 축제 배경을 이해합니다.' },
  market: { name: '수원 영동시장', lat: 37.2786, lng: 127.0168, hint: '전통시장 골목에서 On&On 쿠폰으로 먹거리를 결제합니다.' },
  camp: { name: '광교호수공원 캠핑장', lat: 37.2830, lng: 127.0650, hint: '호수 옆 캠핑장에서 하루를 머물며 다음 일정을 잇습니다.' },
};

const BY_CITY: Record<string, Partial<Record<LandmarkKind, Landmark>>> = {
  수원: {
    history: { name: '수원화성 · 화성행궁', lat: 37.2819, lng: 127.0139, hint: '유네스코 성곽과 행궁을 먼저 걷고 축제장으로 이어집니다.' },
    market: { name: '수원 영동시장', lat: 37.2786, lng: 127.0168, hint: '갈비·통닭 골목에서 쿠폰 할인을 받습니다.' },
    camp: { name: '광교호수공원 가족캠핑장', lat: 37.2830, lng: 127.0650, hint: '광교호수 옆에서 하룻밤 머물며 다음 날 시장 브런치를 이어갑니다.' },
  },
  용인: {
    history: { name: '한국민속촌', lat: 37.2590, lng: 127.1190, hint: '전통 가옥과 체험 마당에서 축제 이야기를 먼저 만납니다.' },
    market: { name: '용인중앙시장', lat: 37.2344, lng: 127.2014, hint: '중앙시장 먹거리 골목에서 On&On 쿠폰을 사용합니다.' },
    camp: { name: '용인자연휴양림 캠핑장', lat: 37.1560, lng: 127.1960, hint: '숲속 캠핑장에서 축제 피로를 풀고 다음날 일정을 잇습니다.' },
  },
  파주: {
    history: { name: '임진각 평화누리 / 도라전망대', lat: 37.8906, lng: 126.7402, hint: '접경 역사와 평화 전망을 먼저 둘러보고 축제장으로 향합니다.' },
    market: { name: '문산·금촌 전통시장', lat: 37.7610, lng: 126.7780, hint: '전통시장 먹거리를 쿠폰으로 결제합니다.' },
    camp: { name: '파주 임진각 평화캠핑장', lat: 37.8894, lng: 126.7470, hint: '임진각 인근 캠핑장에서 하루를 머뭅니다.' },
  },
  화성: {
    history: { name: '제부도 매바위 · 화성 공룡알화석산지', lat: 37.1690, lng: 126.6230, hint: '서해 갯벌과 공룡 화석지를 먼저 보고 축제장으로 갑니다.' },
    market: { name: '병점전통시장', lat: 37.2070, lng: 127.0330, hint: '병점 시장 국밥·부침개를 쿠폰으로 즐깁니다.' },
    camp: { name: '궁평항 캠핑장', lat: 37.1160, lng: 126.6760, hint: '서해 일몰이 보이는 캠핑장에서 숙박합니다.' },
  },
  춘천: {
    history: { name: '남이섬 · 경춘선 숲길', lat: 37.7916, lng: 127.5258, hint: '남이섬과 호숫가 산책로에서 춘천의 이야기를 먼저 만납니다.' },
    market: { name: '춘천 중앙시장', lat: 37.8760, lng: 127.7270, hint: '닭갈비·막국수 골목에서 쿠폰 할인을 받습니다.' },
    camp: { name: '중도 관광지 캠핑장', lat: 37.8880, lng: 127.6980, hint: '의암호 중도에서 하룻밤 머물며 축제 일정을 잇습니다.' },
  },
  강릉: {
    history: { name: '오죽헌 · 선교장', lat: 37.7792, lng: 128.8780, hint: '율곡 이이 유적과 선교장을 둘러본 뒤 커피거리로 이어집니다.' },
    market: { name: '강릉 중앙시장', lat: 37.7540, lng: 128.8980, hint: '닭강정·커피빵을 쿠폰으로 결제합니다.' },
    camp: { name: '경포해변 캠핑장', lat: 37.8040, lng: 128.9070, hint: '경포 바다 옆에서 숙박하고 다음 날 커피축제를 이어갑니다.' },
  },
  속초: {
    history: { name: '신흥사 · 설악산 권금성', lat: 38.1730, lng: 128.4820, hint: '설악 기암과 신흥사를 먼저 보고 해변 축제로 내려갑니다.' },
    market: { name: '속초관광수산시장', lat: 38.2060, lng: 128.5910, hint: '오징어·닭강정 골목에서 쿠폰을 사용합니다.' },
    camp: { name: '설악산 국립공원 설악동 야영장', lat: 38.1660, lng: 128.5180, hint: '설악동 야영장에서 하룻밤 머물며 다음 일정을 잇습니다.' },
  },
  서울: {
    history: { name: '경복궁 · 북촌한옥마을', lat: 37.5796, lng: 126.9770, hint: '궁궐과 한옥골목을 먼저 걷고 축제장으로 향합니다.' },
    market: { name: '광장시장', lat: 37.5700, lng: 126.9990, hint: '빈대떡·마약김밥을 쿠폰으로 즐깁니다.' },
    camp: { name: '난지캠핑장', lat: 37.5680, lng: 126.8760, hint: '한강 난지에서 하룻밤 머물며 도심 축제를 잇습니다.' },
  },
  인천: {
    history: { name: '차이나타운 · 개항장 거리', lat: 37.4750, lng: 126.6180, hint: '개항기 거리와 차이나타운을 둘러본 뒤 축제로 갑니다.' },
    market: { name: '신포국제시장', lat: 37.4708, lng: 126.6255, hint: '닭강정 골목에서 쿠폰 할인을 받습니다.' },
    camp: { name: '을왕리 캠핑장', lat: 37.4480, lng: 126.3720, hint: '을왕리 해변 캠핑장에서 숙박합니다.' },
  },
  제주: {
    history: { name: '삼성혈 · 관덕정', lat: 33.5040, lng: 126.5290, hint: '탐라 건국 설화와 관덕정을 먼저 보고 들불축제로 이어집니다.' },
    market: { name: '동문재래시장', lat: 33.5120, lng: 126.5280, hint: '흑돼지·오메기떡을 쿠폰으로 결제합니다.' },
    camp: { name: '협재 해변 캠핑장', lat: 33.3940, lng: 126.2390, hint: '에메랄드 해변 옆에서 하룻밤 머물며 일정을 잇습니다.' },
  },
  전주: {
    history: { name: '전주한옥마을 · 경기전', lat: 35.8150, lng: 127.1500, hint: '한옥골목과 경기전을 먼저 걷고 한지축제로 이어집니다.' },
    market: { name: '전주 남부시장', lat: 35.8120, lng: 127.1460, hint: '야시장 먹거리를 쿠폰으로 즐깁니다.' },
    camp: { name: '덕진공원 캠핑장', lat: 35.8470, lng: 127.1220, hint: '연꽃 호수 옆에서 숙박합니다.' },
  },
  경주: {
    history: { name: '대릉원 · 첨성대', lat: 35.8347, lng: 129.2190, hint: '신라 왕릉과 첨성대를 먼저 보고 벚꽃 축제로 갑니다.' },
    market: { name: '경주 중앙시장', lat: 35.8420, lng: 129.2110, hint: '황남빵·찰보리빵을 쿠폰으로 결제합니다.' },
    camp: { name: '보문관광단지 캠핑장', lat: 35.8430, lng: 129.2870, hint: '보문호 옆에서 하룻밤 머물며 일정을 잇습니다.' },
  },
  부산: {
    history: { name: '동래읍성 · 복천박물관', lat: 35.2090, lng: 129.0860, hint: '동래읍성과 가야 유물을 먼저 보고 해변 축제로 갑니다.' },
    market: { name: '자갈치시장', lat: 35.0966, lng: 129.0306, hint: '회·씨앗호떡을 쿠폰으로 즐깁니다.' },
    camp: { name: '임랑해수욕장 캠핑장', lat: 35.3180, lng: 129.2600, hint: '동해 임랑에서 숙박하고 불꽃축제를 잇습니다.' },
  },
  청주: {
    history: { name: '청주 고인쇄박물관 · 상당산성', lat: 36.6430, lng: 127.4910, hint: '직지 인쇄 역사와 산성을 먼저 보고 직지축제로 갑니다.' },
    market: { name: '육거리시장', lat: 36.6340, lng: 127.4900, hint: '순대·칼국수 골목에서 쿠폰을 사용합니다.' },
    camp: { name: '대청호 캠핑장', lat: 36.4780, lng: 127.4800, hint: '대청호 물빛 옆에서 하룻밤 머물며 일정을 잇습니다.' },
  },
  대전: {
    history: { name: '뿌리공원 · 유성온천', lat: 36.2850, lng: 127.3880, hint: '효 문화 공원과 온천을 먼저 둘러봅니다.' },
    market: { name: '대전중앙시장', lat: 36.3280, lng: 127.4270, hint: '빵·칼국수 골목에서 쿠폰 할인을 받습니다.' },
    camp: { name: '장태산자연휴양림 캠핑장', lat: 36.2180, lng: 127.3410, hint: '메타세쿼이아 숲에서 숙박합니다.' },
  },
  여수: {
    history: { name: '여수 진남관 · 오동도', lat: 34.7440, lng: 127.7520, hint: '임진왜란 유적과 동백섬을 먼저 보고 밤바다 축제로 갑니다.' },
    market: { name: '여수 교동시장', lat: 34.7400, lng: 127.7360, hint: '서대회·게장 골목에서 쿠폰을 사용합니다.' },
    camp: { name: '만성리검은모래해변 캠핑장', lat: 34.7780, lng: 127.7450, hint: '검은모래 해변에서 하룻밤 머물며 불꽃축제를 잇습니다.' },
  },
  진주: {
    history: { name: '진주성 · 촉석루', lat: 35.1890, lng: 128.0770, hint: '임진왜란 진주성과 촉석루를 먼저 걷고 유등축제로 이어집니다.' },
    market: { name: '진주중앙시장', lat: 35.1920, lng: 128.0840, hint: '비빔밥·냉면을 쿠폰으로 즐깁니다.' },
    camp: { name: '진양호 캠핑장', lat: 35.1620, lng: 128.0310, hint: '진양호 물가에서 숙박합니다.' },
  },
  평창: {
    history: { name: '오대산 월정사 · 전나무숲', lat: 37.7310, lng: 128.5920, hint: '월정사 전나무숲길을 먼저 걷고 효석문화제로 갑니다.' },
    market: { name: '평창전통시장', lat: 37.3700, lng: 128.3900, hint: '메밀전과 막국수를 쿠폰으로 결제합니다.' },
    camp: { name: '평창 동계올림픽 파크 캠핑장', lat: 37.6650, lng: 128.6700, hint: '대관령 고원에서 하룻밤 머물며 일정을 잇습니다.' },
  },
};

function cityKey(raw?: string) {
  const text = String(raw || '');
  const hit = Object.keys(BY_CITY).find((key) => text.includes(key));
  return hit ?? '';
}

export function landmarkFor(kind: LandmarkKind, city?: string, address?: string, title?: string): Landmark {
  const key = cityKey(`${city || ''} ${address || ''} ${title || ''}`);
  return BY_CITY[key]?.[kind] ?? DEFAULTS[kind];
}
