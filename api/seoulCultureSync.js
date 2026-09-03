import { persistTourFestivals, listFestivalCategoryCounts, writeTourSyncLog } from './festivalDbSync.js';
import { fetchXml, logOpenApiEmpty } from './openApiFetch.js';
import { countCategories, parseSeoulCultureXml, toPersistableFestival } from './seoulCultureXml.js';

export const SEOUL_CULTURE_API_NAME = 'culturalEventInfo';
export const SEOUL_CULTURE_API_HOSTS = [
  'https://openapi.seoul.go.kr:8088',
  'http://openapi.seoul.go.kr:8088',
];
export const SEOUL_CULTURE_API_BASE = SEOUL_CULTURE_API_HOSTS[1];
export const DEFAULT_SEOUL_CULTURE_API_KEY = '4b63445a616b6362323166754e7a43';

export function seoulCultureApiKey() {
  if (Object.prototype.hasOwnProperty.call(process.env, 'SEOUL_CULTURE_API_KEY')) {
    return String(process.env.SEOUL_CULTURE_API_KEY || '').trim();
  }
  if (process.env.SEOUL_OPENAPI_KEY) return String(process.env.SEOUL_OPENAPI_KEY).trim();
  if (process.env.NODE_TEST_CONTEXT) return '';
  return DEFAULT_SEOUL_CULTURE_API_KEY;
}

function buildPageUrl(host, key, start, end) {
  return `${host}/${encodeURIComponent(key)}/xml/${SEOUL_CULTURE_API_NAME}/${start}/${end}/`;
}

export async function fetchSeoulCulturePage(start = 1, end = 1000, fetchImpl = fetch) {
  const key = seoulCultureApiKey();
  if (!key) {
    console.error('[culturalEventInfo] skip', { code: 'NO_KEY', hasKey: false, start, end });
    return { ok: false, code: 'NO_KEY', message: 'SEOUL_CULTURE_API_KEY가 없습니다.', total: 0, rows: [] };
  }
  let last = { ok: false, code: 'FETCH', message: '서울시 문화행사 API에 연결하지 못했습니다.', total: 0, rows: [] };
  for (const host of SEOUL_CULTURE_API_HOSTS) {
    try {
      const got = await fetchXml(buildPageUrl(host, key, start, end), fetchImpl, {
        label: 'culturalEventInfo',
        timeoutMs: 7000,
      });
      const parsed = parseSeoulCultureXml(got.xml);
      if (!got.ok && parsed.ok) {
        last = { ok: false, code: String(got.status), message: `HTTP ${got.status}`, total: 0, rows: [] };
        continue;
      }
      if (!parsed.ok) {
        logOpenApiEmpty('culturalEventInfo', {
          code: parsed.code,
          message: parsed.message,
          hasKey: true,
          httpStatus: got.status,
          xmlBytes: String(got.xml || '').length,
          parsedRows: parsed.rows.length,
          preview: got.xml,
        });
      } else if (!parsed.rows.length) {
        logOpenApiEmpty('culturalEventInfo', {
          code: parsed.code || 'EMPTY',
          message: parsed.message || '파싱된 <row>가 없습니다.',
          hasKey: true,
          httpStatus: got.status,
          xmlBytes: String(got.xml || '').length,
          parsedRows: 0,
          preview: got.xml,
        });
      }
      return parsed;
    } catch (err) {
      last = {
        ok: false,
        code: 'TIMEOUT',
        message: err && err.message ? err.message : '서울시 문화행사 API 시간이 초과되었습니다.',
        total: 0,
        rows: [],
      };
    }
  }
  return last;
}

export async function collectSeoulCultureEvents(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const pageSize = Math.min(1000, Math.max(1, Number(options.pageSize) || 80));
  const maxPages = Math.min(10, Math.max(1, Number(options.maxPages) || 1));
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
  if (collected.ok && collected.rows.length && !items.length) {
    logOpenApiEmpty('culturalEventInfo', {
      code: 'MAP_EMPTY',
      message: 'XML row는 있으나 persist 매핑 결과가 0건입니다.',
      hasKey: true,
      parsedRows: collected.rows.length,
      mappedRows: 0,
      preview: JSON.stringify(collected.rows[0] || {}).slice(0, 180),
    });
  }
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
