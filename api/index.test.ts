import assert from 'node:assert/strict';
import { test } from 'node:test';
// @ts-expect-error Vercel function is plain JS
import handler from './index.js';

function invoke(req: { method?: string; url?: string; body?: unknown; headers?: Record<string, string> }) {
  return new Promise<{ status: number; body: unknown }>((resolve) => {
    const res = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader(key: string, value: string) { this.headers[key] = value; },
      status(code: number) { this.statusCode = code; return this; },
      json(body: unknown) { resolve({ status: this.statusCode, body }); },
      end(raw?: string) {
        resolve({ status: this.statusCode, body: raw ? JSON.parse(raw) : null });
      },
    };
    void handler(req, res);
  });
}

test('GET /health returns ok without Express', async () => {
  const result = await invoke({ method: 'GET', url: '/health' });
  assert.equal(result.status, 200);
  assert.equal((result.body as { status: string }).status, 'ok');
  assert.equal(typeof (result.body as { tour?: boolean }).tour, 'boolean');
});

test('POST without business_number is treated as health', async () => {
  const result = await invoke({ method: 'POST', url: '/api', body: { title: '쿠폰' } });
  assert.equal(result.status, 200);
  assert.equal((result.body as { status: string }).status, 'ok');
});

test('GET /api/tour/nearby without coordinates returns 400', async () => {
  const result = await invoke({ method: 'GET', url: '/api/tour/nearby' });
  assert.equal(result.status, 400);
});

test('GET /api/home is not a 404', async () => {
  const result = await invoke({ method: 'GET', url: '/api/home?metro=GYEONGGI' });
  assert.notEqual(result.status, 404);
});

test('POST /api/festivals/sync returns a sync payload', async () => {
  const result = await invoke({ method: 'POST', url: '/api/festivals/sync' });
  assert.notEqual(result.status, 404);
  assert.notEqual(result.status, 401);
  const body = result.body as { fetched?: number; message?: string; success?: boolean };
  assert.equal(typeof body.message, 'string');
  assert.equal(typeof body.fetched, 'number');
});

test('GET /api/centers returns 17 region summaries', async () => {
  const result = await invoke({ method: 'GET', url: '/api/centers' });
  assert.equal(result.status, 200);
  const rows = (result.body as { data: Array<{ id: string; total: number; selected: number }> }).data;
  assert.equal(rows.length, 17);
  const gyeonggi = rows.find((row) => row.id === 'GYEONGGI');
  assert.equal(gyeonggi?.total, 31);
  assert.equal(gyeonggi?.selected, 3);
});

test('GET /api/centers/GYEONGGI lists suwon as selected', async () => {
  const result = await invoke({ method: 'GET', url: '/api/centers/GYEONGGI' });
  assert.equal(result.status, 200);
  const rows = (result.body as { data: Array<{ label: string; status: string; applicantCount?: number }> }).data;
  assert.equal(rows.length, 31);
  assert.equal(rows.find((row) => row.label === '수원시')?.status, 'selected');
  assert.equal(rows.find((row) => row.label === '용인시')?.applicantCount, 1);
});

test('POST /api/centers/apply then admin card apply', async () => {
  const apply = await invoke({
    method: 'POST',
    url: '/api/centers/apply',
    body: {
      localityKey: 'GANGWON:춘천시',
      name: '홍길동',
      age: '42',
      phone: '010-1234-5678',
      email: 'chuncheon@kdanji.com',
      address: '강원특별자치도 춘천시 중앙로 123, 3층',
      career: '춘천 축제 기획',
      intro: '마임축제와 중앙시장을 잇겠습니다.',
    },
  });
  assert.equal(apply.status, 200);
  const applied = apply.body as { success: boolean; data: { id: string } };
  assert.equal(applied.success, true);
  const listed = await invoke({ method: 'GET', url: '/api/centers/applications' });
  assert.equal(listed.status, 200);
  const rows = (listed.body as { data: Array<{ name: string; address?: string }> }).data;
  assert.ok(rows.some((row) => row.name === '홍길동' && row.address?.includes('춘천시')));
  const card = await invoke({
    method: 'POST',
    url: `/api/centers/applications/${applied.data.id}/card`,
    body: {},
  });
  assert.equal(card.status, 200);
  const chuncheon = await invoke({ method: 'GET', url: '/api/centers/GANGWON' });
  const cities = (chuncheon.body as { data: Array<{ label: string; status: string; director?: { website?: string } }> }).data;
  assert.equal(cities.find((row) => row.label === '춘천시')?.status, 'selected');
  assert.equal(cities.find((row) => row.label === '춘천시')?.director?.website, 'kdanji.com/chuncheon');
});

