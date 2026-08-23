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
  가평: {
    history: { name: '아침고요수목원 · 쁘띠프랑스', lat: 37.7430, lng: 127.3520, hint: '가평 정원과 호숫가 마을을 먼저 보고 자라섬으로 갑니다.' },
    market: { name: '가평 전통시장', lat: 37.8310, lng: 127.5100, hint: '막국수·닭갈비를 쿠폰으로 즐깁니다.' },
    camp: { name: '자라섬 캠핑장', lat: 37.8250, lng: 127.5140, hint: '북한강 자라섬에서 하룻밤 머물며 재즈 무대를 잇습니다.' },
  },
  강화: {
    history: { name: '강화고인돌 · 전등사', lat: 37.7230, lng: 126.4450, hint: '청동기 고인돌과 정족산 전등사를 먼저 둘러봅니다.' },
    market: { name: '강화풍물시장', lat: 37.7470, lng: 126.4880, hint: '순무김치·인삼약과를 쿠폰으로 결제합니다.' },
    camp: { name: '동막해변 캠핑장', lat: 37.5930, lng: 126.4590, hint: '강화 서해 갯벌 옆에서 숙박합니다.' },
  },
  보령: {
    history: { name: '성주사지 · 대천해수욕장 역사관', lat: 36.3470, lng: 126.6650, hint: '백제 사찰터를 보고 머드 광장으로 내려갑니다.' },
    market: { name: '대천항 수산시장', lat: 36.3260, lng: 126.5110, hint: '조개구이·밴댕이를 쿠폰으로 즐깁니다.' },
    camp: { name: '대천해수욕장 캠핑장', lat: 36.3150, lng: 126.5130, hint: '머드 축제장 옆 해변에서 하룻밤 머뭅니다.' },
  },
  부여: {
    history: { name: '부소산성 · 궁남지', lat: 36.2690, lng: 126.9120, hint: '백제 왕궁 연못과 낙화암을 먼저 걷고 연꽃축제로 갑니다.' },
    market: { name: '부여 중앙시장', lat: 36.2810, lng: 126.9120, hint: '연잎밥·한우를 쿠폰으로 결제합니다.' },
    camp: { name: '백제문화단지 캠핑장', lat: 36.3070, lng: 126.8990, hint: '백제 재현 마을 옆에서 숙박합니다.' },
  },
  서귀포: {
    history: { name: '천지연폭포 · 정방폭포', lat: 33.2440, lng: 126.5710, hint: '칠십리 해안의 폭포를 먼저 보고 시공원 축제로 갑니다.' },
    market: { name: '서귀포매일올레시장', lat: 33.2480, lng: 126.5640, hint: '갈치조림·고기국수를 쿠폰으로 즐깁니다.' },
    camp: { name: '표선 해비치 캠핑장', lat: 33.3250, lng: 126.8420, hint: '남원·표선 해변에서 하룻밤 머물며 일정을 잇습니다.' },
  },
  순천: {
    history: { name: '순천 낙안읍성 · 선암사', lat: 34.9070, lng: 127.3420, hint: '조선 읍성과 조계산 선암사를 먼저 보고 갈대밭으로 갑니다.' },
    market: { name: '순천 아랫장', lat: 34.9510, lng: 127.4880, hint: '꼬막·낙지를 쿠폰으로 결제합니다.' },
    camp: { name: '순천만 국가정원 캠핑장', lat: 34.9280, lng: 127.5090, hint: '정원과 갈대습지 옆에서 숙박합니다.' },
  },
  원주: {
    history: { name: '원주 한지테마파크 · 치악산', lat: 37.3480, lng: 127.9480, hint: '원주 한지 역사와 치악산을 먼저 둘러봅니다.' },
    market: { name: '원주 중앙시장', lat: 37.3510, lng: 127.9480, hint: '추어탕·한지를 쿠폰으로 즐깁니다.' },
    camp: { name: '간현관광지 캠핑장', lat: 37.2260, lng: 127.9930, hint: '섬강 협곡 옆에서 하룻밤 머뭅니다.' },
  },
  공주: {
    history: { name: '공산성 · 무령왕릉', lat: 36.4630, lng: 127.1260, hint: '백제 왕릉과 금강 성곽을 먼저 걷고 석전·문화제로 갑니다.' },
    market: { name: '공주 산성시장', lat: 36.4560, lng: 127.1240, hint: '밤·도토리묵을 쿠폰으로 결제합니다.' },
    camp: { name: '금강 캠핑장', lat: 36.4700, lng: 127.1280, hint: '금강 변에서 숙박합니다.' },
  },
  안동: {
    history: { name: '하회마을 · 병산서원', lat: 36.5390, lng: 128.5180, hint: '하회탈과 서원을 먼저 보고 축제장으로 갑니다.' },
    market: { name: '안동 구시장', lat: 36.5650, lng: 128.7290, hint: '찜닭·간고등어를 쿠폰으로 즐깁니다.' },
    camp: { name: '안동호 캠핑장', lat: 36.5800, lng: 128.7700, hint: '안동호 물가에서 하룻밤 머뭅니다.' },
  },
  통영: {
    history: { name: '한산도 제승당 · 동피랑', lat: 34.8450, lng: 128.4330, hint: '이순신 유적과 동피랑 벽화를 먼저 보고 바다 축제로 갑니다.' },
    market: { name: '통영 중앙시장', lat: 34.8420, lng: 128.4240, hint: '꿀빵·충무김밥을 쿠폰으로 결제합니다.' },
    camp: { name: '비진도 캠핑장', lat: 34.7210, lng: 128.4580, hint: '한려수도 섬에서 숙박합니다.' },
  },
  대구: {
    history: { name: '달성공원 · 서문시장 근대골목', lat: 35.8730, lng: 128.5770, hint: '달성토성과 근대골목을 먼저 걷고 축제장으로 갑니다.' },
    market: { name: '서문시장', lat: 35.8690, lng: 128.5800, hint: '납작만두·막창을 쿠폰으로 즐깁니다.' },
    camp: { name: '팔공산 캠핑장', lat: 35.9920, lng: 128.6950, hint: '팔공산 자락에서 하룻밤 머뭅니다.' },
  },
  광주: {
    history: { name: '국립아시아문화전당 · 양림역사문화마을', lat: 35.1470, lng: 126.9200, hint: 'ACC와 양림동 근대 가옥을 먼저 보고 축제로 갑니다.' },
    market: { name: '대인시장 예술야시장', lat: 35.1530, lng: 126.9110, hint: '떡갈비·주먹밥을 쿠폰으로 결제합니다.' },
    camp: { name: '무등산 국립공원 캠핑장', lat: 35.1340, lng: 126.9880, hint: '무등산 자락에서 숙박합니다.' },
  },
};

