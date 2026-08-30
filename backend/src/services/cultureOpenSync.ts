import { tryQuery } from '../db/pool';
import { syncGgCultureEvents } from './ggCultureEventService';
import { syncSeoulCultureEvents } from './seoulCultureEventService';
import { mergeCategoryCounts } from './seoulCultureXml';

function sourceHint(query: { source?: string; api?: string } = {}) {
  return String(query.source || query.api || '').toLowerCase();
}

export async function syncOpenCultureEvents(
  query: { source?: string; api?: string } = {},
  options: { seoul?: Parameters<typeof syncSeoulCultureEvents>[0]; gg?: Parameters<typeof syncGgCultureEvents>[0] } = {},
) {
  const hint = sourceHint(query);
  const wantSeoul = !hint || hint === 'all' || hint === 'seoul' || hint === 'culturaleventinfo' || hint === 'open';
  const wantGg = !hint || hint === 'all' || hint === 'gg' || hint === 'ggc' || hint === 'ggculture' || hint === 'open';
  const results = [];
  if (wantSeoul) results.push(await syncSeoulCultureEvents(options.seoul || {}));
  if (wantGg) results.push(await syncGgCultureEvents(options.gg || {}));
  const fetched = results.reduce((sum, row) => sum + Number(row.fetched || 0), 0);
  const upserted = results.reduce((sum, row) => sum + Number(row.upserted || 0), 0);
  const skipped = results.reduce((sum, row) => sum + Number(row.skipped || 0), 0);
  const failed = results.reduce((sum, row) => sum + Number(row.failed || 0), 0);
  const persisted = results.some((row) => row.persisted);
  const success = results.some((row) => row.success);
  let categories = mergeCategoryCounts(...results.map((row) => row.categories || []));
  if (persisted) {
    const live = await tryQuery(
      `SELECT COALESCE(NULLIF(TRIM(category), ''), '기타') AS name, COUNT(*)::int AS count
       FROM festivals GROUP BY 1 ORDER BY count DESC, name ASC`,
    );
    if (live?.rows?.length) categories = live.rows as Array<{ name: string; count: number }>;
  }
  const labels = results.filter((row) => row.success || row.fetched).map((row) => row.sourceLabel).filter(Boolean);
  const apis = results.map((row) => row.targetApi).filter(Boolean);
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
    message: results.map((row) => row.message).filter(Boolean).join(' '),
  };
}
