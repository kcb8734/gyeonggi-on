import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isUsableMediaUrl, secureMediaUrl } from './mediaUrl';

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
  assert.equal(secureMediaUrl('asset://festival-fallback/GYEONGGI'), '');
});

test('asset:// 와 빈 값은 Image에 넘기지 않는다', () => {
  assert.equal(isUsableMediaUrl('asset://festival-fallback/GYEONGGI'), false);
  assert.equal(isUsableMediaUrl('https://images.unsplash.com/photo-1.jpg'), true);
  assert.equal(isUsableMediaUrl('blob:https://www.kdanji.com/1'), true);
  assert.equal(isUsableMediaUrl(''), false);
});
