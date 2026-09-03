import { persistTourFestivals, listFestivalCategoryCounts, writeTourSyncLog } from './festivalDbSync.js';
import { fetchXml, logOpenApiEmpty } from './openApiFetch.js';
import { countCategories, parseIfacCultureXml, toPersistableFestival } from './ifacCultureXml.js';

export const IFAC_CULTURE_API_NAME = 'ifac-culture';
export const IFAC_CULTURE_API_HOSTS = [
  'https://ifac.or.kr/openAPI/real/search.do',
  'http://ifac.or.kr/openAPI/real/search.do',
];

export function ifacCultureApiKey() {
  return String(
    process.env.INCHEON_API_KEY
    || process.env.IFAC_API_KEY
    || process.env.INCHEON_CULTURE_API_KEY
    || '',
  ).trim();
}

export function ymdOffset(days = 0, from = new Date()) {
  const date = new Date(from.getTime());
  date.setDate(date.getDate() + Number(days || 0));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function buildIfacCultureUrl(host, key, page, size, range = {}) {
  const url = new URL(host);
  url.searchParams.set('apiKey', key);
  url.searchParams.set('svid', 'culture');
  url.searchParams.set('svID', 'culture');
  url.searchParams.set('resultType', 'xml');
  url.searchParams.set('pSize', String(size));
  url.searchParams.set('cPage', String(page));
  url.searchParams.set('srh_periodType', 'p');
  url.searchParams.set('srh_sDate', range.start || ymdOffset(-30));
  url.searchParams.set('srh_eDate', range.end || ymdOffset(365));
  return url.toString();
}

export async function fetchIfacCulturePage(page = 1, size = 80, fetchImpl = fetch, range = {}) {
  const key = ifacCultureApiKey();
  if (!key) {
    console.error('[ifac-culture] skip', { code: 'NO_KEY', hasKey: false, page, size });
    return { ok: false, code: 'NO_KEY', message: 'INCHEON_API_KEY가 없습니다.', total: 0, rows: [] };
  }
  let last = { ok: false, code: 'FETCH', message: '인천문화재단 API에 연결하지 못했습니다.', total: 0, rows: [] };
  for (const host of IFAC_CULTURE_API_HOSTS) {
    try {
      const got = await fetchXml(buildIfacCultureUrl(host, key, page, size, range), fetchImpl, {
        label: 'ifac-culture',
        timeoutMs: 7000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OnAndonPlus/1.0; +https://www.kdanji.com)',
          Referer: 'https://ifac.or.kr/',
        },
      });
      const parsed = parseIfacCultureXml(got.xml);
      if (!got.ok && parsed.ok) {
        last = { ok: false, code: String(got.status), message: `HTTP ${got.status}`, total: 0, rows: [] };
        continue;
      }
      if (!parsed.ok) {
        logOpenApiEmpty('ifac-culture', {
          code: parsed.code,
          message: parsed.message,
          hasKey: true,
          httpStatus: got.status,
          xmlBytes: String(got.xml || '').length,
          parsedRows: parsed.rows.length,
          preview: got.xml,
        });
      } else if (!parsed.rows.length) {
        logOpenApiEmpty('ifac-culture', {
          code: parsed.code || 'EMPTY',
          message: parsed.message || '파싱된 <item>이 없습니다.',
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
        message: err && err.message ? err.message : '인천문화재단 API 시간이 초과되었습니다.',
        total: 0,
        rows: [],
      };
    }
  }
  return last;
}

export async function collectIfacCultureEvents(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 80));
  const maxPages = Math.min(8, Math.max(1, Number(options.maxPages) || 1));
  const range = {
    start: options.startDate || ymdOffset(-30),
    end: options.endDate || ymdOffset(365),
  };
  const first = await fetchIfacCulturePage(1, pageSize, fetchImpl, range);
  if (!first.ok) return first;
  const rows = [...first.rows];
  const total = first.total || rows.length;
  const pages = Math.min(maxPages, Math.max(1, Math.ceil(total / pageSize)));
  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchIfacCulturePage(page, pageSize, fetchImpl, range);
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

export async function syncIfacCultureEvents(options = {}) {
  const collected = await collectIfacCultureEvents(options);
  if (!collected.ok) {
    await writeTourSyncLog({
      targetApi: IFAC_CULTURE_API_NAME,
      fetched: 0,
      failed: 1,
      status: '실패',
      message: collected.message,
    });
    return {
      success: false,
      source: IFAC_CULTURE_API_NAME,
      sourceLabel: '인천문화재단 문화예술행사',
      targetApi: IFAC_CULTURE_API_NAME,
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
    logOpenApiEmpty('ifac-culture', {
      code: 'MAP_EMPTY',
      message: 'XML item은 있으나 persist 매핑 결과가 0건입니다.',
      hasKey: true,
      parsedRows: collected.rows.length,
      mappedRows: 0,
    });
  }
  const persist = await persistTourFestivals(items, { source: 'ifac', metro: 'INCHEON' });
  const categories = persist.ok
    ? await listFestivalCategoryCounts()
    : countCategories(collected.rows);
  await writeTourSyncLog({
    targetApi: IFAC_CULTURE_API_NAME,
    fetched: persist.upserted || items.length,
    failed: persist.ok ? 0 : 1,
    status: persist.ok ? '정상' : '실패',
    message: persist.message,
  });
  return {
    success: persist.ok || items.length > 0,
    source: IFAC_CULTURE_API_NAME,
    sourceLabel: '인천문화재단 문화예술행사',
    targetApi: IFAC_CULTURE_API_NAME,
    fetched: collected.rows.length,
    total: collected.total,
    upserted: persist.upserted,
    skipped: persist.skipped,
    persisted: persist.ok,
    failed: persist.ok ? 0 : 1,
    categories,
    count: categories.reduce((sum, row) => sum + Number(row.count || 0), 0) || persist.upserted || items.length,
    message: persist.ok
      ? `인천문화재단 문화행사 ${persist.upserted}건을 수집·적재했습니다.`
      : `인천문화재단 문화행사 ${items.length}건을 파싱했습니다. ${persist.message}`,
  };
}
