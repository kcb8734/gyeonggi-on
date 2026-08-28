import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFestivalCourse, shouldRejectRemoteCourse } from './festivalCourse';

test('강릉커피축제 코스는 오죽헌·중앙시장 좌표를 쓴다', () => {
  const course = buildFestivalCourse({
    title: '강릉커피축제',
    city: '강릉시',
    address: '강원특별자치도 강릉시',
    metro: 'GANGWON',
    latitude: 37.7519,
    longitude: 128.8761,
  });
  assert.match(course.course_title, /강릉/);
  assert.match(course.itinerary[0].place_name, /오죽헌/);
  assert.ok((course.itinerary[0].latitude ?? 0) > 37.7);
  assert.ok((course.itinerary[0].longitude ?? 0) > 128.8);
  assert.equal(course.itinerary[2].latitude, 37.7519);
  assert.equal(course.itinerary[2].category, '메인 축제');
});

test('경기 광주 원조할매보리밥은 광주광역시 명소와 메인 축제 UI를 쓰지 않는다', () => {
  const course = buildFestivalCourse({
    title: '원조할매보리밥',
    address: '경기도 광주시 새말길 328 (신현동)',
    metro: 'GYEONGGI',
    latitude: 37.352,
    longitude: 127.331,
    contentTypeId: '39',
    kind: 'food',
  });
  assert.match(course.course_title, /\[광주시\].*맛집/);
  assert.equal(course.itinerary[2].category, '맛집');
  assert.match(course.itinerary[2].description, /음식점 소개|메뉴/);
  assert.match(course.itinerary[0].place_name, /남한산성|경기도자/);
  assert.match(course.itinerary[3].place_name, /화담숲|곤지암/);
  assert.doesNotMatch(
    course.itinerary.map((step) => `${step.category} ${step.place_name} ${step.description}`).join('\n'),
    /메인 축제|무등산|아시아문화전당|핵심 프로그램|체험 부스|현장 가맹점에서/,
  );
  assert.match(course.local_benefit_tip, /추후 준비/);
});

test('광주광역시 김치축제는 ACC·무등산 코스를 유지한다', () => {
  const course = buildFestivalCourse({
    title: '광주김치축제',
    address: '광주광역시 서구',
    metro: 'GWANGJU',
    latitude: 35.16,
    longitude: 126.85,
  });
  assert.match(course.course_title, /광주광역시/);
  assert.equal(course.itinerary[2].category, '메인 축제');
  assert.match(course.itinerary[0].place_name, /아시아문화전당|양림/);
  assert.match(course.itinerary[3].place_name, /무등산/);
});

test('남양주 코스는 양주 장흥이 아니다', () => {
  const namyangju = buildFestivalCourse({
    title: '수종사',
    address: '경기도 남양주시',
    metro: 'GYEONGGI',
    contentTypeId: '12',
  });
  assert.match(namyangju.itinerary[0].place_name, /수종사|정약용/);
  const yangju = buildFestivalCourse({
    title: '장흥관광지',
    address: '경기도 양주시',
    metro: 'GYEONGGI',
    contentTypeId: '12',
  });
  assert.match(yangju.itinerary[0].place_name, /장흥|관아지/);
});

test('경기 광주 맛집에 광주광역시 동선이 오면 원격 코스를 버린다', () => {
  const remote = buildFestivalCourse({
    title: '광주김치축제',
    address: '광주광역시',
    metro: 'GWANGJU',
  });
  assert.equal(
    shouldRejectRemoteCourse(remote, {
      title: '원조할매보리밥',
      address: '경기도 광주시 새말길 328 (신현동)',
      metro: 'GYEONGGI',
      latitude: 37.352,
      longitude: 127.331,
    }),
    true,
  );
});

