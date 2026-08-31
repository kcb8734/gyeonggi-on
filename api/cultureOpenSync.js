import { listFestivalCategoryCounts } from './festivalDbSync.js';
import { syncGgCultureEvents } from './ggCultureSync.js';
import { syncIfacCultureEvents } from './ifacCultureSync.js';
import { syncSeoulCultureEvents } from './seoulCultureSync.js';
import { syncTourMetroEvents } from './metroTourSync.js';
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

function summarize(results) {
  const fetched = results.reduce((sum, row) => sum + Number(row.fetched || 0), 0);
  const upserted = results.reduce((sum, row) => sum + Number(row.upserted || 0), 0);
  const skipped = results.reduce((sum, row) => sum + Number(row.skipped || 0), 0);
  const failed = results.reduce((sum, row) => sum + Number(row.failed || 0), 0);
  const persisted = results.some((row) => row.persisted);
  const success = results.some((row) => row.success || Number(row.fetched || 0) > 0);
  return { fetched, upserted, skipped, failed, persisted, success };
}

function livePayload(results, extra = {}) {
  const stats = summarize(results);
  const labels = results.filter((row) => row.success || row.fetched).map((row) => row.sourceLabel).filter(Boolean);
  const apis = results.map((row) => row.targetApi).filter(Boolean);
  return {
    success: stats.success,
    fallback: false,
    source: apis.join('+') || 'none',
    sourceLabel: labels.join(' · ') || 'TourAPI · 서울시 · 경기도 · 인천 문화행사 OpenAPI',
    targetApi: apis[0] || 'searchFestival2',
    fetched: stats.fetched,
    upserted: stats.upserted,
    skipped: stats.skipped,
    persisted: stats.persisted,
    failed: stats.failed,
    categories: extra.categories || [],
    count: extra.count || stats.upserted || stats.fetched,
    sources: results,
    message: results.map((row) => row.message).filter(Boolean).join(' ') || extra.message || '공공 API 수집 결과를 반영했습니다.',
  };
}

async function runLive(query = {}, options = {}) {
  const hint = sourceHint(query);
  const wantTour = !hint || hint === 'all' || hint === 'open' || hint === 'tour';
  const wantSeoul = !hint || hint === 'all' || hint === 'seoul' || hint === 'culturaleventinfo' || hint === 'open';
  const wantGg = !hint || hint === 'all' || hint === 'gg' || hint === 'ggc' || hint === 'ggculture' || hint === 'open';
  const wantIfac = !hint || hint === 'all' || hint === 'ifac' || hint === 'incheon' || hint === 'open';
  console.log('[culture-sync] start', {
    hint: hint || 'all',
    tour: wantTour,
    seoul: wantSeoul,
    gyeonggi: wantGg,
    incheon: wantIfac,
    hasTourKey: Boolean(process.env.TOUR_API_SERVICE_KEY || process.env.NTS_SERVICE_KEY),
    hasSeoulKey: Boolean(process.env.SEOUL_CULTURE_API_KEY || process.env.SEOUL_OPENAPI_KEY),
    hasGgKey: Boolean(process.env.GG_CULTURE_API_KEY || process.env.GGCULTURE_API_KEY || process.env.GG_OPENAPI_KEY),
    hasIfacKey: Boolean(process.env.INCHEON_API_KEY || process.env.IFAC_API_KEY || process.env.INCHEON_CULTURE_API_KEY),
  });
  const jobs = [];
  if (wantTour) jobs.push(syncTourMetroEvents({ areaCode: 'all', numOfRows: 80 }));
  if (wantSeoul) jobs.push(syncSeoulCultureEvents(withBudget(options.seoul || {})));
  if (wantGg) jobs.push(syncGgCultureEvents(withBudget(options.gg || {})));
  if (wantIfac) jobs.push(syncIfacCultureEvents(withBudget(options.ifac || {})));
  const results = jobs.length ? await Promise.all(jobs) : [];
  if (!results.length) {
    return livePayload([], { message: '지원하지 않는 수집 소스입니다.' });
  }
  const stats = summarize(results);
  console.log('[culture-sync] live done', {
    fetched: stats.fetched,
    upserted: stats.upserted,
    failed: stats.failed,
    persisted: stats.persisted,
    success: stats.success,
    fallback: false,
    sources: results.map((row) => ({ api: row.targetApi, fetched: row.fetched, code: row.code, message: row.message })),
  });
  let categories = mergeCategoryCounts(...results.map((row) => row.categories || []));
  if (stats.persisted) {
    const live = await listFestivalCategoryCounts();
    if (live.length) categories = live;
  }
  const payload = livePayload(results, { categories });
  payload.count = categories.reduce((sum, row) => sum + Number(row.count || 0), 0) || payload.upserted || payload.fetched;
  payload.categories = categories;
  return payload;
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
    const message = err && err.message ? err.message : 'live aborted';
    console.error('[culture-sync] live aborted', { message, fallback: false });
    return livePayload([], { message: `공공 API 수집이 중단되었습니다. ${message}` });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
