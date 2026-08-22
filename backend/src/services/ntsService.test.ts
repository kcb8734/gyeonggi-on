import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ACTIVE_BUSINESS_STATUS_CODE,
  fetchBusinessStatus,
  isValidBusinessNumber,
  normalizeBusinessNumber,
  NtsLookupError,
  rejectionMessage,
} from './ntsService';

test('normalizeBusinessNumber strips hyphens and spaces', () => {
  assert.equal(normalizeBusinessNumber('123-45-67890'), '1234567890');
  assert.equal(normalizeBusinessNumber('123 45 67890'), '1234567890');
});

test('isValidBusinessNumber accepts only 10 digits', () => {
  assert.equal(isValidBusinessNumber('123-45-67890'), true);
  assert.equal(isValidBusinessNumber('123456789'), false);
  assert.equal(isValidBusinessNumber('abcdefghij'), false);
});

test('fetchBusinessStatus marks 계속사업자 as active', async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({
      status_code: 'OK',
      data: [{
        b_no: '1234567890',
        b_stt: '계속사업자',
        b_stt_cd: ACTIVE_BUSINESS_STATUS_CODE,
        tax_type: '부가가치세 일반과세자',
        tax_type_cd: '01',
        end_dt: '',
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const status = await fetchBusinessStatus('123-45-67890', {
    serviceKey: 'test-key',
    fetchImpl,
  });
  assert.equal(status.isActive, true);
  assert.equal(status.b_stt_cd, '01');
});

test('fetchBusinessStatus rejects unregistered numbers', async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({
      status_code: 'OK',
      data: [{
        b_no: '0000000000',
        b_stt: '',
        b_stt_cd: '',
        tax_type: '국세청에 등록되지 않은 사업자등록번호입니다.',
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const status = await fetchBusinessStatus('0000000000', {
    serviceKey: 'test-key',
    fetchImpl,
  });
  assert.equal(status.isActive, false);
  assert.match(rejectionMessage(status), /국세청에 등록되지 않은/);
});

test('fetchBusinessStatus throws on missing service key', async () => {
  const prev = process.env.NTS_SERVICE_KEY;
  delete process.env.NTS_SERVICE_KEY;
  await assert.rejects(
    () => fetchBusinessStatus('1234567890', { serviceKey: '' }),
    (err: unknown) => err instanceof NtsLookupError && err.statusCode === 500,
  );
  if (prev !== undefined) process.env.NTS_SERVICE_KEY = prev;
});

test('fetchBusinessStatus rejects invalid NTS_SERVICE_KEY with HTTP 401', async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ code: 401, msg: 'UNAUTHORIZED' }), { status: 401 });

  await assert.rejects(
    () => fetchBusinessStatus('1234567890', { serviceKey: 'bad-key', fetchImpl }),
    (err: unknown) =>
      err instanceof NtsLookupError
      && err.statusCode === 401
      && /NTS_SERVICE_KEY/.test(err.message)
      && !/bad-key/.test(err.message),
  );
});

test('fetchBusinessStatus posts b_no array to NTS status endpoint', async () => {
  let calledUrl = '';
  let calledBody = '';
  const fetchImpl: typeof fetch = async (input, init) => {
    calledUrl = String(input);
    calledBody = String(init?.body ?? '');
    return new Response(JSON.stringify({
      status_code: 'OK',
      data: [{ b_no: '1234567890', b_stt: '계속사업자', b_stt_cd: '01' }],
    }), { status: 200 });
  };

  await fetchBusinessStatus('1234567890', { serviceKey: 'abc+key', fetchImpl });
  assert.match(calledUrl, /serviceKey=abc%2Bkey/);
  assert.equal(calledBody, JSON.stringify({ b_no: ['1234567890'] }));
});
