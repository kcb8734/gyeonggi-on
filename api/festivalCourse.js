/** Vercel /api 코스 추천. 권역·도시별 실제 명소 좌표를 쓴다. */
import { centerCourseToFestivalCourse, findCenterCourseForPlace } from './centerCourses.js';
const DEFAULTS = {
  history: { name: '수원화성행궁', lat: 37.2819, lng: 127.0139, hint: '조선 후기 성곽과 행궁을 둘러보며 축제 배경을 이해합니다.' },
  market: { name: '수원 영동시장', lat: 37.2786, lng: 127.0168, hint: '전통시장 골목에서 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
  camp: { name: '광교호수공원 캠핑장', lat: 37.2830, lng: 127.0650, hint: '호수 옆 캠핑장에서 하루를 머물며 다음 일정을 잇습니다.' },
};

const BY_CITY = {
  수원: {
    history: { name: '수원화성 · 화성행궁', lat: 37.2819, lng: 127.0139, hint: '유네스코 성곽과 행궁을 먼저 걷고 축제장으로 이어집니다.' },
    market: { name: '수원 영동시장', lat: 37.2786, lng: 127.0168, hint: '갈비·통닭 골목에서 쿠폰 할인을 받습니다.' },
    camp: { name: '광교호수공원 가족캠핑장', lat: 37.2830, lng: 127.0650, hint: '광교호수 옆에서 하룻밤 머물며 다음 날 시장 브런치를 이어갑니다.' },
  },
  용인: {
    history: { name: '한국민속촌', lat: 37.2590, lng: 127.1190, hint: '전통 가옥과 체험 마당에서 축제 이야기를 먼저 만납니다.' },
    market: { name: '용인중앙시장', lat: 37.2344, lng: 127.2014, hint: '중앙시장 먹거리 골목에서 On&On+ 쿠폰을 사용합니다.' },
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
  광주광역시: {
    history: { name: '국립아시아문화전당 · 양림역사문화마을', lat: 35.1470, lng: 126.9200, hint: 'ACC와 양림동 근대 가옥을 먼저 보고 축제로 갑니다.' },
    market: { name: '대인시장 예술야시장', lat: 35.1530, lng: 126.9110, hint: '떡갈비·주먹밥을 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '무등산 국립공원 캠핑장', lat: 35.1340, lng: 126.9880, hint: '무등산 자락에서 숙박합니다.' },
  },
  광주시: {
    history: { name: '남한산성 · 경기도자박물관', lat: 37.4786, lng: 127.1814, hint: '남한산성과 경기 광주 도자 유적을 먼저 둘러봅니다.' },
    market: { name: '경안시장', lat: 37.4092, lng: 127.2608, hint: '보리밥·순댓국 등 경기 광주 시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '화담숲 · 곤지암 캠핑장', lat: 37.3410, lng: 127.3140, hint: '곤지암 화담숲 인근에서 숙박합니다.' },
  },
  남양주: {
    history: { name: '수종사 · 정약용 유적지', lat: 37.5840, lng: 127.3070, hint: '북한강 수종사와 다산 정약용 유적을 먼저 둘러봅니다.' },
    market: { name: '덕소시장', lat: 37.5850, lng: 127.2070, hint: '덕소 시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '운길산 캠핑장', lat: 37.5760, lng: 127.2800, hint: '운길산·북한강 자락에서 숙박합니다.' },
  },
  양주: {
    history: { name: '장흥관광지 · 양주관아지', lat: 37.7490, lng: 126.9560, hint: '장흥 계곡과 양주 관아지를 먼저 둘러봅니다.' },
    market: { name: '양주골시장', lat: 37.7850, lng: 127.0460, hint: '양주 시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '장흥캠핑장', lat: 37.7300, lng: 126.9500, hint: '장흥 계곡 옆에서 숙박합니다.' },
  },
  안산: {
    history: { name: '성호기념관 · 별망성', lat: 37.2997, lng: 126.8370, hint: '이익 선생 유적과 별망성을 먼저 둘러보고 축제장으로 이어집니다.' },
    market: { name: '안산 중앙시장', lat: 37.3215, lng: 126.8308, hint: '중앙시장 먹거리 골목을 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '화랑유원지 캠핑장', lat: 37.3263, lng: 126.8145, hint: '화랑유원지 인근에서 하룻밤 머물며 일정을 잇습니다.' },
  },
  여주: {
    history: { name: '세종대왕릉 · 신륵사', lat: 37.3100, lng: 127.6050, hint: '영릉과 남한강 신륵사를 먼저 걷고 축제장으로 갑니다.' },
    market: { name: '여주 세종시장', lat: 37.2983, lng: 127.6374, hint: '세종시장 쌀밥·도자기 골목을 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '금은모래 캠핑장', lat: 37.2975, lng: 127.6550, hint: '남한강 금은모래 캠핑장에서 숙박합니다.' },
  },
  부천: {
    history: { name: '부천한옥마을 · 활박물관', lat: 37.5038, lng: 126.7909, hint: '한옥마을과 활박물관에서 부천의 이야기를 먼저 만납니다.' },
    market: { name: '역곡남부시장', lat: 37.4865, lng: 126.8115, hint: '역곡 시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '원미산 가족캠핑장', lat: 37.5005, lng: 126.7920, hint: '원미산 인근에서 하룻밤 머물며 축제를 잇습니다.' },
  },
  성남: {
    history: { name: '성남향교 · 남한산성 남문', lat: 37.4418, lng: 127.1378, hint: '성남향교와 남한산성 남문을 먼저 둘러봅니다.' },
    market: { name: '모란시장', lat: 37.4326, lng: 127.1295, hint: '모란시장 먹거리 골목을 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '율동공원 캠핑장', lat: 37.4128, lng: 127.1482, hint: '율동공원 호숫가에서 숙박합니다.' },
  },
  의정부: {
    history: { name: '망월사 · 의정부 직동공원', lat: 37.7434, lng: 127.0573, hint: '망월사와 직동공원을 먼저 둘러보고 축제장으로 갑니다.' },
    market: { name: '의정부 제일시장', lat: 37.7393, lng: 127.0475, hint: '제일시장 부대찌개 골목을 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '수락산 캠핑·숙박', lat: 37.6978, lng: 127.0812, hint: '수락산 자락에서 하룻밤 머뭅니다.' },
  },
  안양: {
    history: { name: '삼막사 · 안양박물관', lat: 37.4190, lng: 126.9460, hint: '삼성산 삼막사와 안양박물관을 먼저 둘러봅니다.' },
    market: { name: '안양중앙시장', lat: 37.3945, lng: 126.9568, hint: '중앙시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '안양대공원 캠핑장', lat: 37.4040, lng: 126.9760, hint: '안양대공원 인근에서 숙박합니다.' },
  },
  광명: {
    history: { name: '광명동굴', lat: 37.4395, lng: 126.8570, hint: '광명동굴의 갱도와 역사를 먼저 둘러봅니다.' },
    market: { name: '광명시장', lat: 37.4795, lng: 126.8545, hint: '광명시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '광명동굴 인근 숙박', lat: 37.4370, lng: 126.8540, hint: '동굴 인근에서 하룻밤 머뭅니다.' },
  },
  평택: {
    history: { name: '평택호 관광단지 · 평택향교', lat: 36.9695, lng: 127.0718, hint: '평택호와 향교를 먼저 둘러보고 축제장으로 갑니다.' },
    market: { name: '통복시장', lat: 36.9922, lng: 127.0874, hint: '통복시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '평택호 캠핑장', lat: 36.9650, lng: 127.0750, hint: '평택호 물가에서 숙박합니다.' },
  },
  동두천: {
    history: { name: '소요산', lat: 37.9400, lng: 127.0610, hint: '소요산 자락을 먼저 걷고 축제장으로 내려갑니다.' },
    market: { name: '동두천 중앙시장', lat: 37.9030, lng: 127.0600, hint: '중앙시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '소요산 캠핑장', lat: 37.9430, lng: 127.0540, hint: '소요산 계곡 옆에서 숙박합니다.' },
  },
  고양: {
    history: { name: '서오릉', lat: 37.6278, lng: 126.8985, hint: '조선 왕릉 서오릉을 먼저 둘러보고 축제장으로 갑니다.' },
    market: { name: '일산시장', lat: 37.6628, lng: 126.7722, hint: '일산시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '행주산성 한강 캠핑장', lat: 37.5970, lng: 126.8265, hint: '한강 행주 나루에서 하룻밤 머뭅니다.' },
  },
  과천: {
    history: { name: '국립현대미술관 과천 · 서울대공원', lat: 37.4320, lng: 127.0200, hint: '과천 미술관과 대공원을 먼저 둘러봅니다.' },
    market: { name: '과천시장', lat: 37.4290, lng: 126.9960, hint: '과천시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '서울대공원 인근 숙박', lat: 37.4360, lng: 127.0160, hint: '대공원 인근에서 숙박합니다.' },
  },
  구리: {
    history: { name: '동구릉', lat: 37.6180, lng: 127.1410, hint: '조선 왕릉 동구릉을 먼저 둘러봅니다.' },
    market: { name: '구리전통시장', lat: 37.6030, lng: 127.1430, hint: '구리 시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '한강 구리 캠핑장', lat: 37.5940, lng: 127.1300, hint: '한강 구리 나들목에서 숙박합니다.' },
  },
  오산: {
    history: { name: '독산성 · 세마대지', lat: 37.1650, lng: 127.0170, hint: '독산성과 세마대지를 먼저 둘러보고 축제장으로 갑니다.' },
    market: { name: '오산시장', lat: 37.1460, lng: 127.0690, hint: '오산시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '물향기수목원 캠핑장', lat: 37.1660, lng: 127.0470, hint: '물향기수목원 인근에서 숙박합니다.' },
  },
  시흥: {
    history: { name: '시흥 관곡지 · 연꽃테마파크', lat: 37.4040, lng: 126.8110, hint: '연꽃 연못과 관곡지를 먼저 둘러봅니다.' },
    market: { name: '신천시장', lat: 37.4430, lng: 126.7870, hint: '신천시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '시흥갯골 캠핑장', lat: 37.3890, lng: 126.7860, hint: '갯골생태공원 옆에서 하룻밤 머뭅니다.' },
  },
  군포: {
    history: { name: '수리산 · 군포 시민공원', lat: 37.3570, lng: 126.9180, hint: '수리산 숲길과 시민공원을 먼저 둘러봅니다.' },
    market: { name: '산본시장', lat: 37.3580, lng: 126.9310, hint: '산본시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '수리산 산림욕장 캠핑', lat: 37.3500, lng: 126.9150, hint: '수리산 자락에서 숙박합니다.' },
  },
  의왕: {
    history: { name: '왕송호수 · 레솔레파크', lat: 37.3100, lng: 126.9480, hint: '왕송호수와 레일파크를 먼저 둘러봅니다.' },
    market: { name: '고천시장', lat: 37.3450, lng: 126.9730, hint: '고천시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '왕송호수 캠핑장', lat: 37.3080, lng: 126.9500, hint: '왕송호수 물가에서 숙박합니다.' },
  },
  하남: {
    history: { name: '이성산성 · 미사경정공원', lat: 37.5390, lng: 127.2140, hint: '하남 이성산성과 미사 한강을 먼저 둘러봅니다.' },
    market: { name: '덕풍시장', lat: 37.5390, lng: 127.2050, hint: '덕풍시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '미사한강 캠핑장', lat: 37.5630, lng: 127.1920, hint: '미사 한강변에서 하룻밤 머뭅니다.' },
  },
  이천: {
    history: { name: '설봉산성 · 영월암', lat: 37.2810, lng: 127.4270, hint: '설봉산 산성과 영월암을 먼저 둘러봅니다.' },
    market: { name: '이천 중앙시장', lat: 37.2760, lng: 127.4430, hint: '쌀밥·도자기 골목을 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '설봉공원 캠핑장', lat: 37.2770, lng: 127.4250, hint: '설봉공원 호숫가에서 숙박합니다.' },
  },
  안성: {
    history: { name: '안성맞춤박물관 · 죽주산성', lat: 37.0100, lng: 127.2790, hint: '안성맞춤 유물과 죽주산성을 먼저 둘러봅니다.' },
    market: { name: '안성맞춤시장', lat: 37.0070, lng: 127.2730, hint: '안성시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '안성맞춤랜드 캠핑장', lat: 37.0100, lng: 127.2800, hint: '맞춤랜드 인근에서 숙박합니다.' },
  },
  김포: {
    history: { name: '문수산성', lat: 37.6440, lng: 126.6870, hint: '김포 문수산성을 먼저 걷고 축제장으로 갑니다.' },
    market: { name: '김포 사우시장', lat: 37.6200, lng: 126.7190, hint: '사우시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '대명항 캠핑장', lat: 37.6420, lng: 126.5890, hint: '대명포구 옆에서 하룻밤 머뭅니다.' },
  },
  포천: {
    history: { name: '포천아트밸리', lat: 37.8990, lng: 127.2150, hint: '천주호와 아트밸리 조각공원을 먼저 둘러봅니다.' },
    market: { name: '포천 전통시장', lat: 37.8950, lng: 127.2000, hint: '포천 시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '포천아트밸리 캠핑장', lat: 37.9000, lng: 127.2180, hint: '아트밸리 호숫가에서 숙박합니다.' },
  },
  연천: {
    history: { name: '전곡리 선사유적지', lat: 38.0120, lng: 127.0630, hint: '한탄강 선사 유적을 먼저 둘러보고 축제장으로 갑니다.' },
    market: { name: '전곡시장', lat: 38.0240, lng: 127.0680, hint: '전곡시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '한탄강 캠핑장', lat: 38.0140, lng: 127.0780, hint: '한탄강 협곡 옆에서 숙박합니다.' },
  },
  양평: {
    history: { name: '두물머리 · 세미원', lat: 37.5320, lng: 127.3100, hint: '남한강·북한강이 만나는 두물머리를 먼저 둘러봅니다.' },
    market: { name: '양평 전통시장', lat: 37.4910, lng: 127.4900, hint: '양평 시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '양평 물소리길 캠핑장', lat: 37.4880, lng: 127.4920, hint: '남한강 물소리길 옆에서 숙박합니다.' },
  },
  울산: {
    history: { name: '대왕암 · 반구대 암각화', lat: 35.4920, lng: 129.4400, hint: '울산 대왕암과 선사 암각화를 먼저 둘러봅니다.' },
    market: { name: '울산 수산시장', lat: 35.5540, lng: 129.3200, hint: '수산시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '진하해수욕장 캠핑장', lat: 35.3860, lng: 129.3450, hint: '진하 해변에서 하룻밤 머뭅니다.' },
  },
  세종: {
    history: { name: '세종 호수공원 · 국립세종수목원', lat: 36.4970, lng: 127.2700, hint: '호수공원과 수목원을 먼저 둘러보고 축제장으로 갑니다.' },
    market: { name: '조치원 전통시장', lat: 36.6020, lng: 127.2960, hint: '조치원 시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '금강 세종 캠핑장', lat: 36.4800, lng: 127.2600, hint: '금강변에서 숙박합니다.' },
  },
  천안: {
    history: { name: '독립기념관', lat: 36.7830, lng: 127.2250, hint: '독립기념관을 먼저 둘러보고 축제장으로 갑니다.' },
    market: { name: '천안 중앙시장', lat: 36.8060, lng: 127.1520, hint: '중앙시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '태조산 캠핑장', lat: 36.8370, lng: 127.1840, hint: '태조산 자락에서 숙박합니다.' },
  },
  고성강원: {
    history: { name: '화진포 · 건봉사', lat: 38.4800, lng: 128.4400, hint: '화진포 호수와 건봉사를 먼저 둘러봅니다.' },
    market: { name: '거진시장', lat: 38.4500, lng: 128.4600, hint: '거진 시장 해산물을 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '화진포 캠핑장', lat: 38.4750, lng: 128.4420, hint: '화진포 해변에서 숙박합니다.' },
  },
  고성경남: {
    history: { name: '상족암 · 고성공룡박물관', lat: 34.9100, lng: 128.1500, hint: '상족암 공룡 발자국과 박물관을 먼저 둘러봅니다.' },
    market: { name: '고성전통시장', lat: 34.9720, lng: 128.3220, hint: '고성 시장 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.' },
    camp: { name: '상족암 캠핑장', lat: 34.9080, lng: 128.1480, hint: '상족암 해안가에서 숙박합니다.' },
  },
};

const CITY_ALIASES = [
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
  { token: '수원야행', city: '수원' },
  { token: '자라섬', city: '가평' },
  { token: '민속촌', city: '용인' },
  { token: '김치축제', city: '광주광역시' },
  { token: '무등산', city: '광주광역시' },
  { token: '양림', city: '광주광역시' },
  { token: '단원구', city: '안산' },
  { token: '상록구', city: '안산' },
  { token: '원미구', city: '부천' },
  { token: '소사구', city: '부천' },
  { token: '오정구', city: '부천' },
];

const SINGLE_CITY_METRO_DEFAULT = {
  SEOUL: '서울',
  INCHEON: '인천',
  BUSAN: '부산',
  DAEGU: '대구',
  GWANGJU: '광주광역시',
  DAEJEON: '대전',
  ULSAN: '울산',
  SEJONG: '세종',
  JEJU: '제주',
};

const METRO_ADDRESS_TOKENS = [
  { token: '서울특별시', city: '서울' },
  { token: '부산광역시', city: '부산' },
  { token: '대구광역시', city: '대구' },
  { token: '인천광역시', city: '인천' },
  { token: '광주광역시', city: '광주광역시' },
  { token: '대전광역시', city: '대전' },
  { token: '울산광역시', city: '울산' },
  { token: '세종특별자치시', city: '세종' },
  { token: '제주특별자치도', city: '제주' },
];

const PROVINCE_STEMS = new Set(['경기', '강원', '충청', '전라', '경상', '충북', '충남', '전북', '전남', '경북', '경남']);
const LOCAL_COURSE_MAX_KM = 24;

const COUPON_COMING_SOON = 'On&On+ 쿠폰은 추후 준비 중입니다.';

function withCouponComingSoon(text) {
  const raw = String(text || '').trim();
  const replaced = raw
    .replace(/현장 가맹점에서 On&On\+\s*쿠폰을 사용합니다\.?/g, COUPON_COMING_SOON)
    .replace(/에서 On&On\+\s*쿠폰으로 먹거리를 결제합니다\.?/g, '에서 먹거리를 즐깁니다. ' + COUPON_COMING_SOON)
    .replace(/On&On\+\s*쿠폰으로 결제합니다\.?/g, COUPON_COMING_SOON)
    .replace(/On&On\+\s*모바일 쿠폰으로 결제할 수 있습니다\.?/g, COUPON_COMING_SOON)
    .replace(/을 쿠폰으로 결제합니다\.?/g, '을 즐깁니다. ' + COUPON_COMING_SOON)
    .replace(/를 쿠폰으로 결제합니다\.?/g, '를 즐깁니다. ' + COUPON_COMING_SOON)
    .replace(/쿠폰으로 결제합니다\.?/g, COUPON_COMING_SOON)
    .replace(/에서 쿠폰을 사용합니다\.?/g, '를 둘러봅니다. ' + COUPON_COMING_SOON)
    .replace(/에서 On&On\+\s*쿠폰을 사용합니다\.?/g, '를 둘러봅니다. ' + COUPON_COMING_SOON)
    .replace(/쿠폰을 사용합니다\.?/g, COUPON_COMING_SOON)
    .replace(/에서 쿠폰 할인을 받습니다\.?/g, '를 둘러봅니다. ' + COUPON_COMING_SOON)
    .replace(/쿠폰 할인을 받습니다\.?/g, COUPON_COMING_SOON)
    .replace(/을 쿠폰으로 즐깁니다\.?/g, '을 즐깁니다. ' + COUPON_COMING_SOON)
    .replace(/를 쿠폰으로 즐깁니다\.?/g, '를 즐깁니다. ' + COUPON_COMING_SOON)
    .replace(/쿠폰으로 즐깁니다\.?/g, COUPON_COMING_SOON)
    .replace(/\s+/g, ' ')
    .trim();
  if (replaced.includes('추후 준비')) return replaced;
  if (/쿠폰|가맹점 정산|매칭 포인트/.test(replaced)) return replaced + ' ' + COUPON_COMING_SOON;
  return replaced;
}

function inferCoursePlaceKind(input) {
  const typeId = String((input && input.contentTypeId) || '');
  const kind = String((input && input.kind) || '');
  const hay = `${(input && input.title) || ''} ${(input && input.category) || ''} ${kind}`;
  if (typeId === '39' || kind === 'food' || /맛집|보리밥|식당|한정식|음식점|레스토랑/.test(hay)) return 'food';
  if (typeId === '12' || kind === 'attraction') return 'attraction';
  if (typeId === '14' || kind === 'culture') return 'culture';
  if (/축제|페스티벌|문화제/.test(hay) || typeId === '15' || kind === 'festival') return 'festival';
  return 'festival';
}

function resolveHomonymCity(text, ctx) {
  ctx = ctx || {};
  const metro = String(ctx.metro || '');
  const lat = Number(ctx.latitude);
  const lng = Number(ctx.longitude);
  const hasGps = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
  if (/남양주/.test(text)) return '남양주';
  const mentionsGwangju = /광주/.test(text);
  if (mentionsGwangju || metro === 'GWANGJU' || metro === 'GYEONGGI') {
    if (/광주광역시|광산구|무등산|양림|아시아문화전당|대인시장/.test(text) || metro === 'GWANGJU') {
      if (/경기도.{0,10}광주|경기광주/.test(text) && !/광주광역시/.test(text)) return '광주시';
      if (metro === 'GWANGJU' || /광주광역시|광산구|무등산|양림|아시아문화전당|대인시장/.test(text)) return '광주광역시';
    }
    if (/경기도.{0,10}광주|경기광주|광주시/.test(text) && !/광주광역시/.test(text)) return '광주시';
    if (metro === 'GYEONGGI' && mentionsGwangju) return '광주시';
    if (mentionsGwangju && hasGps) {
      if (lat >= 36.8 && lat <= 37.7 && lng >= 126.95 && lng <= 127.55) return '광주시';
      if (lat >= 34.9 && lat <= 35.4 && lng >= 126.5 && lng <= 127.25) return '광주광역시';
    }
    if (mentionsGwangju && !/광주시|광주광역시/.test(text)) {
      if (metro === 'GYEONGGI' || (hasGps && lat >= 36.8)) return '광주시';
      return '광주광역시';
    }
  }
  if (/고성/.test(text)) {
    if (/강원|간성|토성면/.test(text) || metro === 'GANGWON') return '고성강원';
    if (/경남|통영|거제/.test(text) || metro === 'GYEONGNAM') return '고성경남';
    if (hasGps && lat >= 37.8) return '고성강원';
    if (hasGps && lat <= 35.5) return '고성경남';
  }
  return '';
}

function hasGps(ctx) {
  ctx = ctx || {};
  const lat = Number(ctx.latitude);
  const lng = Number(ctx.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
}

function kmBetween(aLat, aLng, bLat, bLng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const SYNTH_OFFSET = {
  history: [0.011, -0.007],
  market: [0.003, 0.009],
  camp: [-0.010, 0.005],
};

function syntheticLandmark(kind, label, lat, lng) {
  const city = String(label || '이 지역').trim() || '이 지역';
  const offset = SYNTH_OFFSET[kind] || SYNTH_OFFSET.history;
  const names = {
    history: city + ' 역사·문화 체험',
    market: city + ' 전통시장',
    camp: city + ' 캠핑장·숙박',
  };
  const hints = {
    history: city + '의 대표 역사·문화 장소를 둘러본 뒤 축제장으로 이어집니다.',
    market: city + ' 전통시장과 먹거리 골목을 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.',
    camp: city + ' 인근 캠핑장 또는 숙박 시설에서 하루를 머뭅니다.',
  };
  return { name: names[kind], lat: lat + offset[0], lng: lng + offset[1], hint: hints[kind] };
}

function extractMunicipality(text, ctx) {
  ctx = ctx || {};
  const homonym = resolveHomonymCity(text, ctx);
  if (homonym) return homonym;
  const metroHit = METRO_ADDRESS_TOKENS.find((item) => text.includes(item.token));
  if (metroHit) {
    if (metroHit.city === '광주광역시' && /경기도.{0,10}광주|경기광주/.test(text) && !/광주광역시/.test(text)) return '광주시';
    return metroHit.city;
  }
  if (/(?:^|[^가-힣])서울(?:시|특별시|[^가-힣]|$)/.test(text)) return '서울';
  const re = /([가-힣]{2,5})(시|군)/g;
  let match;
  while ((match = re.exec(text))) {
    const stem = match[1];
    const after = text[match.index + match[0].length] || '';
    if (after === '장') continue;
    if (PROVINCE_STEMS.has(stem)) continue;
    if (stem === '세종' && /세종대왕|영릉/.test(text) && !/세종특별|세종시/.test(text)) continue;
    if (stem === '광주') return resolveHomonymCity(text, ctx) || (ctx.metro === 'GYEONGGI' ? '광주시' : '광주광역시');
    if (stem === '고성') return resolveHomonymCity(text, ctx) || stem;
    return stem;
  }
  return '';
}

function cityKey(raw, ctx) {
  const text = String(raw || '');
  const homonym = resolveHomonymCity(text, ctx || {});
  if (homonym && BY_CITY[homonym]) return homonym;
  const keys = Object.keys(BY_CITY).sort((a, b) => b.length - a.length);
  return keys.find((key) => {
    if (!text.includes(key)) return false;
    const longerHit = keys.some((other) => other !== key && other.includes(key) && text.includes(other));
    if (longerHit) return false;
    if (key === '양주' && text.includes('남양주') && !text.replace(/남양주/g, '').includes('양주')) return false;
    if (key === '세종' && /세종대왕|영릉/.test(text) && !/세종특별자치시|세종시/.test(text)) return false;
    if (key === '여수' && text.includes('여주') && !text.replace(/여주/g, '').includes('여수')) return false;
    if (key === '화성' && /수원화성|화성행궁/.test(text) && !/화성시/.test(text)) return false;
    if (key === '인천' && /강화군|강화도/.test(text) && !/인천광역시|중구|미추홀|연수|남동|부평|계양|서구/.test(text)) return false;
    return true;
  }) || '';
}

function resolveCourseCity(input) {
  input = input || {};
  const hay = `${input.city || ''} ${input.address || ''} ${input.title || ''}`;
  const extracted = extractMunicipality(hay, input);
  if (extracted) return extracted;
  const fromLandmarks = cityKey(hay, input);
  if (fromLandmarks) return fromLandmarks;
  const alias = CITY_ALIASES.find((item) => hay.includes(item.token));
  if (alias) return alias.city;
  if (input.metro && SINGLE_CITY_METRO_DEFAULT[input.metro]) return SINGLE_CITY_METRO_DEFAULT[input.metro];
  return '';
}

function keepInMunicipality(landmark, kind, city, extra) {
  extra = extra || {};
  const label = city || '이 지역';
  const foreignDefault = Boolean(city) && city !== '수원' && /수원화성|화성행궁|영동시장|광교호수/.test(landmark.name);
  if (!hasGps(extra)) {
    if (!foreignDefault) return landmark;
    return {
      name: kind === 'history' ? label + ' 역사·문화 체험' : kind === 'market' ? label + ' 전통시장' : label + ' 캠핑장·숙박',
      lat: 0,
      lng: 0,
      hint: label + ' 안에서 코스를 이습니다.',
    };
  }
  const originLat = Number(extra.latitude);
  const originLng = Number(extra.longitude);
  const tooFar = kmBetween(originLat, originLng, landmark.lat, landmark.lng) > LOCAL_COURSE_MAX_KM;
  if (foreignDefault || tooFar) return syntheticLandmark(kind, label, originLat, originLng);
  return landmark;
}

function landmarkFor(kind, city, address, title, extra) {
  const ctx = extra || {};
  const label = city || extractMunicipality(`${city || ''} ${address || ''} ${title || ''}`, ctx) || '이 지역';
  if (city && BY_CITY[city] && BY_CITY[city][kind]) return keepInMunicipality(BY_CITY[city][kind], kind, label, ctx);
  const key = cityKey(`${city || ''} ${address || ''} ${title || ''}`, ctx);
  const catalog = BY_CITY[key] && BY_CITY[key][kind];
  if (catalog) return keepInMunicipality(catalog, kind, label || key, ctx);
  if (hasGps(ctx)) return syntheticLandmark(kind, label, Number(ctx.latitude), Number(ctx.longitude));
  if (label === '수원' || key === '수원' || !label || label === '이 지역') return DEFAULTS[kind];
  return {
    name: kind === 'history' ? label + ' 역사·문화 체험' : kind === 'market' ? label + ' 전통시장' : label + ' 캠핑장·숙박',
    lat: 0,
    lng: 0,
    hint: label + ' 안에서 코스를 이습니다.',
  };
}

function hubCopy(kind, name) {
  if (kind === 'food') {
    return {
      category: '맛집',
      titleSuffix: '맛집과 함께하는 역사·시장 코스',
      description: name + '에서 음식을 즐깁니다. 음식점 소개와 메뉴를 확인하고 방문하세요. ' + COUPON_COMING_SOON,
      estimated_time: '1시간 30분',
      audience: '가족 · 연인 · 맛집 여행을 즐기는 여행객',
    };
  }
  if (kind === 'attraction') {
    return {
      category: '관광지',
      titleSuffix: '와 함께하는 역사·시장 코스',
      description: name + '을 둘러봅니다. ' + COUPON_COMING_SOON,
      estimated_time: '1시간 30분',
    };
  }
  if (kind === 'culture') {
    return {
      category: '문화',
      titleSuffix: '와 함께하는 역사·시장 코스',
      description: name + '의 전시와 공간을 둘러봅니다. ' + COUPON_COMING_SOON,
      estimated_time: '1시간 30분',
    };
  }
  return {
    category: '메인 축제',
    titleSuffix: '와 함께하는 역사·시장·캠핑 투어',
    description: name + ' 행사를 둘러봅니다. ' + COUPON_COMING_SOON,
    estimated_time: '3시간',
    audience: '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
  };
}

export function recommendCourse(title, city, extra) {
  extra = extra || {};
  const input = {
    title: title,
    city: city || extra.city,
    address: extra.address,
    metro: extra.metro,
    latitude: extra.latitude,
    longitude: extra.longitude,
    contentTypeId: extra.contentTypeId,
    kind: extra.kind,
    category: extra.category,
  };
  const center = findCenterCourseForPlace(input);
  if (center) return centerCourseToFestivalCourse(center);
  const festivalTitle = String(input.title || '').trim();
  const place = resolveCourseCity(input) || '이 지역';
  const placeKind = inferCoursePlaceKind(input);
  const hubName = festivalTitle && festivalTitle !== '축제 상세' ? festivalTitle : `${place} 지역 축제`;
  const hub = hubCopy(placeKind, hubName);
  const history = landmarkFor('history', place, input.address, festivalTitle, input);
  const market = landmarkFor('market', place, input.address, festivalTitle, input);
  const camp = landmarkFor('camp', place, input.address, festivalTitle, input);
  const festLat = Number(input.latitude);
  const festLng = Number(input.longitude);
  const hasFestGps = Number.isFinite(festLat) && Number.isFinite(festLng) && festLat !== 0 && festLng !== 0;
  return {
    course_title: hub.titleSuffix.startsWith('와')
      ? `[${place}] ${hubName}${hub.titleSuffix}`
      : `[${place}] ${hubName} ${hub.titleSuffix}`,
    target_audience: hub.audience || '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
    total_distance: '18~40km',
    itinerary: [
      { step: 1, category: '역사체험', place_name: history.name, description: withCouponComingSoon(history.hint), estimated_time: '1시간 30분', latitude: history.lat, longitude: history.lng },
      { step: 2, category: '전통시장 먹거리', place_name: market.name, description: withCouponComingSoon(market.hint), estimated_time: '1시간', latitude: market.lat, longitude: market.lng },
      { step: 3, category: hub.category, place_name: hubName, description: hub.description, estimated_time: hub.estimated_time, latitude: hasFestGps ? festLat : (history.lat + market.lat) / 2, longitude: hasFestGps ? festLng : (history.lng + market.lng) / 2 },
      { step: 4, category: '캠핑장/숙박', place_name: camp.name, description: withCouponComingSoon(camp.hint), estimated_time: '숙박', latitude: camp.lat, longitude: camp.lng },
    ],
    local_benefit_tip: COUPON_COMING_SOON,
  };
}
