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
  assert.match(course.local_benefit_tip, /On&On/);
});

test('generic festival detail title still resolves boryeong landmarks', () => {
  const course = buildFestivalCourse({ title: '축제 상세', city: '보령시', metro: 'CHUNGCHEONG', latitude: 36.333, longitude: 126.612 });
  assert.match(course.course_title, /보령/);
  assert.match(course.itinerary[0].place_name, /성주사|대천/);
  assert.notEqual(course.itinerary[0].place_name.includes('수원화성'), true);
  assert.equal(course.itinerary[2].latitude, 36.333);
});

test('non-gyeonggi festivals use local course and self-discount tip', () => {
  const yeosu = buildFestivalCourse({ title: '여수밤바다불꽃축제', metro: 'JEOLLA', latitude: 34.7604, longitude: 127.6622 });
  assert.match(yeosu.course_title, /여수/);
  assert.match(yeosu.itinerary[0].place_name, /진남관|오동도/);
  assert.equal(yeosu.itinerary[2].latitude, 34.7604);
  assert.match(yeosu.local_benefit_tip, /자율 할인/);

  const jeju = buildFestivalCourse({ title: '제주들불축제', metro: 'JEJU' });
  assert.match(jeju.course_title, /제주/);
  assert.match(jeju.itinerary[1].place_name, /동문재래시장/);
});
