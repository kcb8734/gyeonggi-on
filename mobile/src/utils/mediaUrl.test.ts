import assert from 'node:assert/strict';
import { test } from 'node:test';
import { secureMediaUrl } from './mediaUrl';

test('TourAPI http 이미지를 https로 올린다', () => {
  assert.equal(
    secureMediaUrl('http://tong.visitkorea.or.kr/cms/photo.jpg'),
    'https://tong.visitkorea.or.kr/cms/photo.jpg',
  );
  assert.equal(secureMediaUrl('https://example.com/a.jpg'), 'https://example.com/a.jpg');
  assert.equal(secureMediaUrl(''), '');
  assert.equal(secureMediaUrl('null'), '');
  assert.equal(secureMediaUrl('  undefined  '), '');
  assert.equal(secureMediaUrl('-'), '');
});
