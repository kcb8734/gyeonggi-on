function cities(names, area) {
  return names.map((name) => ({
    id: area ? `${area}-${name}` : name,
    label: area ? `${area} ${name}` : name,
  }));
}

const REGION_LABEL = {
  GYEONGGI: '경기온',
  SEOUL: '서울온',
  INCHEON: '인천온',
  GANGWON: '강원온',
  CHUNGCHEONG: '충청온',
  JEOLLA: '전라온',
  GYEONGSANG: '경상온',
  JEJU: '제주온',
};

const REGION_PHONE = {
  GYEONGGI: '031',
  SEOUL: '02',
  INCHEON: '032',
  GANGWON: '033',
  CHUNGCHEONG: '041',
  JEOLLA: '063',
  GYEONGSANG: '055',
  JEJU: '064',
};

const METRO_LOCALITIES = {
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
  ]),
  INCHEON: cities([
    '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군',
  ], '인천'),
  GANGWON: cities([
    '춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시',
    '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군',
    '양구군', '인제군', '고성군', '양양군',
  ]),
  CHUNGCHEONG: [
    ...cities(['동구', '중구', '서구', '유성구', '대덕구'], '대전'),
    { id: '세종시', label: '세종시' },
    ...cities(
      ['청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
      '충북',
    ),
    ...cities(
      ['천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
      '충남',
    ),
  ],
  JEOLLA: [
    ...cities(['동구', '서구', '남구', '북구', '광산구'], '광주'),
    ...cities(
      ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
      '전북',
    ),
    ...cities(
      ['목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
      '전남',
    ),
  ],
  GYEONGSANG: [
    ...cities(['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'], '대구'),
    ...cities(['중구', '남구', '동구', '북구', '울주군'], '울산'),
    ...cities(
      ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
      '부산',
    ),
    ...cities(
      ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
      '경북',
    ),
    ...cities(
      ['창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
      '경남',
    ),
  ],
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
    locs.map((loc, index) => ({
      id: matchingId(region, loc),
      region,
      regionLabel: REGION_LABEL[region],
      couponType: region === 'GYEONGGI' ? 'OFFICIAL' : 'SELF',
      city: loc.label,
      officerName: index % 7 === 0 ? '' : officerDisplayName(loc.label),
      phone: index % 7 === 0 ? '' : `${REGION_PHONE[region]}-120`,
      stores: 4 + (index % 5),
      festivals: 1 + (index % 3),
      coupons: 8 + (index % 11),
      approved: index % 7 !== 0,
    })),
  );
}

export {
  REGION_LABEL,
  REGION_PHONE,
  METRO_LOCALITIES,
  officerDisplayName,
  matchingRows,
};
