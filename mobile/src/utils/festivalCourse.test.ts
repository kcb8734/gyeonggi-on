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
