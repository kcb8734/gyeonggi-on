import { createRequire } from 'node:module';
import path from 'node:path';
import { METRO_LOCALITIES, REGION_META, metroSourcePrefix, normalizeMetroId } from './metroLocalities.js';
import { mergeFestivalMasters } from './festivalDedup.js';

const require = createRequire(import.meta.url);

const ADDRESS_HINTS = [
  ['서울특별시', 'SEOUL'], ['서울시', 'SEOUL'], ['서울', 'SEOUL'],
  ['부산광역시', 'BUSAN'], ['부산', 'BUSAN'],
  ['대구광역시', 'DAEGU'], ['대구', 'DAEGU'],
  ['인천광역시', 'INCHEON'], ['인천', 'INCHEON'],
  ['광주광역시', 'GWANGJU'],
  ['대전광역시', 'DAEJEON'], ['대전', 'DAEJEON'],
  ['울산광역시', 'ULSAN'], ['울산', 'ULSAN'],
  ['세종특별자치시', 'SEJONG'], ['세종시', 'SEJONG'], ['세종', 'SEJONG'],
  ['경기도', 'GYEONGGI'], ['경기', 'GYEONGGI'],
  ['강원특별자치도', 'GANGWON'], ['강원도', 'GANGWON'], ['강원', 'GANGWON'],
  ['충청북도', 'CHUNGBUK'], ['충북', 'CHUNGBUK'],
  ['충청남도', 'CHUNGNAM'], ['충남', 'CHUNGNAM'],
  ['전북특별자치도', 'JEONBUK'], ['전라북도', 'JEONBUK'], ['전북', 'JEONBUK'],
  ['전라남도', 'JEONNAM'], ['전남', 'JEONNAM'],
  ['경상북도', 'GYEONGBUK'], ['경북', 'GYEONGBUK'],
  ['경상남도', 'GYEONGNAM'], ['경남', 'GYEONGNAM'],
  ['제주특별자치도', 'JEJU'], ['제주도', 'JEJU'], ['제주', 'JEJU'],
];

let pool = null;

function localityName(row) {
  return String(row.label || row.id || '').replace(/^(서울|부산|대구|인천|광주|대전|울산)\s+/, '');
}

