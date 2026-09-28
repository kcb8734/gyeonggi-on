import { getPool } from './festivalDbSync.js';
import { isGenericFestivalOverview } from './genericOverview.js';

let tableReady = false;

export function normalizeIdentity(input) {
  const title = String(input?.title || '').trim().replace(/\s+/g, ' ');
  const titleNorm = title.toLowerCase();
  const metro = String(input?.metro || '').trim().toUpperCase();
  const startDate = String(input?.startDate || '').replace(/[./]/g, '-').slice(0, 10);
  const endDate = String(input?.endDate || '').replace(/[./]/g, '-').slice(0, 10);
  const place = String(input?.place || '').trim().replace(/\s+/g, ' ');
  return {
    title,
    titleNorm,
    metro,
    startDate,
    endDate,
    place,
    cacheKey: `${titleNorm}|${metro}`,
  };
}

export function rowToSummary(row) {
  if (!row || !row.overview) return null;
  let highlights = row.highlights;
  if (typeof highlights === 'string') {
    try { highlights = JSON.parse(highlights); } catch { highlights = []; }
  }
  if (!Array.isArray(highlights)) highlights = [];
  return {
    overview: String(row.overview || '').trim(),
    highlights: highlights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3),
    tips: String(row.tips || '').trim(),
    source: 'gemini',
    model: row.model || undefined,
    cached: true,
    stored: true,
  };
}

export async function ensureAiSummaryTable(client) {
  if (tableReady) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS festival_ai_summaries (
      cache_key VARCHAR(512) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      title_norm VARCHAR(200) NOT NULL,
      place VARCHAR(200),
      start_date VARCHAR(20) NOT NULL DEFAULT '',
      end_date VARCHAR(20) NOT NULL DEFAULT '',
      metro VARCHAR(40) NOT NULL DEFAULT '',
      overview TEXT NOT NULL,
      highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
      tips TEXT NOT NULL DEFAULT '',
      model VARCHAR(80),
      source VARCHAR(20) NOT NULL DEFAULT 'gemini',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS festival_ai_summaries_title_metro_idx
      ON festival_ai_summaries (title_norm, metro)
  `);
  tableReady = true;
}

export function resetAiSummaryTableFlag() {
  tableReady = false;
}

export async function loadStoredSummary(input, options = {}) {
  const ident = normalizeIdentity(input);
  if (!ident.titleNorm) return null;
  const db = options.pool || getPool();
  if (!db) return null;
  try {
    await ensureAiSummaryTable(db);
    const result = await db.query(
      `SELECT overview, highlights, tips, model, source, cache_key, title_norm, metro
         FROM festival_ai_summaries
        WHERE source = 'gemini'
          AND (
            cache_key = $1
            OR (title_norm = $2 AND metro = $3)
            OR (title_norm = $2 AND $3 = '')
          )
        ORDER BY
          CASE WHEN cache_key = $1 THEN 0 ELSE 1 END,
          updated_at DESC
        LIMIT 1`,
      [ident.cacheKey, ident.titleNorm, ident.metro],
    );
    const row = result.rows && result.rows[0];
    const summary = rowToSummary(row);
    if (summary && isGenericFestivalOverview(summary.overview)) return null;
    return summary;
  } catch (err) {
    console.warn('[festival-ai-store] load', err && err.message ? err.message : err);
    return null;
  }
}

export async function saveStoredSummary(input, value, options = {}) {
  if (!value || value.source !== 'gemini' || !String(value.overview || '').trim()) return false;
  if (isGenericFestivalOverview(value.overview)) return false;
  if (value.stored) return true;
  const ident = normalizeIdentity(input);
  if (!ident.titleNorm) return false;
  const db = options.pool || getPool();
  if (!db) return false;
  const highlights = Array.isArray(value.highlights) ? value.highlights : [];
  try {
    await ensureAiSummaryTable(db);
    await db.query(
      `INSERT INTO festival_ai_summaries (
         cache_key, title, title_norm, place, start_date, end_date, metro,
         overview, highlights, tips, model, source, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9::jsonb, $10, $11, 'gemini', NOW()
       )
       ON CONFLICT (cache_key) DO UPDATE SET
         title = EXCLUDED.title,
         place = EXCLUDED.place,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         overview = EXCLUDED.overview,
         highlights = EXCLUDED.highlights,
         tips = EXCLUDED.tips,
         model = EXCLUDED.model,
         updated_at = NOW()`,
      [
        ident.cacheKey,
        ident.title.slice(0, 200),
        ident.titleNorm.slice(0, 200),
        ident.place.slice(0, 200) || null,
        ident.startDate,
        ident.endDate,
        ident.metro.slice(0, 40),
        String(value.overview).trim(),
        JSON.stringify(highlights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)),
        String(value.tips || '').trim(),
        value.model || null,
      ],
    );
    return true;
  } catch (err) {
    console.warn('[festival-ai-store] save', err && err.message ? err.message : err);
    return false;
  }
}

export const postgresSummaryStore = {
  load: loadStoredSummary,
  save: saveStoredSummary,
};
