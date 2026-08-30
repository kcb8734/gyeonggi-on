import { pool, tryQuery } from '../db/pool';
import { ensureMunicipalityId } from './festivalSyncService';
import {
  countCategories,
  parseIfacCultureXml,
  toPersistableFestival,
  type PersistableIfacFestival,
} from './ifacCultureXml';

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

export function buildIfacCultureUrl(host: string, key: string, page: number, size: number, range: { start?: string; end?: string } = {}) {
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

export async function fetchIfacCulturePage(page = 1, size = 80, fetchImpl: typeof fetch = fetch, range: { start?: string; end?: string } = {}) {
  const key = ifacCultureApiKey();
  if (!key) {
    return { ok: false, code: 'NO_KEY', message: 'INCHEON_API_KEY가 없습니다.', total: 0, rows: [] as ReturnType<typeof parseIfacCultureXml>['rows'] };
  }
  let last = { ok: false, code: 'FETCH', message: '인천문화재단 API에 연결하지 못했습니다.', total: 0, rows: [] as ReturnType<typeof parseIfacCultureXml>['rows'] };
  for (const host of IFAC_CULTURE_API_HOSTS) {
    try {
      const res = await fetchImpl(buildIfacCultureUrl(host, key, page, size, range), {
        headers: { Accept: 'application/xml,text/xml,*/*' },
        signal: AbortSignal.timeout(7000),
      });
      const xml = await res.text();
      const parsed = parseIfacCultureXml(xml);
      if (!res.ok && parsed.ok) {
        last = { ok: false, code: String(res.status), message: `HTTP ${res.status}`, total: 0, rows: [] };
        continue;
      }
      return parsed;
    } catch (err) {
      last = {
        ok: false,
        code: 'TIMEOUT',
        message: err instanceof Error ? err.message : '인천문화재단 API 시간이 초과되었습니다.',
        total: 0,
        rows: [],
      };
    }
  }
  return last;
}

export async function collectIfacCultureEvents(options: {
  fetchImpl?: typeof fetch;
  pageSize?: number;
  maxPages?: number;
  startDate?: string;
  endDate?: string;
} = {}) {
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

async function upsertIfacFestivals(items: PersistableIfacFestival[]) {
  let upserted = 0;
  let skipped = 0;
  for (const item of items) {
    if (!item.contentId || !item.title || !item.eventStartDate) {
      skipped += 1;
      continue;
    }
    const municipalityId = await ensureMunicipalityId(`${item.address} ${item.title}`, item.metro || 'INCHEON');
    const start = item.eventStartDate.slice(0, 10);
    const end = (item.eventEndDate || item.eventStartDate).slice(0, 10);
    await pool.query(
      `INSERT INTO festivals (
         municipality_id, title, description, start_date, end_date,
         location_name, latitude, longitude, category, image_url, is_trending,
         tour_content_id, tel, source
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10, $11,
         $12, $13, $14
       )
       ON CONFLICT (tour_content_id) DO UPDATE SET
         title = EXCLUDED.title,
         description = COALESCE(EXCLUDED.description, festivals.description),
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         location_name = EXCLUDED.location_name,
         category = EXCLUDED.category,
         image_url = COALESCE(EXCLUDED.image_url, festivals.image_url),
         is_trending = EXCLUDED.is_trending,
         tel = COALESCE(EXCLUDED.tel, festivals.tel),
         source = EXCLUDED.source`,
      [
        municipalityId,
        item.title.slice(0, 100),
        item.overview || null,
        start,
        end,
        (item.location_name || item.address || '').slice(0, 150) || null,
        null,
        null,
        item.category.slice(0, 30),
        item.firstImage || null,
        Boolean(item.firstImage),
        item.contentId.slice(0, 40),
        item.tel || null,
        'ifac',
      ],
    );
    upserted += 1;
  }
  return { upserted, skipped };
}

async function listFestivalCategoryCounts() {
  const result = await tryQuery(
    `SELECT COALESCE(NULLIF(TRIM(category), ''), '기타') AS name, COUNT(*)::int AS count
     FROM festivals
     GROUP BY 1
     ORDER BY count DESC, name ASC`,
  );
  return (result?.rows ?? []) as Array<{ name: string; count: number }>;
}

async function writeTourSyncLog(input: {
  targetApi?: string;
  fetched?: number;
  failed?: number;
  status?: string;
  message?: string;
}) {
  await tryQuery(
    `INSERT INTO tour_sync_logs (ran_at, target_api, fetched, failed, status, message)
     VALUES (NOW(), $1, $2, $3, $4, $5)`,
    [
      String(input.targetApi || IFAC_CULTURE_API_NAME).slice(0, 80),
      Number(input.fetched || 0),
      Number(input.failed || 0),
      String(input.status || '정상').slice(0, 20),
      input.message || null,
    ],
  );
}

export async function syncIfacCultureEvents(options: {
  fetchImpl?: typeof fetch;
  pageSize?: number;
  maxPages?: number;
  startDate?: string;
  endDate?: string;
} = {}) {
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
      categories: [] as Array<{ name: string; count: number }>,
      count: 0,
      message: collected.message,
    };
  }
  const items = collected.rows.map(toPersistableFestival).filter((row): row is PersistableIfacFestival => Boolean(row));
  let persist = { upserted: 0, skipped: items.length, ok: false, message: 'DATABASE_URL이 없어 파싱 결과만 반환합니다.' };
  try {
    const written = await upsertIfacFestivals(items);
    persist = {
      ...written,
      ok: true,
      message: `DB에 ${written.upserted}건을 반영했습니다.`,
    };
  } catch (err) {
    persist = {
      upserted: 0,
      skipped: items.length,
      ok: false,
      message: err instanceof Error ? err.message : 'DB 동기화에 실패했습니다.',
    };
  }
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
