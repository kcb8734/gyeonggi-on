import { REGION_LABEL } from '../constants/metroLocalities';
import { tryQuery } from '../db/pool';
import { matchingMatrix, memoryEngine, memoryGuardLogs, memoryEditorsPicks } from './inMemoryPlatform';
import { listFeedRewards } from './feedRewardService';
import { catalogOpenSources, decorateOpenSources } from './metroOpenSources';

export async function getAdminDashboard() {
  const festivals = await tryQuery(`SELECT COUNT(*)::int AS n FROM festivals`);
  const merchants = await tryQuery(`SELECT COUNT(*)::int AS n FROM merchants`);
  const coupons = await tryQuery(`SELECT COUNT(*)::int AS issued, COUNT(*) FILTER (WHERE is_used OR status = 'USED')::int AS used FROM user_coupons`);
  const scanCoupons = await tryQuery(`SELECT COUNT(*)::int AS issued, COUNT(*) FILTER (WHERE is_used)::int AS used FROM coupons`);
  const syncLogs = await tryQuery(
    `SELECT ran_at, target_api, fetched, failed, status FROM tour_sync_logs ORDER BY ran_at DESC LIMIT 8`,
  );
  const categoryRows = await tryQuery(
    `SELECT COALESCE(NULLIF(TRIM(category), ''), '기타') AS name, COUNT(*)::int AS count
     FROM festivals
     GROUP BY 1
     ORDER BY count DESC, name ASC`,
  );
  const sourceRows = await tryQuery(
    `SELECT COALESCE(NULLIF(TRIM(source), ''), 'db') AS source, COUNT(*)::int AS count
     FROM festivals GROUP BY 1`,
  );
  const sourceMetroRows = await tryQuery(
    `SELECT
       COALESCE(NULLIF(TRIM(f.source), ''), 'db') AS source,
       COALESCE(NULLIF(TRIM(mu.metro_region), ''), 'GYEONGGI') AS metro,
       COUNT(*)::int AS count
     FROM festivals f
     LEFT JOIN municipalities mu ON mu.id = f.municipality_id
     GROUP BY 1, 2`,
  );
  const weights = await tryQuery(`SELECT * FROM admin_engine_settings WHERE id = 'default'`);
  const courses = await tryQuery(
    `SELECT id, festival_title, course_json, is_editors_pick, recommend_count, save_count FROM ai_courses ORDER BY created_at DESC LIMIT 12`,
  );

  const issued = Number(coupons?.rows[0]?.issued ?? 0) + Number(scanCoupons?.rows[0]?.issued ?? 0);
  const used = Number(coupons?.rows[0]?.used ?? 0) + Number(scanCoupons?.rows[0]?.used ?? 0);
  const festivalCount = Number(festivals?.rows[0]?.n ?? 0) || 12;
  const merchantCount = Number(merchants?.rows[0]?.n ?? 0) || 18;
  const matrix = matchingMatrix();
  const unassigned = matrix.filter((row) => !row.officerName);
  const assignedCount = matrix.length - unassigned.length;
  const couponRows = [
    { id: 'CP-1001', festival: '장단콩 축제', store: '문산시장 콩국수', issued: 12, used: 4, recovery: 33, period: '2026-08', region: 'GYEONGGI', couponType: 'OFFICIAL' },
    { id: 'CP-1002', festival: '수원화성문화제', store: '화성행궁 한정식', issued: 12, used: 5, recovery: 42, period: '2026-08', region: 'GYEONGGI', couponType: 'OFFICIAL' },
    { id: 'CP-2008', festival: '보령머드축제', store: '대천항활어회센터', issued: 8, used: 3, recovery: 38, period: '2026-08', region: 'CHUNGNAM', couponType: 'SELF' },
    { id: 'CP-3011', festival: '진주남강유등축제', store: '진주중앙시장', issued: 10, used: 4, recovery: 40, period: '2026-08', region: 'GYEONGNAM', couponType: 'SELF' },
    { id: 'CP-4015', festival: '화천산천어축제', store: '화천재래시장', issued: 6, used: 2, recovery: 33, period: '2026-08', region: 'GANGWON', couponType: 'SELF' },
    { id: 'CP-5022', festival: '보성차밭빛축제', store: '보성녹차거리', issued: 7, used: 3, recovery: 43, period: '2026-08', region: 'JEONNAM', couponType: 'SELF' },
  ];
  const mappedCourses = (courses?.rows ?? []).map((row) => ({
    id: row.id,
    festival: row.festival_title,
    elements: '캠핑/역사/시장',
    recommendCount: row.recommend_count,
    saveCount: row.save_count,
    editorsPick: row.is_editors_pick,
  }));

  return {
    kpi: {
      festivals: festivalCount,
      festivalsDelta: 2,
      festivalsDeltaPct: 18,
      merchants: merchantCount,
      merchantsNtsVerified: merchantCount,
      couponsIssued: issued || 24,
      couponsUsed: used || 9,
      recoveryRate: issued || used ? Math.round((used || 9) / (issued || 24) * 100) : 38,
      matchingAssigned: assignedCount,
      matchingTotal: matrix.length,
      matchingCoverage: `${assignedCount}/${matrix.length}`,
    },
    tour: {
      quotaUsed: 42,
      quotaLimit: 1000,
      lastSync: syncLogs?.rows[0]?.ran_at || '오늘 07:00 KST',
      source: /culturalEventInfo/i.test(String(syncLogs?.rows[0]?.target_api || ''))
        ? '서울시 문화행사 culturalEventInfo'
        : /GGCULTURE/i.test(String(syncLogs?.rows[0]?.target_api || ''))
          ? '경기도 문화행사 GGCULTUREVENTSTUS'
          : '한국관광공사 TourAPI 4.0',
      categories: categoryRows?.rows?.length
        ? categoryRows.rows
        : [
          { name: '축제/행사', count: festivalCount },
          { name: '역사체험', count: 8 },
          { name: '캠핑장', count: 6 },
          { name: '음식점', count: 21 },
        ],
      logs: syncLogs?.rows.length
        ? syncLogs.rows
        : [
          { ran_at: new Date().toISOString(), target_api: 'areaBasedList1', fetched: 42, failed: 0, status: '정상' },
          { ran_at: new Date(Date.now() - 9 * 3600 * 1000).toISOString(), target_api: 'searchFestival2', fetched: 18, failed: 0, status: '정상' },
          { ran_at: new Date(Date.now() - 15 * 3600 * 1000).toISOString(), target_api: 'detailCommon2', fetched: 31, failed: 0, status: '정상' },
          { ran_at: new Date(Date.now() - 21 * 3600 * 1000).toISOString(), target_api: 'locationBasedList1', fetched: 24, failed: 0, status: '정상' },
        ],
      sources: decorateOpenSources(catalogOpenSources(), {
        sourceCounts: sourceRows?.rows ?? [],
        sourceMetroCounts: sourceMetroRows?.rows ?? [],
      }),
    },
    coupons: couponRows,
    matching: matrix,
    feedRewards: listFeedRewards(),
    unassigned,
    regions: Object.entries(REGION_LABEL).map(([id, label]) => ({ id, label })),
    cities: matrix.map((row) => row.city),
    engine: weights?.rows[0] ? {
      festivalWeight: Number(weights.rows[0].festival_weight),
      campingDistanceWeight: Number(weights.rows[0].camping_distance_weight),
      marketRatioWeight: Number(weights.rows[0].market_ratio_weight),
      historyWeight: Number(weights.rows[0].history_weight),
    } : memoryEngine,
    courses: mappedCourses.length
      ? mappedCourses
      : [{ id: 'course-1', festival: '장단콩 축제', elements: '캠핑/역사/시장', recommendCount: 12, saveCount: 4, editorsPick: false }],
    weekly: [
      { label: '7/27', recovery: 25, used: 1 },
      { label: '8/3', recovery: 40, used: 2 },
      { label: '8/10', recovery: 43, used: 3 },
      { label: '8/17', recovery: 36, used: 4 },
      { label: '8/24', recovery: issued || used ? Math.round((used || 9) / (issued || 24) * 100) : 38, used: used || 9 },
    ],
    guardLogs: memoryGuardLogs,
  };
}

