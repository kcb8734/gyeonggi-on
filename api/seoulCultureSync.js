import { persistTourFestivals, listFestivalCategoryCounts, writeTourSyncLog } from './festivalDbSync.js';
import { countCategories, parseSeoulCultureXml, toPersistableFestival } from './seoulCultureXml.js';

export const SEOUL_CULTURE_API_NAME = 'culturalEventInfo';
export const SEOUL_CULTURE_API_BASE = 'http://openapi.seoul.go.kr:8088';
export const DEFAULT_SEOUL_CULTURE_API_KEY = '61794c4e756b63623132304c79785a44';

export function seoulCultureApiKey() {
  if (Object.prototype.hasOwnProperty.call(process.env, 'SEOUL_CULTURE_API_KEY')) {
    return String(process.env.SEOUL_CULTURE_API_KEY || '').trim();
  }
  if (process.env.SEOUL_OPENAPI_KEY) return String(process.env.SEOUL_OPENAPI_KEY).trim();
  if (process.env.NODE_TEST_CONTEXT) return '';
  return DEFAULT_SEOUL_CULTURE_API_KEY;
}

function buildPageUrl(key, start, end) {
  return `${SEOUL_CULTURE_API_BASE}/${encodeURIComponent(key)}/xml/${SEOUL_CULTURE_API_NAME}/${start}/${end}/`;
}

export async function fetchSeoulCulturePage(start = 1, end = 1000, fetchImpl = fetch) {
  const key = seoulCultureApiKey();
  if (!key) {
    return { ok: false, code: 'NO_KEY', message: 'SEOUL_CULTURE_API_KEY가 없습니다.', total: 0, rows: [] };
  }
  const res = await fetchImpl(buildPageUrl(key, start, end), {
    headers: { Accept: 'application/xml,text/xml,*/*' },
  });
  const xml = await res.text();
  const parsed = parseSeoulCultureXml(xml);
  if (!res.ok && parsed.ok) {
    return { ok: false, code: String(res.status), message: `HTTP ${res.status}`, total: 0, rows: [] };
  }
  return parsed;
}

export async function collectSeoulCultureEvents(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const pageSize = Math.min(1000, Math.max(1, Number(options.pageSize) || 1000));
  const maxPages = Math.min(10, Math.max(1, Number(options.maxPages) || 5));
  const first = await fetchSeoulCulturePage(1, pageSize, fetchImpl);
  if (!first.ok) return first;
  const rows = [...first.rows];
  const total = first.total || rows.length;
  const pages = Math.min(maxPages, Math.max(1, Math.ceil(total / pageSize)));
  for (let page = 2; page <= pages; page += 1) {
    const start = (page - 1) * pageSize + 1;
    const end = page * pageSize;
    const next = await fetchSeoulCulturePage(start, end, fetchImpl);
    if (!next.ok) break;
    rows.push(...next.rows);
    if (!next.rows.length) break;
  }
  return {
    ok: true,
    code: first.code,
    message: first.message,
    total,
    rows,
  };
}

export async function syncSeoulCultureEvents(options = {}) {
  const collected = await collectSeoulCultureEvents(options);
  if (!collected.ok) {
    await writeTourSyncLog({
      targetApi: SEOUL_CULTURE_API_NAME,
      fetched: 0,
      failed: 1,
      status: '실패',
      message: collected.message,
    });
    return {
      success: false,
      source: SEOUL_CULTURE_API_NAME,
      sourceLabel: '서울시 문화행사 culturalEventInfo',
      targetApi: SEOUL_CULTURE_API_NAME,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      failed: 1,
      categories: [],
      count: 0,
      message: collected.message,
    };
  }
  const items = collected.rows.map(toPersistableFestival).filter(Boolean);
  const persist = await persistTourFestivals(items, { source: 'seoul', metro: 'SEOUL' });
  const categories = persist.ok
    ? await listFestivalCategoryCounts()
    : countCategories(collected.rows);
  await writeTourSyncLog({
    targetApi: SEOUL_CULTURE_API_NAME,
    fetched: persist.upserted || items.length,
    failed: persist.ok ? 0 : 1,
    status: persist.ok ? '정상' : '실패',
    message: persist.message,
  });
  return {
    success: persist.ok || items.length > 0,
    source: SEOUL_CULTURE_API_NAME,
    sourceLabel: '서울시 문화행사 culturalEventInfo',
    targetApi: SEOUL_CULTURE_API_NAME,
    fetched: collected.rows.length,
    total: collected.total,
    upserted: persist.upserted,
    skipped: persist.skipped,
    persisted: persist.ok,
    failed: persist.ok ? 0 : 1,
    categories,
    count: categories.reduce((sum, row) => sum + Number(row.count || 0), 0) || persist.upserted || items.length,
    message: persist.ok
      ? `서울시 문화행사 ${persist.upserted}건을 수집·적재했습니다.`
      : `서울시 문화행사 ${items.length}건을 파싱했습니다. ${persist.message}`,
  };
}
