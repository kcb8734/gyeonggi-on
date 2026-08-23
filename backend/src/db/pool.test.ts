import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseHost, isNeonHost, shouldUseSsl } from './pool';
import { errorText } from './diagnose';

test('databaseHost and Neon SSL detection', () => {
  const neon = 'postgresql://user:pass@ep-foo.ap-northeast-2.aws.neon.tech/neondb?sslmode=require';
  assert.equal(databaseHost(neon), 'ep-foo.ap-northeast-2.aws.neon.tech');
  assert.equal(isNeonHost(databaseHost(neon)), true);
  assert.equal(shouldUseSsl(neon), true);
  assert.equal(shouldUseSsl('postgresql://postgres:postgres@localhost:5432/gyeonggi_on'), false);
  assert.equal(shouldUseSsl('postgresql://u:p@db.example.com/app?sslmode=disable'), false);
});

test('errorText never returns an empty string', () => {
  assert.equal(errorText(new Error('password authentication failed')), 'password authentication failed');
  assert.match(errorText({}), /비어/);
  assert.match(errorText(''), /비어/);
  const aggregate = new AggregateError([Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' })]);
  assert.match(errorText(aggregate), /ECONNREFUSED/);
});
