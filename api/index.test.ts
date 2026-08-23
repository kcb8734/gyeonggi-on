import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler from './index';

function invoke(req: { method?: string; url?: string; body?: unknown; headers?: Record<string, string> }) {
  return new Promise<{ status: number; body: unknown }>((resolve) => {
    const res = {
      code: 200,
      payload: null as unknown,
      setHeader() {},
      status(n: number) { this.code = n; return this; },
      json(body: unknown) { resolve({ status: this.code, body }); },
      end() { resolve({ status: this.code, body: this.payload }); },
    };
    void handler(req, res);
  });
}

test('GET /health returns ok without Express', async () => {
  const result = await invoke({ method: 'GET', url: '/health' });
  assert.equal(result.status, 200);
  assert.equal((result.body as { status: string }).status, 'ok');
});

test('POST without business_number is not treated as verify', async () => {
  const result = await invoke({ method: 'POST', url: '/api', body: { title: '쿠폰' } });
  assert.equal(result.status, 405);
});
