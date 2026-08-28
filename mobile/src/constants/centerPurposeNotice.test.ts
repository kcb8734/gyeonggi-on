import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CENTER_PURPOSE_NOTICE_TITLE, CENTER_PURPOSE_SECTIONS } from './centerPurposeNotice';

test('운영 취지 공지문에 229개 센터장 문구가 있다', () => {
  assert.match(CENTER_PURPOSE_NOTICE_TITLE, /229개 지역 센터장/);
  assert.equal(CENTER_PURPOSE_SECTIONS.length, 3);
  assert.match(CENTER_PURPOSE_SECTIONS[0].heading, /소상공인/);
  assert.match(CENTER_PURPOSE_SECTIONS[1].heading, /지자체/);
  assert.match(CENTER_PURPOSE_SECTIONS[2].heading, /센터장/);
});
