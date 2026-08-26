import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFestivalCourse } from './courseRecommendService';

test('jangdan bean festival uses specified course title', () => {
  const course = buildFestivalCourse({ title: '장단콩 축제' });
  assert.match(course.course_title, /파주.*장단콩/);
  assert.equal(course.itinerary.length, 4);
  assert.match(course.itinerary[0].place_name, /임진각|도라전망대/);
  assert.notEqual(course.itinerary[0].place_name, '파주 대표 역사 명소');
  assert.equal(course.itinerary[2].category, '메인 축제');
  assert.ok(course.itinerary[0].latitude);
  assert.match(course.local_benefit_tip, /추후 준비/);
});

test('generic festival detail title still resolves boryeong landmarks', () => {
  const course = buildFestivalCourse({ title: '축제 상세', city: '보령시', metro: 'CHUNGCHEONG', latitude: 36.333, longitude: 126.612 });
  assert.match(course.course_title, /보령/);
  assert.match(course.itinerary[0].place_name, /성주사|대천/);
  assert.notEqual(course.itinerary[0].place_name.includes('수원화성'), true);
  assert.equal(course.itinerary[2].latitude, 36.333);
});

test('non-gyeonggi festivals use local course and coming-soon coupon tip', () => {
  const yeosu = buildFestivalCourse({ title: '여수밤바다불꽃축제', metro: 'JEOLLA', latitude: 34.7604, longitude: 127.6622 });
  assert.match(yeosu.course_title, /여수/);
  assert.match(yeosu.itinerary[0].place_name, /진남관|오동도/);
  assert.equal(yeosu.itinerary[2].latitude, 34.7604);
  assert.match(yeosu.local_benefit_tip, /추후 준비/);
  assert.doesNotMatch(yeosu.local_benefit_tip, /자율 할인/);

  const jeju = buildFestivalCourse({ title: '제주들불축제', metro: 'JEJU' });
  assert.match(jeju.course_title, /제주/);
  assert.match(jeju.itinerary[1].place_name, /동문재래시장/);
});

test('경기 광주 맛집은 광주광역시 코스로 묶지 않는다', () => {
  const course = buildFestivalCourse({
    title: '원조할매보리밥',
    address: '경기도 광주시 새말길 328 (신현동)',
    metro: 'GYEONGGI',
    latitude: 37.352,
    longitude: 127.331,
    contentTypeId: '39',
    kind: 'food',
  });
  assert.match(course.course_title, /광주시.*맛집/);
  assert.equal(course.itinerary[2].category, '맛집');
  assert.match(course.itinerary[2].description, /음식점 소개/);
  assert.doesNotMatch(course.itinerary[2].category, /메인 축제/);
  assert.doesNotMatch(course.itinerary[2].description, /핵심 프로그램|체험 부스/);
  assert.match(course.itinerary[0].place_name, /남한산성|경기도자/);
  assert.match(course.itinerary[1].place_name, /경안시장/);
  assert.match(course.itinerary[3].place_name, /화담숲|곤지암/);
  assert.doesNotMatch(course.itinerary.map((step) => step.place_name).join(' '), /무등산|아시아문화전당|양림|대인시장/);
  assert.match(course.itinerary[1].description, /추후 준비/);
  assert.match(course.itinerary[2].description, /추후 준비/);
  assert.doesNotMatch(course.itinerary.map((step) => step.description).join(' '), /현장 가맹점에서 On&On\+ 쿠폰을 사용/);
});

test('강릉 축제는 메인 축제 카테고리를 유지한다', () => {
  const course = buildFestivalCourse({
    title: '강릉커피축제',
    city: '강릉시',
    metro: 'GANGWON',
    latitude: 37.7519,
    longitude: 128.8761,
  });
  assert.equal(course.itinerary[2].category, '메인 축제');
  assert.match(course.itinerary[2].description, /추후 준비/);
  assert.doesNotMatch(course.itinerary[2].description, /핵심 프로그램|체험 부스/);
});
