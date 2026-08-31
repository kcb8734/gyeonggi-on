import { tryQuery } from '../db/pool';
import { syncGgCultureEvents } from './ggCultureEventService';
import { syncIfacCultureEvents } from './ifacCultureEventService';
import { syncSeoulCultureEvents } from './seoulCultureEventService';
import { collectRegionFestivals, upsertTourFestivals } from './festivalSyncService';
import { mergeCategoryCounts } from './seoulCultureXml';

function sourceHint(query: { source?: string; api?: string } = {}) {
  return String(query.source || query.api || '').toLowerCase();
}

function withBudget<T extends object>(options: T) {
  return { pageSize: 80, maxPages: 1, ...options };
}

async function syncTourBundle() {
  const codes = ['1', '31', '2'];
  const collected = await Promise.all(codes.map((areaCode) => collectRegionFestivals(areaCode)));
  const items = collected.flatMap((row) => row.items || []);
  if (!items.length) {
    console.error('[culture-sync] tour empty', {
      areas: codes,
      sources: collected.map((row) => row.source),
    });
  }
  let persist = { upserted: 0, skipped: items.length, ok: false };
  try {
    const written = await upsertTourFestivals(items);
    persist = { ...written, ok: true };
  } catch (err) {
    console.error('[culture-sync] tour persist failed', err instanceof Error ? err.message : err);
  }
  return {
    success: persist.ok || items.length > 0,
    source: 'tour',
    sourceLabel: '한국관광공사 TourAPI 4.0 서울·경기·인천',
    targetApi: 'searchFestival2',
    fetched: items.length,
    upserted: persist.upserted,
    skipped: persist.skipped,
    persisted: persist.ok,
    failed: persist.ok ? 0 : 1,
    categories: [] as Array<{ name: string; count: number }>,
    message: persist.ok
      ? `TourAPI ${persist.upserted}건을 수집·적재했습니다.`
      : `TourAPI ${items.length}건을 수집했습니다.`,
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
    const wantTour = !hint || hint === 'all' || hint === 'open' || hint === 'tour';
    const wantSeoul = !hint || hint === 'all' || hint === 'seoul' || hint === 'culturaleventinfo' || hint === 'open';
    const wantGg = !hint || hint === 'all' || hint === 'gg' || hint === 'ggc' || hint === 'ggculture' || hint === 'open';
    const wantIfac = !hint || hint === 'all' || hint === 'ifac' || hint === 'incheon' || hint === 'open';
    console.log('[culture-sync] start', { hint: hint || 'all', tour: wantTour, seoul: wantSeoul, gyeonggi: wantGg, incheon: wantIfac, fallback: false });
    const jobs = [];
    if (wantTour) jobs.push(syncTourBundle());
    if (wantSeoul) jobs.push(syncSeoulCultureEvents(withBudget(options.seoul || {})));
    if (wantGg) jobs.push(syncGgCultureEvents(withBudget(options.gg || {})));
    if (wantIfac) jobs.push(syncIfacCultureEvents(withBudget(options.ifac || {})));
    const results = jobs.length ? await Promise.all(jobs) : [];
    const fetched = results.reduce((sum, row) => sum + Number(row.fetched || 0), 0);
    const upserted = results.reduce((sum, row) => sum + Number(row.upserted || 0), 0);
    const success = results.some((row) => row.success || Number(row.fetched || 0) > 0);
    let categories = mergeCategoryCounts(...results.map((row) => row.categories || []));
    const live = await tryQuery(
      `SELECT COALESCE(NULLIF(TRIM(category), ''), '기타') AS name, COUNT(*)::int AS count
       FROM festivals
       WHERE LOWER(COALESCE(source, '')) NOT IN ('sample', 'fallback')
       GROUP BY 1 ORDER BY count DESC, name ASC`,
    );
    if (live?.rows?.length) categories = live.rows as Array<{ name: string; count: number }>;
    return {
      success,
      fallback: false,
      source: results.map((row) => row.targetApi).join('+'),
      sourceLabel: results.map((row) => row.sourceLabel).filter(Boolean).join(' · '),
      targetApi: results[0]?.targetApi || 'searchFestival2',
      fetched,
      upserted,
      skipped: results.reduce((sum, row) => sum + Number(row.skipped || 0), 0),
      persisted: results.some((row) => row.persisted),
      failed: results.reduce((sum, row) => sum + Number(row.failed || 0), 0),
      categories,
      count: categories.reduce((sum, row) => sum + Number(row.count || 0), 0) || fetched,
      sources: results,
      message: results.map((row) => row.message).filter(Boolean).join(' ') || '공공 API 수집 결과를 반영했습니다.',
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
    const message = err instanceof Error ? err.message : 'live aborted';
    console.error('[culture-sync] live aborted', { message, fallback: false });
    return {
      success: false,
      fallback: false,
      source: 'none',
      sourceLabel: '공공 API 수집',
      targetApi: 'searchFestival2',
      fetched: 0,
      upserted: 0,
      skipped: 0,
      persisted: false,
      failed: 1,
      categories: [] as Array<{ name: string; count: number }>,
      count: 0,
      sources: [],
      message: `공공 API 수집이 중단되었습니다. ${message}`,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
