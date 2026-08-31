import { pool, tryQuery } from '../db/pool';
import { ensureMunicipalityId } from './festivalSyncService';
import {
  countCategories,
  parseSeoulCultureXml,
  toPersistableFestival,
  type PersistableSeoulFestival,
} from './seoulCultureXml';

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

function buildPageUrl(key: string, start: number, end: number) {
  return `${SEOUL_CULTURE_API_BASE}/${encodeURIComponent(key)}/xml/${SEOUL_CULTURE_API_NAME}/${start}/${end}/`;
}

export async function fetchSeoulCulturePage(start = 1, end = 1000, fetchImpl: typeof fetch = fetch) {
  const key = seoulCultureApiKey();
  if (!key) {
    return { ok: false, code: 'NO_KEY', message: 'SEOUL_CULTURE_API_KEY가 없습니다.', total: 0, rows: [] as ReturnType<typeof parseSeoulCultureXml>['rows'] };
  }
  const res = await fetchImpl(buildPageUrl(key, start, end), {
    headers: { Accept: 'application/xml,text/xml,*/*' },
  });
  const xml = await res.text();
  const parsed = parseSeoulCultureXml(xml);
  if (!res.ok && parsed.ok) {
    return { ok: false, code: String(res.status), message: `HTTP ${res.status}`, total: 0, rows: [] as typeof parsed.rows };
  }
  return parsed;
}

export async function collectSeoulCultureEvents(options: {
  fetchImpl?: typeof fetch;
  pageSize?: number;
  maxPages?: number;
} = {}) {
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

async function upsertSeoulFestivals(items: PersistableSeoulFestival[]) {
  let upserted = 0;
  let skipped = 0;
  for (const item of items) {
    if (!item.contentId || !item.title || !item.eventStartDate) {
      skipped += 1;
      continue;
    }
    const municipalityId = await ensureMunicipalityId(`${item.address} ${item.title}`, 'SEOUL');
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
         latitude = COALESCE(EXCLUDED.latitude, festivals.latitude),
         longitude = COALESCE(EXCLUDED.longitude, festivals.longitude),
         category = EXCLUDED.category,
         image_url = COALESCE(EXCLUDED.image_url, festivals.image_url),
         is_trending = EXCLUDED.is_trending,
         tel = COALESCE(EXCLUDED.tel, festivals.tel),
         source = EXCLUDED.source`,
      [
        municipalityId,
        item.title.slice(0, 100),
        item.overview || null,
        item.eventStartDate.slice(0, 10),
        (item.eventEndDate || item.eventStartDate).slice(0, 10),
        (item.location_name || item.address || '').slice(0, 150) || null,
        item.latitude,
        item.longitude,
        item.category.slice(0, 30),
        item.firstImage || null,
        Boolean(item.firstImage),
        item.contentId.slice(0, 40),
        String(item.tel || '').trim().slice(0, 50) || null,
        'seoul',
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
      String(input.targetApi || SEOUL_CULTURE_API_NAME).slice(0, 80),
      Number(input.fetched || 0),
      Number(input.failed || 0),
      String(input.status || '정상').slice(0, 20),
      input.message || null,
    ],
  );
}

export async function syncSeoulCultureEvents(options: {
  fetchImpl?: typeof fetch;
  pageSize?: number;
  maxPages?: number;
} = {}) {
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
      categories: [] as Array<{ name: string; count: number }>,
      count: 0,
      message: collected.message,
    };
  }
  const items = collected.rows.map(toPersistableFestival).filter((row): row is PersistableSeoulFestival => Boolean(row));
  let persist = { upserted: 0, skipped: items.length, ok: false, message: 'DATABASE_URL이 없어 파싱 결과만 반환합니다.' };
  try {
    const written = await upsertSeoulFestivals(items);
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