test('안산·여주·부천·서울 코스는 해당 시·군 안에서만 매칭한다', () => {
  const ansan = buildFestivalCourse({
    title: '안산별망성축제',
    city: '안산시',
    address: '경기도 안산시 단원구',
    metro: 'GYEONGGI',
    latitude: 37.3215,
    longitude: 126.8308,
  });
  assert.match(ansan.course_title, /\[안산\]/);
  assert.match(ansan.itinerary[0].place_name, /성호|별망성|안산/);
  assert.match(ansan.itinerary[1].place_name, /안산 중앙시장|전통시장/);
  assert.equal(ansan.itinerary[2].latitude, 37.3215);
  assert.equal(ansan.itinerary[2].longitude, 126.8308);
  assert.doesNotMatch(ansan.itinerary.map((step) => step.place_name).join(' '), /수원화성|영동시장|광교호수|한국민속촌/);

  const yeoju = buildFestivalCourse({
    title: '여주오곡나루축제',
    city: '여주시',
    address: '경기도 여주시',
    metro: 'GYEONGGI',
    latitude: 37.2983,
    longitude: 127.6374,
  });
  assert.match(yeoju.course_title, /\[여주\]/);
  assert.match(yeoju.itinerary[0].place_name, /세종대왕릉|신륵사|여주/);
  assert.doesNotMatch(yeoju.itinerary.map((step) => step.place_name).join(' '), /수원화성|영동시장|여수 진남관/);
  assert.equal(yeoju.itinerary[2].latitude, 37.2983);

  const bucheon = buildFestivalCourse({
    title: '부천국제만화축제',
    city: '부천시',
    address: '경기도 부천시 원미구',
    metro: 'GYEONGGI',
    latitude: 37.5038,
    longitude: 126.7909,
  });
  assert.match(bucheon.course_title, /\[부천\]/);
  assert.match(bucheon.itinerary[0].place_name, /한옥마을|활박물관|부천/);
  assert.doesNotMatch(bucheon.itinerary.map((step) => step.place_name).join(' '), /수원화성|영동시장/);

  const seoul = buildFestivalCourse({
    title: '서울거리예술축제',
    city: '서울특별시',
    address: '서울특별시 종로구',
    metro: 'SEOUL',
    latitude: 37.5720,
    longitude: 126.9769,
  });
  assert.match(seoul.course_title, /\[서울\]/);
  assert.match(seoul.itinerary[0].place_name, /경복궁|북촌/);
  assert.match(seoul.itinerary[1].place_name, /광장시장/);
  assert.doesNotMatch(seoul.itinerary.map((step) => step.place_name).join(' '), /수원화성|영동시장/);
});

test('경기도만 있고 시·군이 없으면 수원 기본값 대신 축제 GPS 주변 동선을 쓴다', () => {
  const course = buildFestivalCourse({
    title: '서해 해변 축제',
    city: '경기도',
    metro: 'GYEONGGI',
    latitude: 37.3215,
    longitude: 126.8308,
  });
  assert.doesNotMatch(course.itinerary.map((step) => step.place_name).join(' '), /수원화성|영동시장|광교호수/);
  assert.equal(course.itinerary[2].latitude, 37.3215);
  for (const step of course.itinerary) {
    if (!step.latitude) continue;
    const dLat = Math.abs(Number(step.latitude) - 37.3215);
    const dLng = Math.abs(Number(step.longitude) - 126.8308);
    assert.ok(dLat < 0.05 && dLng < 0.05, `${step.place_name} left the festival locality`);
  }
});

test('수원 동선이 안산 축제에 오면 원격 코스를 버린다', () => {
  const remote = buildFestivalCourse({
    title: '수원화성문화제',
    city: '수원시',
    address: '경기도 수원시',
    metro: 'GYEONGGI',
  });
  assert.equal(
    shouldRejectRemoteCourse(remote, {
      title: '안산별망성축제',
      city: '안산시',
      address: '경기도 안산시 단원구',
      metro: 'GYEONGGI',
      latitude: 37.3215,
      longitude: 126.8308,
    }),
    true,
  );
});
