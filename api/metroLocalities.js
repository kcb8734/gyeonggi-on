function cities(names, area) {
  return names.map((name) => ({
    id: area ? `${area}-${name}` : name,
    label: area ? `${area} ${name}` : name,
  }));
}

const LEGACY_METRO_ALIASES = {
  CHUNGCHEONG: 'CHUNGNAM',
  JEOLLA: 'JEONBUK',
  GYEONGSANG: 'GYEONGNAM',
};

function normalizeMetroId(id) {
  const raw = String(id || 'GYEONGGI').toUpperCase();
  return LEGACY_METRO_ALIASES[raw] || raw;
}

const REGION_META = {
  SEOUL: { label: '서울온', phone: '02', tourAreaCode: '1', moiCode: '11' },
  BUSAN: { label: '부산온', phone: '051', tourAreaCode: '6', moiCode: '26' },
  DAEGU: { label: '대구온', phone: '053', tourAreaCode: '4', moiCode: '27' },
  INCHEON: { label: '인천온', phone: '032', tourAreaCode: '2', moiCode: '28' },
  GWANGJU: { label: '광주온', phone: '062', tourAreaCode: '5', moiCode: '29' },
  DAEJEON: { label: '대전온', phone: '042', tourAreaCode: '3', moiCode: '30' },
  ULSAN: { label: '울산온', phone: '052', tourAreaCode: '7', moiCode: '31' },
  SEJONG: { label: '세종온', phone: '044', tourAreaCode: '8', moiCode: '36' },
  GYEONGGI: { label: '경기온', phone: '031', tourAreaCode: '31', moiCode: '41' },
  GANGWON: { label: '강원온', phone: '033', tourAreaCode: '32', moiCode: '51' },
  CHUNGBUK: { label: '충북온', phone: '043', tourAreaCode: '33', moiCode: '43' },
  CHUNGNAM: { label: '충남온', phone: '041', tourAreaCode: '34', moiCode: '44' },
  JEONBUK: { label: '전북온', phone: '063', tourAreaCode: '35', moiCode: '52' },
  JEONNAM: { label: '전남온', phone: '061', tourAreaCode: '36', moiCode: '46' },
  GYEONGBUK: { label: '경북온', phone: '054', tourAreaCode: '37', moiCode: '47' },
  GYEONGNAM: { label: '경남온', phone: '055', tourAreaCode: '38', moiCode: '48' },
  JEJU: { label: '제주온', phone: '064', tourAreaCode: '39', moiCode: '50' },
};

const REGION_LABEL = Object.fromEntries(Object.entries(REGION_META).map(([id, meta]) => [id, meta.label]));
const REGION_PHONE = Object.fromEntries(Object.entries(REGION_META).map(([id, meta]) => [id, meta.phone]));
const AREA_CODE_BY_METRO = Object.fromEntries(Object.entries(REGION_META).map(([id, meta]) => [id, meta.tourAreaCode]));
const MOI_CODE_BY_METRO = Object.fromEntries(Object.entries(REGION_META).map(([id, meta]) => [id, meta.moiCode]));
const METRO_SOURCE_PREFIX = {
  SEOUL: 'SEOUL',
  BUSAN: 'BUSAN',
  DAEGU: 'DAEGU',
  INCHEON: 'INCHEON',
  GWANGJU: 'GWANGJU',
  DAEJEON: 'DAEJEON',
  ULSAN: 'ULSAN',
  SEJONG: 'SEJONG',
  GYEONGGI: 'GG',
  GANGWON: 'GANGWON',
  CHUNGBUK: 'CHUNGBUK',
  CHUNGNAM: 'CHUNGNAM',
  JEONBUK: 'JEONBUK',
  JEONNAM: 'JEONNAM',
  GYEONGBUK: 'GYEONGBUK',
  GYEONGNAM: 'GYEONGNAM',
  JEJU: 'JEJU',
};

function metroSourcePrefix(metro) {
  return METRO_SOURCE_PREFIX[metro] || metro;
}

const METRO_AREA = {
  ...AREA_CODE_BY_METRO,
  CHUNGCHEONG: '34',
  JEOLLA: '35',
  GYEONGSANG: '38',
};