export function festivalDateYmd(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = String(value || '').trim();
  if (!text) return '';
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dotted = text.match(/(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotted) {
    return `${dotted[1]}-${dotted[2].padStart(2, '0')}-${dotted[3].padStart(2, '0')}`;
  }
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return '';
}

export function listedMetroForRow(row, fallback = 'GYEONGGI') {
  const source = String(row && row.source || '').toLowerCase();
  const hay = `${row && row.location_name || ''} ${row && row.municipality_name || ''} ${row && row.title || ''} ${row && row.description || ''}`;
  if (source === 'seoul') return 'SEOUL';
  if (source === 'ggc') return 'GYEONGGI';
  if (source === 'ifac' || source === 'incheon') {
    if (hay.includes('서울')) return 'SEOUL';
    if (hay.includes('경기')) return 'GYEONGGI';
    return 'INCHEON';
  }
  return inferMetro(hay, row && (row.metro_region || row.metro || row.regionalZone || fallback));
}

export function rowMatchesMetro(row, metro) {
  const zone = normalizeMetroId(metro);
  if (!zone || zone === 'ALL') return true;
  return listedMetroForRow(row, zone) === zone;
}

export function mergeHomeFestivalRows(...groups) {
  return mergeFestivalMasters(...groups);
}

export function inferMetro(address, metro) {
  const raw = String(metro || '').trim().toUpperCase();
  if (raw === 'SE' || raw === 'SEOULCULTURE') return 'SEOUL';
  if (raw === 'GG' || raw === 'GGC') return 'GYEONGGI';
  if (raw === 'IFAC' || raw === 'INCHEON') return 'INCHEON';
  if (raw && raw !== 'TOUR' && raw !== 'ALL' && raw !== 'SAMPLE' && REGION_META[normalizeMetroId(raw)]) {
    return normalizeMetroId(raw);
  }
  const hay = String(address || '');
  if (hay.includes('광주광역시')) return 'GWANGJU';
  if (/경기도\s*광주/.test(hay)) return 'GYEONGGI';
  for (const [token, zone] of ADDRESS_HINTS) {
    if (hay.includes(token)) return zone;
  }
  return 'GYEONGGI';
}

export function municipalityFromAddress(address, metro) {
  const hay = String(address || '');
  const zone = inferMetro(hay, metro);
  const list = METRO_LOCALITIES[zone] || [];
  const hit = list.find((row) => {
    const name = localityName(row);
    return name && hay.includes(name);
  });
  if (hit) return localityName(hit);
  if (zone === 'SEOUL') return '서울특별시';
  if (zone === 'GYEONGGI') return '경기도';
  return REGION_META[zone]?.label?.replace(/온$/, '') || zone;
}

export function municipalityRegionCode(name, metro) {
  const zone = inferMetro(name, metro);
  const prefix = metroSourcePrefix(zone);
  return `${prefix}_${String(name || '').replace(/\s+/g, '')}`.slice(0, 40);
}

function loadPg() {
  const candidates = [
    'pg',
    path.join(process.cwd(), 'backend/node_modules/pg'),
    path.join(process.cwd(), 'node_modules/pg'),
  ];
  for (const id of candidates) {
    try {
      return require(id);
    } catch {
      // try next
    }
  }
  return null;
}

function getPool() {
  const url = String(process.env.DATABASE_URL || '').trim();
  if (!url) return null;
  if (pool) return pool;
  const pg = loadPg();
  if (!pg || !pg.Pool) return null;
  pool = new pg.Pool({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 8000,
    connectionTimeoutMillis: 5000,
  });
  return pool;
}

async function ensureMunicipalityId(client, address, metro) {
  const zone = inferMetro(address, metro);
  const name = municipalityFromAddress(address, zone);
  const regionCode = municipalityRegionCode(name, zone);
  const existing = await client.query(
    'SELECT id FROM municipalities WHERE name = $1 OR region_code = $2 LIMIT 1',
    [name, regionCode],
  );
  if (existing.rowCount) {
    try {
      await client.query(
        'UPDATE municipalities SET metro_region = COALESCE($2, metro_region) WHERE id = $1',
        [existing.rows[0].id, zone],
      );
    } catch {
      // metro_region 컬럼이 없는 구스키마는 건너뛴다.
    }
    return existing.rows[0].id;
  }
  try {
    const inserted = await client.query(
      `INSERT INTO municipalities (name, region_code, budget_balance, metro_region)
       VALUES ($1, $2, 0, $3)
       ON CONFLICT (region_code) DO UPDATE SET
         name = EXCLUDED.name,
         metro_region = COALESCE(EXCLUDED.metro_region, municipalities.metro_region)
       RETURNING id`,
      [name, regionCode, zone],
    );
    return inserted.rows[0] && inserted.rows[0].id ? inserted.rows[0].id : null;
  } catch {
    const inserted = await client.query(
      `INSERT INTO municipalities (name, region_code, budget_balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (region_code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, regionCode],
    );
    return inserted.rows[0] && inserted.rows[0].id ? inserted.rows[0].id : null;
  }
}

export async function persistTourFestivals(items, options = {}) {
  const rows = Array.isArray(items) ? items : [];
  const source = String(options.source || '').trim();
  const db = getPool();
  if (!db) {
    return {
      ok: false,
      upserted: 0,
      skipped: rows.length,
      message: 'DATABASE_URL이 없어 실시간 TourAPI 목록만 반환합니다.',
    };
  }
  const client = await db.connect();
  let upserted = 0;
  let skipped = 0;
  try {
    await client.query('BEGIN');
    for (const item of rows) {
      const itemSource = String(item && item.source || source || 'tour').toLowerCase();
      if (itemSource === 'sample' || itemSource === 'fallback') {
        skipped += 1;
        continue;
      }
      const contentId = String(item && item.contentId || '').trim();
      const title = String(item && item.title || '').trim();
      const start = festivalDateYmd(item && (item.eventStartDate || item.start_date))
        || festivalDateYmd(item && (item.eventEndDate || item.end_date));
      if (!contentId || !title || !start) {
        skipped += 1;
        continue;
      }
      const end = festivalDateYmd(item && (item.eventEndDate || item.end_date)) || start;
      const address = String(item && (item.address || item.location_name) || '');
      const metro = inferMetro(`${address} ${title}`, item.metro || item.regionalZone || options.metro || source);
      const municipalityId = await ensureMunicipalityId(client, `${address} ${title}`, metro);
      const rowSource = String(item.source || source || 'tour').slice(0, 20);
      await client.query(
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
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           category = EXCLUDED.category,
           image_url = COALESCE(EXCLUDED.image_url, festivals.image_url),
           is_trending = EXCLUDED.is_trending,
           tel = COALESCE(EXCLUDED.tel, festivals.tel),
           source = EXCLUDED.source`,
        [
          municipalityId,
          title.slice(0, 100),
          item.overview || item.description || null,
          start,
          end,
          address.slice(0, 150) || null,
          item.mapY || item.latitude || null,
          item.mapX || item.longitude || null,
          String(item.category || '문화/예술').slice(0, 30),
          item.firstImage || item.image_url || null,
          Boolean(item.firstImage || item.image_url),
          contentId.slice(0, 40),
          item.tel || null,
          rowSource,
        ],
      );
      upserted += 1;
    }
    await client.query('COMMIT');
    return {
      ok: true,
      upserted: upserted,
      skipped: skipped,
      message: 'DB에 ' + upserted + '건을 반영했습니다.',
    };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_roll) { /* ignore */ }
    console.error('[festival-db-sync]', err && err.message ? err.message : err);
    return {
      ok: false,
      upserted: 0,
      skipped: rows.length,
      message: err && err.message ? err.message : 'DB 동기화에 실패했습니다.',
    };
  } finally {
    client.release();
  }
}

