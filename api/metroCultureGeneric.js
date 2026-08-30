import { persistTourFestivals, listFestivalCategoryCounts, writeTourSyncLog } from './festivalDbSync.js';
import { fetchXml, redactOpenApiUrl } from './openApiFetch.js';
import { REGION_LABEL, normalizeMetroId } from './metroLocalities.js';
import { municipalSlot } from './metroOpenSources.js';

function text(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return text(value[0]);
  if (typeof value === 'object') return text(value._ || value.$t || value.text || '');
  return String(value).trim();
}

function pick(row, keys) {
  for (const key of keys) {
    if (row && row[key] != null && text(row[key])) return text(row[key]);
  }
  const lower = {};
  Object.keys(row || {}).forEach((key) => { lower[key.toLowerCase()] = row[key]; });
  for (const key of keys) {
    const hit = lower[String(key).toLowerCase()];
    if (hit != null && text(hit)) return text(hit);
  }
  return '';
}

function ymd(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return '';
}

function xmlRows(xml) {
  const chunks = String(xml || '').match(/<row[\s>][\s\S]*?<\/row>/gi) || [];
  return chunks.map((chunk) => {
    const row = {};
    const tags = chunk.matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g);
    for (const match of tags) {
      row[match[1]] = match[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    }
    return row;
  });
}

function jsonItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const paths = [
    payload.items,
    payload.data,
    payload.row,
    payload.rows,
    payload.response?.body?.items?.item,
    payload.response?.body?.items,
    payload.body?.items?.item,
    payload.body?.items,
  ];
  for (const value of paths) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) return [value];
  }
  return [];
}

export function rowsToFestivals(rows, metro) {
  const zone = normalizeMetroId(metro);
  const prefix = zone.slice(0, 3).toLowerCase();
  return (rows || []).map((row, index) => {
    const title = pick(row, ['title', 'TITLE', 'eventNm', 'EVENT_NM', 'fstvlNm', 'FSTVL_NM', 'name', 'NAME', 'cntntsSj']);
    const start = ymd(pick(row, ['eventStartDate', 'BEGIN_DE', 'fstvlStartDate', 'FSTVL_BEGIN_DE', 'STRTDATE', 'startDate', 'eventStartDe', 'opnBgngDt']))
      || new Date().toISOString().slice(0, 10);
    const end = ymd(pick(row, ['eventEndDate', 'END_DE', 'fstvlEndDate', 'FSTVL_END_DE', 'END_DATE', 'endDate', 'eventEndDe', 'opnEndDt'])) || start;
    const address = pick(row, ['address', 'rdnmadr', 'lnmadr', 'PLACE', 'eventPlace', 'FSTVL_PLACE', 'location', 'adres']);
    const contentId = pick(row, ['contentId', 'contentid', 'fstvlId', 'id', 'CULTCODE', 'seq'])
      || `${prefix}-${Buffer.from(`${title}|${start}|${index}`).toString('hex').slice(0, 16)}`;
    if (!title) return null;
    return {
      contentId: String(contentId).slice(0, 40),
      title,
      address,
      location_name: address,
      eventStartDate: start,
      eventEndDate: end,
      firstImage: pick(row, ['firstImage', 'IMAGE_URL', 'MAIN_IMG', 'imageUrl', 'fstvlCo', 'imgUrl']),
      mapY: Number(pick(row, ['mapY', 'LAT', 'latitude', 'lat']) || 0) || undefined,
      mapX: Number(pick(row, ['mapX', 'LOT', 'longitude', 'lng', 'lon']) || 0) || undefined,
      tel: pick(row, ['tel', 'TELNO_INFO', 'phone', 'INQUIRY']),
      category: pick(row, ['category', 'CATEGORY_NM', 'CODENAME', 'realmName']) || '문화/예술',
      overview: pick(row, ['overview', 'auspcInstt', 'program', 'eventCn']),
      metro: zone,
      source: 'muni',
    };
  }).filter(Boolean);
}

function injectKey(url, key) {
  if (!url) return '';
  if (url.includes('{KEY}')) return url.replace('{KEY}', encodeURIComponent(key));
  const next = new URL(url);
  if (!next.searchParams.get('serviceKey') && !next.searchParams.get('KEY') && !next.searchParams.get('key')) {
    next.searchParams.set('serviceKey', key);
  }
  return next.toString();
}

export async function syncMunicipalCultureEvents(metro, options = {}) {
  const zone = normalizeMetroId(metro);
  const slot = municipalSlot(zone);
  const targetApi = `${zone}_CULTURE`;
  const label = `${REGION_LABEL[zone] || zone} 지자체 OpenAPI`;
  if (!slot.ready) {
    const message = `${slot.urlEnv} 와 ${slot.keyEnv} 를 설정하면 ${label} 수집이 켜집니다.`;
    return {
      success: false,
      source: 'muni',
      sourceLabel: label,
      targetApi,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      persisted: false,
      failed: 0,
      categories: [],
      ready: false,
      message,
    };
  }
  const key = String(process.env[slot.keyEnv] || '').trim();
  const url = injectKey(String(process.env[slot.urlEnv] || '').trim(), key);
  try {
    const got = await fetchXml(url, options.fetchImpl || fetch, { label: targetApi, timeoutMs: 7000 });
    let rows = xmlRows(got.xml);
    if (!rows.length) {
      try { rows = jsonItems(JSON.parse(got.xml)); } catch { rows = []; }
    }
    const items = rowsToFestivals(rows, zone).slice(0, Number(options.pageSize || 80));
    const persist = await persistTourFestivals(items, { source: 'muni', metro: zone });
    const categories = persist.ok ? await listFestivalCategoryCounts() : [];
    await writeTourSyncLog({
      targetApi,
      fetched: items.length,
      failed: persist.ok ? 0 : 1,
      status: persist.ok ? '정상' : '부분',
      message: persist.message,
    });
    return {
      success: items.length > 0,
      source: 'muni',
      sourceLabel: label,
      targetApi,
      fetched: items.length,
      upserted: persist.upserted,
      skipped: persist.skipped,
      persisted: persist.ok,
      failed: persist.ok ? 0 : 1,
      categories,
      message: items.length
        ? `${label} ${persist.upserted || items.length}건을 수집했습니다.`
        : `${label} 응답에 행이 없습니다. (${redactOpenApiUrl(url)})`,
    };
  } catch (err) {
    const message = err && err.message ? err.message : `${label} 수집에 실패했습니다.`;
    console.error('[muni-sync]', zone, message);
    await writeTourSyncLog({ targetApi, fetched: 0, failed: 1, status: '실패', message });
    return {
      success: false,
      source: 'muni',
      sourceLabel: label,
      targetApi,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      persisted: false,
      failed: 1,
      categories: [],
      message,
    };
  }
}
