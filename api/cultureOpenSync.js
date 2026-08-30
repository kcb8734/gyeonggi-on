import { persistTourFestivals, listFestivalCategoryCounts } from './festivalDbSync.js';
import { buildFallbackFestivals, FALLBACK_SYNC_MIN, fallbackSyncPayload } from './cultureSyncFallback.js';
import { syncGgCultureEvents } from './ggCultureSync.js';
import { syncSeoulCultureEvents } from './seoulCultureSync.js';
import { mergeCategoryCounts } from './seoulCultureXml.js';

function sourceHint(query = {}) {
  return String(query.source || query.api || '').toLowerCase();
}

function withBudget(options = {}) {
  return {
    pageSize: 80,
    maxPages: 1,
    ...options,
  };
}

async function applySampleFallback(reason) {
  const items = buildFallbackFestivals(FALLBACK_SYNC_MIN);
  console.error('[culture-sync] using sample fallback', {
    reason: reason || 'live empty',
    items: items.length,
  });
  const persist = await persistTourFestivals(items, { source: 'sample' });
  const payload = fallbackSyncPayload(items, persist);
  if (persist.ok) {
    const live = await listFestivalCategoryCounts();
    if (live.length) payload.categories = live;
  }
  return payload;
}

async function runLive(query = {}, options = {}) {
  const hint = sourceHint(query);
  const wantSeoul = !hint || hint === 'all' || hint === 'seoul' || hint === 'culturaleventinfo' || hint === 'open';
  const wantGg = !hint || hint === 'all' || hint === 'gg' || hint === 'ggc' || hint === 'ggculture' || hint === 'open';
  console.log('[culture-sync] start', {
    hint: hint || 'all',
    seoul: wantSeoul,
    gyeonggi: wantGg,
    hasSeoulKey: Boolean(process.env.SEOUL_CULTURE_API_KEY || process.env.SEOUL_OPENAPI_KEY),
    hasGgKey: Boolean(process.env.GG_CULTURE_API_KEY || process.env.GGCULTURE_API_KEY || process.env.GG_OPENAPI_KEY),
  });
  const results = [];
  if (wantSeoul) results.push(await syncSeoulCultureEvents(withBudget(options.seoul || {})));
  if (wantGg) results.push(await syncGgCultureEvents(withBudget(options.gg || {})));
  if (!results.length) {
    return applySampleFallback('unsupported source');
  }
  const fetched = results.reduce((sum, row) => sum + Number(row.fetched || 0), 0);
  const upserted = results.reduce((sum, row) => sum + Number(row.upserted || 0), 0);
  const skipped = results.reduce((sum, row) => sum + Number(row.skipped || 0), 0);
  const failed = results.reduce((sum, row) => sum + Number(row.failed || 0), 0);
  const persisted = results.some((row) => row.persisted);
  const success = results.some((row) => row.success);
  console.log('[culture-sync] live done', {
    fetched,
    upserted,
    failed,
    persisted,
    success,
    sources: results.map((row) => ({ api: row.targetApi, fetched: row.fetched, message: row.message })),
  });
  if (!success || fetched < FALLBACK_SYNC_MIN) {
    const fallback = await applySampleFallback(success ? `fetched=${fetched}` : results.map((row) => row.message).join(' '));
    fallback.sources = results;
    fallback.fetched = Math.max(fallback.fetched, fetched);
    return fallback;
  }
  let categories = mergeCategoryCounts(...results.map((row) => row.categories || []));
  if (persisted) {
    const live = await listFestivalCategoryCounts();
    if (live.length) categories = live;
  }
  const labels = results.filter((row) => row.success || row.fetched).map((row) => row.sourceLabel).filter(Boolean);
  const apis = results.map((row) => row.targetApi).filter(Boolean);
  return {
    success: true,
    source: apis.join('+') || 'none',
    sourceLabel: labels.join(' · ') || '서울시·경기도 문화행사 OpenAPI',
    targetApi: apis[0] || 'culturalEventInfo',
    fetched,
    upserted,
    skipped,
    persisted,
    failed,
    categories,
    count: categories.reduce((sum, row) => sum + Number(row.count || 0), 0) || upserted || fetched,
    sources: results,
    message: results.map((row) => row.message).filter(Boolean).join(' '),
  };
}

export async function syncOpenCultureEvents(query = {}, options = {}) {
  const budgetMs = Number(options.budgetMs || 18000);
  let timer;
  try {
    return await Promise.race([
      runLive(query, options),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`culture-sync budget ${budgetMs}ms exceeded`)), budgetMs);
      }),
    ]);
  } catch (err) {
    console.error('[culture-sync] live aborted', err && err.message ? err.message : err);
    return applySampleFallback(err && err.message ? err.message : 'live aborted');
  } finally {
    if (timer) clearTimeout(timer);
  }
}
