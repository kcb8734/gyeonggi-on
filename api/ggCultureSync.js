import { persistTourFestivals, listFestivalCategoryCounts, writeTourSyncLog } from './festivalDbSync.js';
import { fetchXml } from './openApiFetch.js';
import { countCategories, parseGgCultureXml, toPersistableFestival } from './ggCultureXml.js';

export const GG_CULTURE_API_NAME = 'GGCULTUREVENTSTUS';
export const GG_CULTURE_API_BASE = 'https://openapi.gg.go.kr/GGCULTUREVENTSTUS';

export function ggCultureApiKey() {
  return String(
    process.env.GG_CULTURE_API_KEY
    || process.env.GGCULTURE_API_KEY
    || process.env.GG_OPENAPI_KEY
    || '',
  ).trim();
}

function buildPageUrl(key, page, size) {
  const url = new URL(GG_CULTURE_API_BASE);
  url.searchParams.set('KEY', key);
  url.searchParams.set('Type', 'xml');
  url.searchParams.set('pIndex', String(page));
  url.searchParams.set('pSize', String(size));
  return url.toString();
}

export async function fetchGgCulturePage(page = 1, size = 1000, fetchImpl = fetch) {
  const key = ggCultureApiKey();
  if (!key) {
    console.error('[GGCULTUREVENTSTUS] skip', { code: 'NO_KEY', hasKey: false, page, size });
    return { ok: false, code: 'NO_KEY', message: 'GG_CULTURE_API_KEY가 없습니다.', total: 0, rows: [] };
  }
  try {
    const got = await fetchXml(buildPageUrl(key, page, size), fetchImpl, {
      label: 'GGCULTUREVENTSTUS',
      timeoutMs: 7000,
    });
    const parsed = parseGgCultureXml(got.xml);
    if (!got.ok && parsed.ok) {
      return { ok: false, code: String(got.status), message: `HTTP ${got.status}`, total: 0, rows: [] };
    }
    if (!parsed.ok) {
      console.error('[GGCULTUREVENTSTUS] parse/result', { code: parsed.code, message: parsed.message, hasKey: true });
    }
    return parsed;
  } catch (err) {
    return {
      ok: false,
      code: 'TIMEOUT',
      message: err && err.message ? err.message : '경기도 문화행사 API 시간이 초과되었습니다.',
      total: 0,
      rows: [],
    };
  }
}

export async function collectGgCultureEvents(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const pageSize = Math.min(1000, Math.max(1, Number(options.pageSize) || 80));
  const maxPages = Math.min(8, Math.max(1, Number(options.maxPages) || 1));
  const first = await fetchGgCulturePage(1, pageSize, fetchImpl);
  if (!first.ok) return first;
  const rows = [...first.rows];
  const total = first.total || rows.length;
  const pages = Math.min(maxPages, Math.max(1, Math.ceil(total / pageSize)));
  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchGgCulturePage(page, pageSize, fetchImpl);
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

export async function syncGgCultureEvents(options = {}) {
  const collected = await collectGgCultureEvents(options);
  if (!collected.ok) {
    await writeTourSyncLog({
      targetApi: GG_CULTURE_API_NAME,
      fetched: 0,
      failed: 1,
      status: '실패',
      message: collected.message,
    });
    return {
      success: false,
      source: GG_CULTURE_API_NAME,
      sourceLabel: '경기도 문화행사 GGCULTUREVENTSTUS',
      targetApi: GG_CULTURE_API_NAME,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      failed: 1,
      categories: [],
      message: collected.message,
    };
  }
  const items = collected.rows.map(toPersistableFestival).filter(Boolean);
  const persist = await persistTourFestivals(items, { source: 'ggc' });
  const categories = persist.ok
    ? await listFestivalCategoryCounts()
    : countCategories(collected.rows);
  await writeTourSyncLog({
    targetApi: GG_CULTURE_API_NAME,
    fetched: persist.upserted || items.length,
    failed: persist.ok ? 0 : 1,
    status: persist.ok ? '정상' : '실패',
    message: persist.message,
  });
  return {
    success: persist.ok || items.length > 0,
    source: GG_CULTURE_API_NAME,
    sourceLabel: '경기도 문화행사 GGCULTUREVENTSTUS',
    targetApi: GG_CULTURE_API_NAME,
    fetched: collected.rows.length,
    total: collected.total,
    upserted: persist.upserted,
    skipped: persist.skipped,
    persisted: persist.ok,
    failed: persist.ok ? 0 : 1,
    categories,
    count: categories.reduce((sum, row) => sum + Number(row.count || 0), 0) || persist.upserted || items.length,
    message: persist.ok
      ? `경기도 문화행사 ${persist.upserted}건을 수집·적재했습니다.`
      : `경기도 문화행사 ${items.length}건을 파싱했습니다. ${persist.message}`,
  };
}
