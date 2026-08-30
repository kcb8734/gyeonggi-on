import { listFestivalCategoryCounts } from './festivalDbSync.js';
import { syncGgCultureEvents } from './ggCultureSync.js';
import { syncSeoulCultureEvents } from './seoulCultureSync.js';
import { mergeCategoryCounts } from './seoulCultureXml.js';

function sourceHint(query = {}) {
  return String(query.source || query.api || '').toLowerCase();
}

export async function syncOpenCultureEvents(query = {}, options = {}) {
  const hint = sourceHint(query);
  const wantSeoul = !hint || hint === 'all' || hint === 'seoul' || hint === 'culturaleventinfo' || hint === 'open';
  const wantGg = !hint || hint === 'all' || hint === 'gg' || hint === 'ggc' || hint === 'ggculture' || hint === 'open';
  const results = [];
  if (wantSeoul) results.push(await syncSeoulCultureEvents(options.seoul || {}));
  if (wantGg) results.push(await syncGgCultureEvents(options.gg || {}));
  if (!results.length) {
    return {
      success: false,
      source: 'none',
      sourceLabel: '',
      targetApi: '',
      fetched: 0,
      upserted: 0,
      skipped: 0,
      failed: 1,
      categories: [],
      count: 0,
      message: '지원하지 않는 수집 소스입니다.',
    };
  }
  const fetched = results.reduce((sum, row) => sum + Number(row.fetched || 0), 0);
  const upserted = results.reduce((sum, row) => sum + Number(row.upserted || 0), 0);
  const skipped = results.reduce((sum, row) => sum + Number(row.skipped || 0), 0);
  const failed = results.reduce((sum, row) => sum + Number(row.failed || 0), 0);
  const persisted = results.some((row) => row.persisted);
  const success = results.some((row) => row.success);
  let categories = mergeCategoryCounts(...results.map((row) => row.categories || []));
  if (persisted) {
    const live = await listFestivalCategoryCounts();
    if (live.length) categories = live;
  }
  const labels = results.filter((row) => row.success || row.fetched).map((row) => row.sourceLabel).filter(Boolean);
  const apis = results.map((row) => row.targetApi).filter(Boolean);
  const messages = results.map((row) => row.message).filter(Boolean);
  return {
    success,
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
    message: messages.join(' '),
  };
}
