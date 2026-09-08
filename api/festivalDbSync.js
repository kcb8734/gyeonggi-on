import { createRequire } from 'node:module';
import path from 'node:path';
import { categoryForFestival } from './festivalCategories.js';
import {
  municipalityFromAddress as municipalityFromPlace,
  municipalityRegionCode as metroRegionCode,
  metroFromPlace,
  withCoords,
  SIDO_NAME,
} from './metroGeo.js';
import { metroMatchIds, normalizeMetroId } from './metroLocalities.js';

const require = createRequire(import.meta.url);

let pool = null;
let festivalColumnsReady = false;

export function municipalityFromAddress(address, metroHint) {
  return municipalityFromPlace(address, metroHint);
}

export function municipalityRegionCode(name, metroHint) {
  return metroRegionCode(name, metroHint);
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

export function getPool() {
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

export async function ensureFestivalColumns(client) {
  if (festivalColumnsReady) return;
  try {
    await client.query('ALTER TABLE festivals ADD COLUMN IF NOT EXISTS metro_region VARCHAR(40)');
    await client.query('CREATE INDEX IF NOT EXISTS festivals_metro_region_idx ON festivals (metro_region)');
    festivalColumnsReady = true;
  } catch (err) {
    console.warn('[festival-db-sync] metro_region column', err && err.message ? err.message : err);
  }
}

async function ensureMunicipalityId(client, address, metroHint) {
  const metro = normalizeMetroId(metroHint || metroFromPlace(address) || 'GYEONGGI');
  const name = municipalityFromAddress(address, metro);
  const regionCode = municipalityRegionCode(name, metro);
  const existing = await client.query(
    'SELECT id FROM municipalities WHERE name = $1 OR region_code = $2 LIMIT 1',
    [name, regionCode],
  );
  if (existing.rowCount) {
    try {
      await client.query(
        'UPDATE municipalities SET metro_region = COALESCE(metro_region, $2) WHERE id = $1',
        [existing.rows[0].id, metro],
      );
    } catch {
      // metro_region may be missing on very old schemas
    }
    return existing.rows[0].id;
  }
  const inserted = await client.query(
    `INSERT INTO municipalities (name, region_code, budget_balance, metro_region)
     VALUES ($1, $2, 0, $3)
     ON CONFLICT (region_code) DO UPDATE SET
       name = EXCLUDED.name,
       metro_region = COALESCE(EXCLUDED.metro_region, municipalities.metro_region)
     RETURNING id`,
    [name, regionCode, metro],
  );
  return inserted.rows[0] && inserted.rows[0].id ? inserted.rows[0].id : null;
}

export async function persistTourFestivals(items) {
  const rows = Array.isArray(items) ? items : [];
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
    await ensureFestivalColumns(client);
    await client.query('BEGIN');
    for (const item of rows) {
      const contentId = String(item && item.contentId || '').trim();
      const title = String(item && item.title || '').trim();
      const start = String(item && (item.eventStartDate || item.start_date) || '').slice(0, 10);
      if (!contentId || !title || !start) {
        skipped += 1;
        continue;
      }
      const end = String(item && (item.eventEndDate || item.end_date) || start).slice(0, 10);
      const address = String(item && (item.address || item.location_name) || '');
      const metro = normalizeMetroId(item.metro || metroFromPlace(address) || 'GYEONGGI');
      const municipalityId = await ensureMunicipalityId(client, address, metro);
      const coords = withCoords(item, metro);
      const category = categoryForFestival(item);
      await client.query(
        `INSERT INTO festivals (
           municipality_id, title, description, start_date, end_date,
           location_name, latitude, longitude, category, image_url, is_trending,
           tour_content_id, tel, source, metro_region
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10, $11,
           $12, $13, $14, $15
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
           source = COALESCE(EXCLUDED.source, festivals.source),
           metro_region = COALESCE(EXCLUDED.metro_region, festivals.metro_region)`,
        [
          municipalityId,
          title.slice(0, 100),
          item.overview || item.description || null,
          start,
          end,
          address.slice(0, 150) || null,
          coords.latitude,
          coords.longitude,
          category,
          item.firstImage || item.image_url || null,
          Boolean(item.firstImage || item.image_url),
          contentId,
          item.tel || null,
          item.source || 'tour',
          metro,
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
  const zone = normalizeMetroId((row && (row.metro_region || row.muni_metro)) || metro);
  const coords = withCoords({
    latitude: row && row.latitude,
    longitude: row && row.longitude,
    location_name: row && row.location_name,
    title: row && row.title,
    metro: zone,
  }, zone);
  return {
    id: contentId ? 'tour-' + contentId : String(row && row.title || ''),
    contentId: contentId || String(row && row.title || ''),
    contentTypeId: '15',
    title: row && row.title,
    location_name: row && row.location_name,
    latitude: coords.latitude,
    longitude: coords.longitude,
    start_date: row && row.start_date,
    end_date: row && row.end_date,
    municipality_name: (row && row.municipality_name) || null,
    description: (row && row.description) || null,
    category: categoryForFestival(row),
    image_url: (row && row.image_url) || null,
    is_trending: Boolean(row && row.is_trending),
    source: (row && row.source) || 'tour',
    tel: (row && row.tel) || null,
    regionalZone: zone,
    metro: zone,
  };
}

function rowMatchesMetro(row, metro) {
  const wanted = metroMatchIds(metro);
  const tagged = String(row && (row.metro_region || row.muni_metro) || '');
  if (tagged && wanted.includes(tagged)) return true;
  const hay = `${row && row.location_name || ''} ${row && row.municipality_name || ''} ${row && row.title || ''}`;
  const inferred = metroFromPlace(hay);
  if (inferred) return wanted.includes(inferred);
  return false;
}

export async function listPersistedFestivals(metro = 'GYEONGGI') {
  const db = getPool();
  if (!db) return [];
  const zone = normalizeMetroId(metro);
  const matchIds = metroMatchIds(zone);
  try {
    const result = await db.query(
      `SELECT
         f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url,
         f.is_trending, f.tour_content_id, f.tel, f.source,
         f.metro_region,
         mu.name AS municipality_name,
         mu.metro_region AS muni_metro
       FROM festivals f
       LEFT JOIN municipalities mu ON mu.id = f.municipality_id
       WHERE COALESCE(f.metro_region, mu.metro_region, '') = ANY($1::text[])
          OR (
            COALESCE(f.metro_region, mu.metro_region) IS NULL
            AND (
              COALESCE(f.location_name, '') ILIKE '%' || $2 || '%'
              OR COALESCE(mu.name, '') ILIKE '%' || $2 || '%'
            )
          )
       ORDER BY f.is_trending DESC, f.start_date ASC
       LIMIT 400`,
      [matchIds, SIDO_NAME[zone] || '경기'],
    );
    return (result.rows || [])
      .filter((row) => {
        const tagged = String(row.metro_region || row.muni_metro || '');
        if (tagged) return matchIds.includes(tagged);
        return rowMatchesMetro(row, zone);
      })
      .map((row) => rowToHomeFestival(row, zone));
  } catch (err) {
    if (String(err && err.message || '').includes('metro_region')) {
      try {
        const fallback = await db.query(
          `SELECT
             f.title, f.location_name, f.latitude, f.longitude,
             f.start_date, f.end_date, f.description, f.category, f.image_url,
             f.is_trending, f.tour_content_id, f.tel, f.source,
             mu.name AS municipality_name
           FROM festivals f
           LEFT JOIN municipalities mu ON mu.id = f.municipality_id
           ORDER BY f.is_trending DESC, f.start_date ASC
           LIMIT 400`,
        );
        return (fallback.rows || [])
          .filter((row) => rowMatchesMetro(row, zone))
          .map((row) => rowToHomeFestival(row, zone));
      } catch (inner) {
        console.error('[festival-db-list]', inner && inner.message ? inner.message : inner);
        return [];
      }
    }
    console.error('[festival-db-list]', err && err.message ? err.message : err);
    return [];
  }
}
