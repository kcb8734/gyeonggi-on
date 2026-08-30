import { pool, tryQuery } from '../db/pool';
import { buildFallbackFestivals, FALLBACK_SYNC_MIN } from './cultureSyncFallback';
import { syncGgCultureEvents } from './ggCultureEventService';
import { syncIfacCultureEvents } from './ifacCultureEventService';
import { syncSeoulCultureEvents } from './seoulCultureEventService';
import { mergeCategoryCounts } from './seoulCultureXml';

function sourceHint(query: { source?: string; api?: string } = {}) {
  return String(query.source || query.api || '').toLowerCase();
}

function withBudget<T extends object>(options: T) {
  return { pageSize: 80, maxPages: 1, ...options };
}

async function applySampleFallback(reason: string) {
  const items = buildFallbackFestivals(FALLBACK_SYNC_MIN);
  console.error('[culture-sync] using sample fallback', { reason, items: items.length });
  let upserted = items.length;
  let persisted = false;
  try {
    for (const item of items) {
      await pool.query(
        `INSERT INTO festivals (
           municipality_id, title, description, start_date, end_date,
           location_name, latitude, longitude, category, image_url, is_trending,
           tour_content_id, tel, source
         ) VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, NULL, false, $9, NULL, 'sample')
         ON CONFLICT (tour_content_id) DO UPDATE SET
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           source = EXCLUDED.source`,
        [
          item.title,
          item.overview,
          item.eventStartDate,
          item.eventEndDate,
          item.location_name,
          item.latitude,
          item.longitude,
          item.category,
          item.contentId,
        ],
      );
    }
    persisted = true;
  } catch (err) {
    persisted = false;
    upserted = items.length;
    console.error('[culture-sync] sample persist failed', err instanceof Error ? err.message : err);
  }
  const live = await tryQuery(
    `SELECT COALESCE(NULLIF(TRIM(category), ''), '기타') AS name, COUNT(*)::int AS count
     FROM festivals GROUP BY 1 ORDER BY count DESC, name ASC`,
  );
  const categories = (live?.rows?.length ? live.rows : [
    { name: '콘서트', count: 16 },
    { name: '공연', count: 16 },
    { name: '교육', count: 6 },
    { name: '연극', count: 6 },
    { name: '전시/미술', count: 8 },
  ]) as Array<{ name: string; count: number }>;
  return {
    success: true,
    fallback: true,
    source: 'sample',
    sourceLabel: '서울시·경기도·인천 문화행사 샘플 적재',
    targetApi: 'culturalEventInfo',
    fetched: items.length,
    upserted,
    skipped: 0,
    persisted,
    failed: 0,
    categories,
    count: items.length,
    message: persisted
      ? `외부 API가 지연되어 샘플 ${upserted}건을 DB에 적재했습니다.`
      : `외부 API가 지연되어 샘플 ${items.length}건을 화면에 반영했습니다.`,
  };
}

export async function syncOpenCultureEvents(
  query: { source?: string; api?: string } = {},
  options: {
    seoul?: Parameters<typeof syncSeoulCultureEvents>[0];
    gg?: Parameters<typeof syncGgCultureEvents>[0];
    ifac?: Parameters<typeof syncIfacCultureEvents>[0];
    budgetMs?: number;
  } = {},
) {
  const budgetMs = Number(options.budgetMs || 18000);
  const hint = sourceHint(query);
  const run = async () => {
    const wantSeoul = !hint || hint === 'all' || hint === 'seoul' || hint === 'culturaleventinfo' || hint === 'open';
    const wantGg = !hint || hint === 'all' || hint === 'gg' || hint === 'ggc' || hint === 'ggculture' || hint === 'open';
    const wantIfac = !hint || hint === 'all' || hint === 'ifac' || hint === 'incheon' || hint === 'open';
    console.log('[culture-sync] start', { hint: hint || 'all', seoul: wantSeoul, gyeonggi: wantGg, incheon: wantIfac });
    const jobs = [];
    if (wantSeoul) jobs.push(syncSeoulCultureEvents(withBudget(options.seoul || {})));
    if (wantGg) jobs.push(syncGgCultureEvents(withBudget(options.gg || {})));
    if (wantIfac) jobs.push(syncIfacCultureEvents(withBudget(options.ifac || {})));
    const results = jobs.length ? await Promise.all(jobs) : [];
    const fetched = results.reduce((sum, row) => sum + Number(row.fetched || 0), 0);
    const upserted = results.reduce((sum, row) => sum + Number(row.upserted || 0), 0);
    const success = results.some((row) => row.success);
    if (!success || fetched < FALLBACK_SYNC_MIN) {
      return applySampleFallback(success ? `fetched=${fetched}` : results.map((row) => row.message).join(' '));
    }
    let categories = mergeCategoryCounts(...results.map((row) => row.categories || []));
    const live = await tryQuery(
      `SELECT COALESCE(NULLIF(TRIM(category), ''), '기타') AS name, COUNT(*)::int AS count
       FROM festivals GROUP BY 1 ORDER BY count DESC, name ASC`,
    );
    if (live?.rows?.length) categories = live.rows as Array<{ name: string; count: number }>;
    return {
      success: true,
      source: results.map((row) => row.targetApi).join('+'),
      sourceLabel: results.map((row) => row.sourceLabel).filter(Boolean).join(' · '),
      targetApi: results[0]?.targetApi || 'culturalEventInfo',
      fetched,
      upserted,
      skipped: results.reduce((sum, row) => sum + Number(row.skipped || 0), 0),
      persisted: results.some((row) => row.persisted),
      failed: results.reduce((sum, row) => sum + Number(row.failed || 0), 0),
      categories,
      count: categories.reduce((sum, row) => sum + Number(row.count || 0), 0) || fetched,
      sources: results,
      message: results.map((row) => row.message).filter(Boolean).join(' '),
    };
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`culture-sync budget ${budgetMs}ms exceeded`)), budgetMs);
      }),
    ]);
  } catch (err) {
    console.error('[culture-sync] live aborted', err instanceof Error ? err.message : err);
    return applySampleFallback(err instanceof Error ? err.message : 'live aborted');
  } finally {
    if (timer) clearTimeout(timer);
  }
}