export function rowToHomeFestival(row, metro = 'GYEONGGI') {
  const contentId = String(row && (row.tour_content_id || row.contentId || row.id) || '');
  const zone = listedMetroForRow(row, metro);
  const start = festivalDateYmd(row && row.start_date) || festivalDateYmd(row && row.end_date);
  const end = festivalDateYmd(row && row.end_date) || start;
  return {
    id: contentId ? 'tour-' + contentId : String(row && row.title || ''),
    contentId: contentId || String(row && row.title || ''),
    contentTypeId: '15',
    title: row && row.title,
    location_name: row && row.location_name,
    latitude: Number(row && row.latitude) || 0,
    longitude: Number(row && row.longitude) || 0,
    start_date: start || null,
    end_date: end || null,
    municipality_name: (row && row.municipality_name) || null,
    description: (row && row.description) || null,
    category: (row && row.category) || '문화/예술',
    image_url: (row && row.image_url) || null,
    is_trending: Boolean(row && row.is_trending),
    source: (row && row.source) || 'tour',
    tel: (row && row.tel) || null,
    regionalZone: zone,
    metro: zone,
  };
}

const LIST_SQL_WITH_METRO = `SELECT
         f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url,
         f.is_trending, f.tour_content_id, f.tel, f.source,
         mu.name AS municipality_name,
         mu.metro_region
       FROM festivals f
       LEFT JOIN municipalities mu ON mu.id = f.municipality_id
       WHERE LOWER(COALESCE(f.source, '')) <> 'sample'
         AND (
           $1 = 'ALL'
           OR COALESCE(mu.metro_region, '') = $1
           OR ($1 = 'SEOUL' AND LOWER(COALESCE(f.source, '')) = 'seoul')
           OR ($1 = 'GYEONGGI' AND LOWER(COALESCE(f.source, '')) IN ('ggc', 'gg'))
           OR ($1 = 'INCHEON' AND LOWER(COALESCE(f.source, '')) IN ('ifac', 'incheon'))
         )
       ORDER BY
         CASE LOWER(COALESCE(f.source, ''))
           WHEN 'tour' THEN 0
           WHEN 'seoul' THEN 1
           WHEN 'ggc' THEN 1
           WHEN 'ifac' THEN 1
           WHEN 'incheon' THEN 1
           ELSE 2
         END,
         f.is_trending DESC,
         f.start_date DESC NULLS LAST
       LIMIT 500`;