const METRO_LOCALITIES = {
  SEOUL: cities([
    '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구',
    '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구',
    '구로구', '금천구', '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구',
  ]),
  BUSAN: cities(
    ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
    '부산',
  ),
  DAEGU: cities(['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'], '대구'),
  INCHEON: cities([
    '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군',
  ], '인천'),
  GWANGJU: cities(['동구', '서구', '남구', '북구', '광산구'], '광주'),
  DAEJEON: cities(['동구', '중구', '서구', '유성구', '대덕구'], '대전'),
  ULSAN: cities(['중구', '남구', '동구', '북구', '울주군'], '울산'),
  SEJONG: [{ id: '세종시', label: '세종시' }],
  GYEONGGI: cities([
    '수원시', '용인시', '고양시', '화성시', '성남시', '부천시', '남양주시', '안산시',
    '안양시', '평택시', '시흥시', '파주시', '김포시', '의정부시', '광주시', '하남시',
    '광명시', '군포시', '오산시', '이천시', '양주시', '구리시', '안성시', '포천시',
    '의왕시', '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군',
  ]),
  GANGWON: cities([
    '춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시',
    '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군',
    '양구군', '인제군', '고성군', '양양군',
  ]),
  CHUNGBUK: cities(
    ['청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
    '충북',
  ),
  CHUNGNAM: cities(
    ['천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
    '충남',
  ),
  JEONBUK: cities(
    ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
    '전북',
  ),
  JEONNAM: cities(
    ['목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
    '전남',
  ),
  GYEONGBUK: cities(
    ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
    '경북',
  ),
  GYEONGNAM: cities(
    ['창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
    '경남',
  ),
  JEJU: cities(['제주시', '서귀포시']),
};

function officerDisplayName(label) {
  const text = String(label || '');
  if (text.includes(' ') || /(구)$/.test(text)) return `${text} 담당`;
  return `${text.replace(/(시|군)$/, '')} 담당`;
}

function matchingId(region, loc) {
  return `${region}:${loc.id}`;
}

function matchingRows() {
  return Object.entries(METRO_LOCALITIES).flatMap(([region, locs]) =>
    locs.map((loc, index) => {
      const meta = REGION_META[region] || {};
      return {
        id: matchingId(region, loc),
        region,
        regionalZone: region,
        regionLabel: meta.label || REGION_LABEL[region],
        tourAreaCode: meta.tourAreaCode,
        moiCode: meta.moiCode,
        couponType: region === 'GYEONGGI' ? 'OFFICIAL' : 'SELF',
        city: loc.label,
        officerName: index % 7 === 0 ? '' : officerDisplayName(loc.label),
        phone: index % 7 === 0 ? '' : `${REGION_PHONE[region]}-120`,
        stores: 4 + (index % 5),
        festivals: 1 + (index % 3),
        coupons: 8 + (index % 11),
        approved: index % 7 !== 0,
      };
    }),
  );
}

function feedRewardRows() {
  const samples = [
    { zone: 'GYEONGGI', city: '수원시', festival: '수원화성문화제', user: '수원나들이', amount: 1000, status: 'PAID' },
    { zone: 'GYEONGGI', city: '가평군', festival: '가평 자라섬 재즈페스티벌', user: '재즈키드', amount: 1000, status: 'PENDING' },
    { zone: 'SEOUL', city: '종로구', festival: '서울거리예술축제', user: '광장탐험가', amount: 1000, status: 'PAID' },
    { zone: 'INCHEON', city: '연수구', festival: '인천펜타포트락페스티벌', user: '송도락커', amount: 1000, status: 'PENDING' },
    { zone: 'BUSAN', city: '수영구', festival: '부산불꽃축제', user: '광안리야행', amount: 1000, status: 'PAID' },
    { zone: 'DAEGU', city: '수성구', festival: '대구치맥페스티벌', user: '치맥러버', amount: 1000, status: 'PENDING' },
    { zone: 'GWANGJU', city: '서구', festival: '광주김치축제', user: '김치여행', amount: 1000, status: 'PAID' },
    { zone: 'DAEJEON', city: '중구', festival: '대전 0시 축제', user: '대전야행', amount: 1000, status: 'PENDING' },
    { zone: 'ULSAN', city: '남구', festival: '울산고래축제', user: '고래마을', amount: 1000, status: 'PAID' },
    { zone: 'SEJONG', city: '세종시', festival: '세종축제', user: '세종탐험가', amount: 1000, status: 'PENDING' },
    { zone: 'GANGWON', city: '춘천시', festival: '춘천마임축제', user: '마임광장', amount: 1000, status: 'PAID' },
    { zone: 'CHUNGBUK', city: '청주시', festival: '청주직지축제', user: '직지기록가', amount: 1000, status: 'PENDING' },
    { zone: 'CHUNGNAM', city: '보령시', festival: '보령머드축제', user: '머드여행', amount: 1000, status: 'PAID' },
    { zone: 'JEONBUK', city: '전주시', festival: '전주한지문화축제', user: '한옥골목', amount: 1000, status: 'PENDING' },
    { zone: 'JEONNAM', city: '여수시', festival: '여수밤바다불꽃축제', user: '밤바다러버', amount: 1000, status: 'PAID' },
    { zone: 'GYEONGBUK', city: '경주시', festival: '경주벚꽃축제', user: '대릉원벚꽃', amount: 1000, status: 'PENDING' },
    { zone: 'GYEONGNAM', city: '진주시', festival: '진주남강유등축제', user: '유등산책', amount: 1000, status: 'PAID' },
    { zone: 'JEJU', city: '제주시', festival: '제주들불축제', user: '오름들불', amount: 1000, status: 'PENDING' },
  ];
  return samples.map((row, index) => {
    const meta = REGION_META[row.zone] || REGION_META.GYEONGGI;
    return {
      id: `FR-${String(index + 1).padStart(4, '0')}`,
      userName: row.user,
      festival: row.festival,
      city: row.city,
      regionalZone: row.zone,
      regionLabel: meta.label,
      amountWon: row.amount,
      points: 1000,
      postedAt: '2026-08-22',
      status: row.status,
    };
  });
}

export {
  LEGACY_METRO_ALIASES,
  normalizeMetroId,
  REGION_META,
  REGION_LABEL,
  REGION_PHONE,
  AREA_CODE_BY_METRO,
  MOI_CODE_BY_METRO,
  METRO_AREA,
  METRO_LOCALITIES,
  METRO_SOURCE_PREFIX,
  metroSourcePrefix,
  officerDisplayName,
  matchingRows,
  feedRewardRows,
};
