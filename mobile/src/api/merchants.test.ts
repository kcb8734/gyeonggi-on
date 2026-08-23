import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyMerchantUrls } from './merchants';

test('apex kdanji.com skips 308 origin and localhost', () => {
  assert.deepEqual(
    verifyMerchantUrls({
      hostname: 'kdanji.com',
      origin: 'https://kdanji.com',
      apiBaseUrl: 'https://www.kdanji.com',
      isDev: false,
    }),
    ['https://www.kdanji.com/api/merchants/verify'],
  );
});

test('www uses same-origin then canonical once', () => {
  assert.deepEqual(
    verifyMerchantUrls({
      hostname: 'www.kdanji.com',
      origin: 'https://www.kdanji.com',
      apiBaseUrl: 'https://www.kdanji.com',
      isDev: false,
    }),
    ['https://www.kdanji.com/api/merchants/verify'],
  );
});

test('local preview keeps metro and 127.0.0.1', () => {
  const urls = verifyMerchantUrls({
    hostname: 'localhost',
    origin: 'http://localhost:19006',
    apiBaseUrl: '',
    isDev: true,
  });
  assert.ok(urls.includes('http://localhost:19006/api/merchants/verify'));
  assert.ok(urls.includes('http://127.0.0.1:4000/api/merchants/verify'));
  assert.ok(!urls.includes('https://www.kdanji.com/api/merchants/verify'));
});
