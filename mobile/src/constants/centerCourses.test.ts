import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  centerCourseToFestivalCourse,
  findCenterCourseForPlace,
  listCenterCourses,
  upsertCenterCourse,
} from './centerCourses';

test('수원 시드 코스가 4대 카테고리를 가진다', () => {
  const suwon = listCenterCourses('수원시', 'GYEONGGI')[0];
  assert.ok(suwon);
  assert.equal(suwon.historyCourse.name.includes('화성'), true);
  assert.ok(suwon.marketFoodCourse.name);
  assert.ok(suwon.mainAxis.name);
  assert.ok(suwon.campingAccommodation.name);
  const festival = centerCourseToFestivalCourse(suwon);
  assert.equal(festival.itinerary.length, 4);
  assert.match(festival.course_title, /수원시/);
});

test('안산 축제에는 수원 시드 코스가 붙지 않는다', () => {
  assert.equal(findCenterCourseForPlace({ title: '안산별망성축제', city: '안산시' }), null);
  assert.ok(findCenterCourseForPlace({ title: '수원화성문화제', city: '수원시' }));
});

test('센터장 코스를 같은 지역에 upsert하면 갱신된다', () => {
  const saved = upsertCenterCourse({
    regionId: '춘천시',
    metro: 'GANGWON',
    centerId: 'GANGWON:춘천시',
    title: '춘천 닭갈비 하루 코스',
    description: '중앙시장과 중도를 잇는 현장 코스',
    images: [],
    historyCourse: { name: '남이섬', description: '호수 산책' },
    marketFoodCourse: { name: '춘천 중앙시장', description: '닭갈비' },
    mainAxis: { name: '춘천마임축제', description: '메인 동선' },
    campingAccommodation: { name: '중도 캠핑장', description: '호수 숙박' },
  });
  assert.equal(saved.regionId, '춘천시');
  const again = upsertCenterCourse({
    ...saved,
    title: '춘천 호수 개정 코스',
  });
  assert.equal(again.id, saved.id);
  assert.equal(listCenterCourses('춘천시')[0].title, '춘천 호수 개정 코스');
});
