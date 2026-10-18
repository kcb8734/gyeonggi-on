import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TAB_BAR_CONTENT_HEIGHT, tabBarStyleForInset } from './safeTabBar';

test('tab bar grows by the system inset instead of overlapping it', () => {
  const none = tabBarStyleForInset(0);
  assert.equal(none.paddingBottom, 8);
  assert.equal(none.height, TAB_BAR_CONTENT_HEIGHT + 8);

  const nav = tabBarStyleForInset(48);
  assert.equal(nav.paddingBottom, 48);
  assert.equal(nav.height, TAB_BAR_CONTENT_HEIGHT + 48);
  assert.ok(nav.height > none.height);
});
