import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFestivalCourse } from './festivalCourse';

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
});
