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
