import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OSM_LEAFLET_HTML } from './osmLeafletHtml';

test('native map html uses OpenStreetMap tiles instead of Google Maps', () => {
  assert.match(OSM_LEAFLET_HTML, /tile\.openstreetmap\.org/);
  assert.match(OSM_LEAFLET_HTML, /leaflet@1\.9\.4/);
  assert.match(OSM_LEAFLET_HTML, /__onandonPaint/);
  assert.match(OSM_LEAFLET_HTML, /__onandonSetView/);
  assert.doesNotMatch(OSM_LEAFLET_HTML, /maps\.googleapis\.com/);
});