const LIST_SQL_BASIC = `SELECT
         f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url,
         f.is_trending, f.tour_content_id, f.tel, f.source,
         mu.name AS municipality_name
       FROM festivals f
       LEFT JOIN municipalities mu ON mu.id = f.municipality_id
       WHERE LOWER(COALESCE(f.source, '')) <> 'sample'
       ORDER BY
         CASE LOWER(COALESCE(f.source, ''))
           WHEN 'tour' THEN 0
           WHEN 'seoul' THEN 1
           WHEN 'ggc' THEN 1
           WHEN 'ifac' THEN 1
           WHEN 'incheon' THEN 1
           ELSE 2
         END,
         f.is_trending DESC,
         f.start_date DESC NULLS LAST
       LIMIT 500`;

function keepListedRow(row, zone) {
  if (!zone || zone === 'ALL') return true;
  const source = String(row.source || '').toLowerCase();
  if (zone === 'SEOUL' && source === 'seoul') return true;
  if (zone === 'GYEONGGI' && (source === 'ggc' || source === 'gg')) return true;
  if (zone === 'INCHEON' && (source === 'ifac' || source === 'incheon')) return true;
  return row.metro === zone;
}

export async function listPersistedFestivals(metro = 'GYEONGGI') {
  const db = getPool();
  if (!db) return [];
  const zone = normalizeMetroId(metro);
  try {
    let result;
    try {
      result = await db.query(LIST_SQL_WITH_METRO, [zone]);
    } catch {
      result = await db.query(LIST_SQL_BASIC);
    }
    const mapped = (result.rows || [])
      .map((row) => rowToHomeFestival(row, zone))
      .filter((row) => keepListedRow(row, zone));
    return mergeFestivalMasters(mapped).slice(0, 300);
  } catch (err) {
    console.error('[festival-db-list]', err && err.message ? err.message : err);
    return [];
  }
}

export async function listFestivalCategoryCounts() {
  const db = getPool();
  if (!db) return [];
  try {
    const result = await db.query(
      `SELECT COALESCE(NULLIF(TRIM(category), ''), '기타') AS name, COUNT(*)::int AS count
       FROM festivals
       WHERE LOWER(COALESCE(source, '')) NOT IN ('sample', 'fallback')
       GROUP BY 1
       ORDER BY count DESC, name ASC`,
    );
    return result.rows || [];
  } catch (err) {
    console.error('[festival-category-counts]', err && err.message ? err.message : err);
    return [];
  }
}

export async function writeTourSyncLog(input) {
  const db = getPool();
  if (!db) return false;
  try {
    await db.query(
      `INSERT INTO tour_sync_logs (ran_at, target_api, fetched, failed, status, message)
       VALUES (NOW(), $1, $2, $3, $4, $5)`,
      [
        String(input.targetApi || 'GGCULTUREVENTSTUS').slice(0, 80),
        Number(input.fetched || 0),
        Number(input.failed || 0),
        String(input.status || '정상').slice(0, 20),
        input.message || null,
      ],
    );
    return true;
  } catch (err) {
    console.error('[tour-sync-log]', err && err.message ? err.message : err);
    return false;
  }
}

export async function listTourSyncLogs(limit = 8) {
  const db = getPool();
  if (!db) return [];
  try {
    const result = await db.query(
      `SELECT ran_at, target_api, fetched, failed, status
       FROM tour_sync_logs
       ORDER BY ran_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows || [];
  } catch {
    return [];
  }
}

export async function listFestivalSourceCounts() {
  const db = getPool();
  if (!db) return [];
  try {
    const result = await db.query(
      `SELECT COALESCE(NULLIF(TRIM(source), ''), 'db') AS source, COUNT(*)::int AS count
       FROM festivals
       GROUP BY 1
       ORDER BY count DESC`,
    );
    return result.rows || [];
  } catch (err) {
    console.error('[festival-source-counts]', err && err.message ? err.message : err);
    return [];
  }
}

export async function listFestivalSourceMetroCounts() {
  const db = getPool();
  if (!db) return [];
  try {
    const result = await db.query(
      `SELECT
         COALESCE(NULLIF(TRIM(f.source), ''), 'db') AS source,
         COALESCE(NULLIF(TRIM(mu.metro_region), ''), 'GYEONGGI') AS metro,
         COUNT(*)::int AS count
       FROM festivals f
       LEFT JOIN municipalities mu ON mu.id = f.municipality_id
       GROUP BY 1, 2`,
    );
    return result.rows || [];
  } catch (err) {
    console.error('[festival-source-metro-counts]', err && err.message ? err.message : err);
    return [];
  }
}
