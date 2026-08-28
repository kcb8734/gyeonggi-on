import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  centerCourseToFestivalCourse,
  findCenterCourseForPlace,
  listCenterCourses,
  upsertCenterCourse,
} from './centerCourses';

test('suwon seed course maps to four itinerary stops', () => {
  const suwon = listCenterCourses('수원시')[0];
  assert.ok(suwon);
  const course = centerCourseToFestivalCourse(suwon);
  assert.equal(course.itinerary.length, 4);
  assert.match(course.course_title, /수원/);
});

test('place matcher prefers suwon for suwon festivals only', () => {
  assert.ok(findCenterCourseForPlace({ city: '수원시', title: '수원화성문화제' }));
  assert.equal(findCenterCourseForPlace({ city: '안산시', title: '안산별망성축제' }), null);
});

test('upsert creates a new locality course', () => {
  const result = upsertCenterCourse({
    regionId: '여수시',
    metro: 'JEONNAM',
    centerId: 'JEONNAM:전남-여수시',
    title: '여수 밤바다 코스',
    description: '교동시장과 밤바다',
    images: [],
    historyCourse: { name: '오동도', description: '동백' },
    marketFoodCourse: { name: '교동시장', description: '서대회' },
    mainAxis: { name: '여수밤바다불꽃축제', description: '메인' },
    campingAccommodation: { name: '돌산 캠핑', description: '숙박' },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(listCenterCourses('여수시')[0].title, '여수 밤바다 코스');
});