const CITY_ALIASES: Array<{ token: string; city: string }> = [
  { token: '장단콩', city: '파주' },
  { token: '마임', city: '춘천' },
  { token: '커피축제', city: '강릉' },
  { token: '강릉커피', city: '강릉' },
  { token: '효석', city: '평창' },
  { token: '메밀', city: '평창' },
  { token: '속초', city: '속초' },
  { token: '거리예술', city: '서울' },
  { token: '빛초롱', city: '서울' },
  { token: '장미축제', city: '서울' },
  { token: '한강몽땅', city: '서울' },
  { token: '종로', city: '서울' },
  { token: '중구', city: '서울' },
  { token: '펜타포트', city: '인천' },
  { token: '송도', city: '인천' },
  { token: '고인돌', city: '강화' },
  { token: '개항장', city: '인천' },
  { token: '직지', city: '청주' },
  { token: '머드', city: '보령' },
  { token: '서동', city: '부여' },
  { token: '한지', city: '전주' },
  { token: '밤바다', city: '여수' },
  { token: '부산불꽃', city: '부산' },
  { token: '갈대', city: '순천' },
  { token: '남강', city: '진주' },
  { token: '유등', city: '진주' },
  { token: '벚꽃', city: '경주' },
  { token: '광안', city: '부산' },
  { token: '들불', city: '제주' },
  { token: '칠십리', city: '서귀포' },
  { token: '유채', city: '제주' },
  { token: '화성문화', city: '수원' },
  { token: '야행', city: '수원' },
  { token: '자라섬', city: '가평' },
  { token: '민속촌', city: '용인' },
];

const REGION_DEFAULT_CITY: Record<string, string> = {
  GYEONGGI: '수원',
  SEOUL: '서울',
  INCHEON: '인천',
  GANGWON: '춘천',
  CHUNGCHEONG: '청주',
  JEOLLA: '전주',
  GYEONGSANG: '경주',
  JEJU: '제주',
};

export function resolveCourseCity(input: { title?: string; city?: string; address?: string; metro?: string }) {
  const hay = `${input.city || ''} ${input.address || ''} ${input.title || ''}`;
  const fromLandmarks = cityKey(hay);
  if (fromLandmarks) return fromLandmarks;
  const alias = CITY_ALIASES.find((item) => hay.includes(item.token));
  if (alias) return alias.city;
  if (input.metro && REGION_DEFAULT_CITY[input.metro]) return REGION_DEFAULT_CITY[input.metro];
  return '수원';
}

function cityKey(raw?: string) {
  const text = String(raw || '');
  const hit = Object.keys(BY_CITY).find((key) => text.includes(key));
  return hit ?? '';
}

export function landmarkFor(kind: LandmarkKind, city?: string, address?: string, title?: string): Landmark {
  const key = cityKey(`${city || ''} ${address || ''} ${title || ''}`);
  return BY_CITY[key]?.[kind] ?? DEFAULTS[kind];
}