export async function updateEngineWeights(input: {
  festivalWeight?: number;
  campingDistanceWeight?: number;
  marketRatioWeight?: number;
  historyWeight?: number;
}) {
  memoryEngine.festivalWeight = Number(input.festivalWeight ?? memoryEngine.festivalWeight);
  memoryEngine.campingDistanceWeight = Number(input.campingDistanceWeight ?? memoryEngine.campingDistanceWeight);
  memoryEngine.marketRatioWeight = Number(input.marketRatioWeight ?? memoryEngine.marketRatioWeight);
  memoryEngine.historyWeight = Number(input.historyWeight ?? memoryEngine.historyWeight);
  await tryQuery(
    `INSERT INTO admin_engine_settings (id, festival_weight, camping_distance_weight, market_ratio_weight, history_weight, updated_at)
     VALUES ('default', $1, $2, $3, $4, NOW())
     ON CONFLICT (id) DO UPDATE SET
       festival_weight = EXCLUDED.festival_weight,
       camping_distance_weight = EXCLUDED.camping_distance_weight,
       market_ratio_weight = EXCLUDED.market_ratio_weight,
       history_weight = EXCLUDED.history_weight,
       updated_at = NOW()`,
    [memoryEngine.festivalWeight, memoryEngine.campingDistanceWeight, memoryEngine.marketRatioWeight, memoryEngine.historyWeight],
  );
  return memoryEngine;
}

export async function markEditorsPick(courseId: string, enabled = true) {
  if (enabled) memoryEditorsPicks.add(courseId);
  else memoryEditorsPicks.delete(courseId);
  await tryQuery(`UPDATE ai_courses SET is_editors_pick = $2 WHERE id = $1`, [courseId, enabled]);
  return { courseId, editorsPick: enabled };
}

export function addGuardLog(text: string) {
  const blocked = /비속|욕설|악성/.test(text);
  const row = { at: new Date().toISOString(), text, blocked };
  memoryGuardLogs.unshift(row);
  return row;
}

export function settlementCsv() {
  const header = '권역,시군,담당자,매칭상가,활성축제,쿠폰,승인';
  const rows = matchingMatrix().map((row) => [
    row.regionLabel || REGION_LABEL[row.region] || row.region || '',
    row.city,
    row.officerName || '미지정',
    row.stores,
    row.festivals,
    row.coupons,
    row.approved ? '승인' : '대기',
  ].join(','));
  return [header, ...rows].join('\n');
}
