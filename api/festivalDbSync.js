import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const GYEONGGI_CITIES = [
  '수원시', '용인시', '고양시', '화성시', '성남시', '부천시', '남양주시', '안산시',
  '안양시', '평택시', '시흥시', '파주시', '김포시', '의정부시', '광주시', '하남시',
  '광명시', '군포시', '오산시', '이천시', '양주시', '구리시', '안성시', '포천시',
  '의왕시', '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군',
];

let pool = null;

export function municipalityFromAddress(address) {
  const hay = String(address || '');
  return GYEONGGI_CITIES.find((name) => hay.includes(name)) || '경기도';
}

export function municipalityRegionCode(name) {
  return 'GG_' + String(name || '').replace(/\s+/g, '');
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

async function ensureMunicipalityId(client, address) {
  const name = municipalityFromAddress(address);
  const regionCode = municipalityRegionCode(name);
  const existing = await client.query(
    'SELECT id FROM municipalities WHERE name = $1 OR region_code = $2 LIMIT 1',
    [name, regionCode],
  );
  if (existing.rowCount) return existing.rows[0].id;
  const inserted = await client.query(
    `INSERT INTO municipalities (name, region_code, budget_balance)
     VALUES ($1, $2, 0)
     ON CONFLICT (region_code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, regionCode],
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
      const municipalityId = await ensureMunicipalityId(client, address);
      await client.query(
        `INSERT INTO festivals (
           municipality_id, title, description, start_date, end_date,
           location_name, latitude, longitude, category, image_url, is_trending,
           tour_content_id, tel, source
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10, $11,
           $12, $13, 'tour'
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
           source = 'tour'`,
        [
          municipalityId,
          title.slice(0, 100),
          item.overview || item.description || null,
          start,
          end,
          address.slice(0, 150) || null,
          item.mapY || item.latitude || null,
          item.mapX || item.longitude || null,
          item.category || '문화/예술',
          item.firstImage || item.image_url || null,
          Boolean(item.firstImage || item.image_url),
          contentId,
          item.tel || null,
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
  return {
    id: contentId ? 'tour-' + contentId : String(row && row.title || ''),
    contentId: contentId || String(row && row.title || ''),
    contentTypeId: '15',
    title: row && row.title,
    location_name: row && row.location_name,
    latitude: Number(row && row.latitude) || 0,
    longitude: Number(row && row.longitude) || 0,
    start_date: row && row.start_date,
    end_date: row && row.end_date,
    municipality_name: (row && row.municipality_name) || null,
    description: (row && row.description) || null,
    category: (row && row.category) || '문화/예술',
    image_url: (row && row.image_url) || null,
    is_trending: Boolean(row && row.is_trending),
    source: (row && row.source) || 'tour',
    tel: (row && row.tel) || null,
    regionalZone: metro,
    metro: metro,
  };
}

export async function listPersistedFestivals(metro = 'GYEONGGI') {
  const db = getPool();
  if (!db) return [];
  try {
    const result = await db.query(
      `SELECT
         f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url,
         f.is_trending, f.tour_content_id, f.tel, f.source,
         mu.name AS municipality_name
       FROM festivals f
       LEFT JOIN municipalities mu ON mu.id = f.municipality_id
       ORDER BY f.is_trending DESC, f.start_date ASC
       LIMIT 80`,
    );
    return (result.rows || []).map((row) => rowToHomeFestival(row, metro));
  } catch (err) {
    console.error('[festival-db-list]', err && err.message ? err.message : err);
    return [];
  }
}