test('GET /api/centers/courses returns suwon seed and POST stays pending until approve', async () => {
  const listed = await invoke({ method: 'GET', url: '/api/centers/courses?regionId=수원시' });
  assert.equal(listed.status, 200);
  const rows = (listed.body as { data: Array<{ regionId: string; title: string; status?: string }> }).data;
  assert.ok(rows.some((row) => row.regionId === '수원시' && row.status === 'approved'));
  const created = await invoke({
    method: 'POST',
    url: '/api/centers/courses',
    body: {
      regionId: '강릉시',
      metro: 'GANGWON',
      centerId: 'GANGWON:강릉시',
      title: '강릉 커피 하루 코스',
      description: '오죽헌과 중앙시장',
      images: [],
      historyCourse: { name: '오죽헌', description: '율곡 유적' },
      marketFoodCourse: { name: '강릉 중앙시장', description: '닭강정' },
      mainAxis: { name: '강릉커피축제', description: '메인' },
      campingAccommodation: { name: '경포해변 캠핑장', description: '숙박' },
    },
  });
  assert.equal(created.status, 200);
  const saved = created.body as { success: boolean; data: { id: string; title: string; status: string } };
  assert.equal(saved.success, true);
  assert.equal(saved.data.title, '강릉 커피 하루 코스');
  assert.equal(saved.data.status, 'pending');
  const publicList = await invoke({ method: 'GET', url: '/api/centers/courses?regionId=강릉시' });
  const publicRows = (publicList.body as { data: Array<{ title: string }> }).data;
  assert.equal(publicRows.some((row) => row.title === '강릉 커피 하루 코스'), false);
  const review = await invoke({ method: 'GET', url: '/api/centers/courses?review=1' });
  const pending = (review.body as { data: Array<{ id: string; title: string }> }).data;
  assert.ok(pending.some((row) => row.id === saved.data.id));
  const approved = await invoke({
    method: 'POST',
    url: `/api/centers/courses/${saved.data.id}/approve`,
    body: {},
  });
  assert.equal(approved.status, 200);
  const after = await invoke({ method: 'GET', url: '/api/centers/courses?regionId=강릉시' });
  const afterRows = (after.body as { data: Array<{ title: string; status: string }> }).data;
  assert.ok(afterRows.some((row) => row.title === '강릉 커피 하루 코스' && row.status === 'approved'));
});

test('course auth register login change and admin reset', async () => {
  const centerId = 'GANGWON:속초시';
  const missing = await invoke({
    method: 'POST',
    url: '/api/centers/course-auth',
    body: { centerId, mode: 'login', password: 'abcd' },
  });
  assert.equal(missing.status, 400);
  const registered = await invoke({
    method: 'POST',
    url: '/api/centers/course-auth',
    body: { centerId, mode: 'register', password: 'abcd', confirm: 'abcd' },
  });
  assert.equal(registered.status, 200);
  const status = await invoke({ method: 'GET', url: `/api/centers/course-auth?centerId=${encodeURIComponent(centerId)}` });
  assert.equal((status.body as { hasPassword: boolean }).hasPassword, true);
  const login = await invoke({
    method: 'POST',
    url: '/api/centers/course-auth',
    body: { centerId, mode: 'login', password: 'abcd' },
  });
  assert.equal(login.status, 200);
  const changed = await invoke({
    method: 'POST',
    url: '/api/centers/course-auth',
    body: { centerId, mode: 'change', currentPassword: 'abcd', nextPassword: 'wxyz', confirm: 'wxyz' },
  });
  assert.equal(changed.status, 200);
  const reset = await invoke({
    method: 'POST',
    url: '/api/centers/course-auth/reset',
    body: { centerId },
  });
  assert.equal(reset.status, 200);
  const after = await invoke({ method: 'GET', url: `/api/centers/course-auth?centerId=${encodeURIComponent(centerId)}` });
  assert.equal((after.body as { hasPassword: boolean }).hasPassword, false);
});

test('GET /api/courses/recommend for suwon uses center director course', async () => {
  const result = await invoke({ method: 'GET', url: '/api/courses/recommend?title=수원화성문화제&city=수원시' });
  assert.equal(result.status, 200);
  const course = (result.body as { data: { course_title: string; itinerary: Array<{ category: string }> } }).data;
  assert.match(course.course_title, /수원/);
  assert.equal(course.itinerary.length, 4);
  assert.ok(course.itinerary.some((item) => item.category.includes('역사')));
});

test('POST /api/centers/courses/:id/review stores rejected and hides from public list', async () => {
  const created = await invoke({
    method: 'POST',
    url: '/api/centers/courses',
    body: {
      regionId: '속초시',
      metro: 'GANGWON',
      centerId: 'GANGWON:속초시',
      title: '속초 해오름 코스',
      description: '중앙시장과 해변',
      images: [],
      historyCourse: { name: '속초등대', description: '전망' },
      marketFoodCourse: { name: '속초 중앙시장', description: '닭강정' },
      mainAxis: { name: '설악문화제', description: '메인' },
      campingAccommodation: { name: '설악 캠핑', description: '숙박' },
    },
  });
  assert.equal(created.status, 200);
  const id = (created.body as { data?: { id?: string } }).data?.id;
  assert.ok(id);
  const rejected = await invoke({
    method: 'POST',
    url: `/api/centers/courses/${id}/review`,
    body: { status: 'rejected' },
  });
  assert.equal(rejected.status, 200);
  assert.equal((rejected.body as { data: { status: string } }).data.status, 'rejected');
  const listed = await invoke({ method: 'GET', url: '/api/centers/courses?review=1' });
  const row = ((listed.body as { data: Array<{ id: string; status: string }> }).data || []).find((item) => item.id === id);
  assert.equal(row?.status, 'rejected');
  const publicList = await invoke({ method: 'GET', url: '/api/centers/courses?regionId=속초시' });
  assert.equal(((publicList.body as { data: Array<{ id: string }> }).data || []).some((item) => item.id === id), false);
});

