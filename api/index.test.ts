import assert from 'node:assert/strict';
import { test } from 'node:test';
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
});

test('POST without business_number is treated as health', async () => {
  const result = await invoke({ method: 'POST', url: '/api', body: { title: '쿠폰' } });
  assert.equal(result.status, 200);
  assert.equal((result.body as { status: string }).status, 'ok');
});
