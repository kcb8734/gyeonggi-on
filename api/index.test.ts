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

