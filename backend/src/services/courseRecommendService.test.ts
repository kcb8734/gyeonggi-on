import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFestivalCourse } from './courseRecommendService';

test('jangdan bean festival uses specified course title', () => {
  const course = buildFestivalCourse({ title: '장단콩 축제' });
  assert.equal(course.course_title, '[파주] 장단콩 축제와 함께하는 역사·캠핑 힐링 투어');
  assert.equal(course.itinerary.length, 4);
  assert.equal(course.itinerary[2].category, '메인 축제');
  assert.match(course.local_benefit_tip, /On&On/);
});
