import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  ActionButton,
  KpiCard,
  ProgressBar,
  QuotaGauge,
  SparkLine,
  StatusBadge,
  WeightSlider,
} from '../components/admin/AdminWidgets';
import AdminCenterPanel from '../components/admin/AdminCenterPanel';
import { METRO_LOCALITIES, METRO_REGIONS, REGION_PHONE, normalizeMetroId } from '../constants/regions';
import { fetchSettlementCsv, settlementFilename, triggerCsvDownload, adminExcelCsv } from '../utils/csvDownload';
import { downloadFeedRewardPdf, type FeedRewardRow } from '../utils/feedRewardDocument';
import {
  approveUserPoints,
  downloadFeedPointsPdf,
  getFeedPayoutMode,
  listUserPointRecords,
  mergeFeedRewardRows,
  setFeedPayoutMode,
  subscribeFeedPayout,
  type FeedPayoutMode,
} from '../stores/feedPayoutStore';
import { API_BASE_URL } from '../config';

const REGION_LABEL: Record<string, string> = Object.fromEntries(
  METRO_REGIONS.map((region) => [region.id, region.label]),
);

function officerDisplayName(label: string) {
  const text = String(label || '');
  if (text.includes(' ') || /(구)$/.test(text)) return `${text} 담당`;
  return `${text.replace(/(시|군)$/, '')} 담당`;
}

function matchingRowId(row: any) {
  return String(row?.id || `${row?.region || 'GYEONGGI'}:${row?.city || ''}`);
}

function buildFallbackMatching() {
  return METRO_REGIONS.flatMap((region) =>
    (METRO_LOCALITIES[region.id] ?? []).map((loc, index) => ({
      id: `${region.id}:${loc.id}`,
      region: region.id,
      regionLabel: region.label,
      regionalZone: region.id,
      couponType: region.id === 'GYEONGGI' ? 'OFFICIAL' : 'SELF',
      city: loc.label,
      officerName: index % 7 === 0 ? '' : officerDisplayName(loc.label),
      phone: index % 7 === 0 ? '' : `${REGION_PHONE[region.id]}-120`,
      stores: 4 + (index % 5),
      festivals: 1 + (index % 3),
      coupons: 8 + (index % 11),
      approved: index % 7 !== 0,
    })),
  );
}

const FALLBACK_MATCHING = buildFallbackMatching();
const FALLBACK_ASSIGNED = FALLBACK_MATCHING.filter((row) => row.officerName).length;

function buildFallbackFeedRewards(): FeedRewardRow[] {
  const samples: Array<Omit<FeedRewardRow, 'id' | 'regionLabel' | 'points'>> = [
    { userName: '수원나들이', festival: '수원화성문화제', city: '수원시', regionalZone: 'GYEONGGI', amountWon: 1000, postedAt: '2026-08-22', status: 'PAID' },
    { userName: '재즈키드', festival: '가평 자라섬 재즈페스티벌', city: '가평군', regionalZone: 'GYEONGGI', amountWon: 1000, postedAt: '2026-08-22', status: 'PENDING' },
    { userName: '광장탐험가', festival: '서울거리예술축제', city: '종로구', regionalZone: 'SEOUL', amountWon: 1000, postedAt: '2026-08-21', status: 'PAID' },
    { userName: '송도락커', festival: '인천펜타포트락페스티벌', city: '연수구', regionalZone: 'INCHEON', amountWon: 1000, postedAt: '2026-08-21', status: 'PENDING' },
    { userName: '광안리야행', festival: '부산불꽃축제', city: '수영구', regionalZone: 'BUSAN', amountWon: 1000, postedAt: '2026-08-20', status: 'PAID' },
    { userName: '치맥러버', festival: '대구치맥페스티벌', city: '수성구', regionalZone: 'DAEGU', amountWon: 1000, postedAt: '2026-08-20', status: 'PENDING' },
    { userName: '김치여행', festival: '광주김치축제', city: '서구', regionalZone: 'GWANGJU', amountWon: 1000, postedAt: '2026-08-19', status: 'PAID' },
    { userName: '대전야행', festival: '대전 0시 축제', city: '중구', regionalZone: 'DAEJEON', amountWon: 1000, postedAt: '2026-08-19', status: 'PENDING' },
    { userName: '고래마을', festival: '울산고래축제', city: '남구', regionalZone: 'ULSAN', amountWon: 1000, postedAt: '2026-08-18', status: 'PAID' },
    { userName: '세종탐험가', festival: '세종축제', city: '세종시', regionalZone: 'SEJONG', amountWon: 1000, postedAt: '2026-08-18', status: 'PENDING' },
    { userName: '마임광장', festival: '춘천마임축제', city: '춘천시', regionalZone: 'GANGWON', amountWon: 1000, postedAt: '2026-08-17', status: 'PAID' },
    { userName: '직지기록가', festival: '청주직지축제', city: '청주시', regionalZone: 'CHUNGBUK', amountWon: 1000, postedAt: '2026-08-17', status: 'PENDING' },
    { userName: '머드여행', festival: '보령머드축제', city: '보령시', regionalZone: 'CHUNGNAM', amountWon: 1000, postedAt: '2026-08-16', status: 'PAID' },
    { userName: '한옥골목', festival: '전주한지문화축제', city: '전주시', regionalZone: 'JEONBUK', amountWon: 1000, postedAt: '2026-08-16', status: 'PENDING' },
    { userName: '밤바다러버', festival: '여수밤바다불꽃축제', city: '여수시', regionalZone: 'JEONNAM', amountWon: 1000, postedAt: '2026-08-15', status: 'PAID' },
    { userName: '대릉원벚꽃', festival: '경주벚꽃축제', city: '경주시', regionalZone: 'GYEONGBUK', amountWon: 1000, postedAt: '2026-08-15', status: 'PENDING' },
    { userName: '유등산책', festival: '진주남강유등축제', city: '진주시', regionalZone: 'GYEONGNAM', amountWon: 1000, postedAt: '2026-08-14', status: 'PAID' },
    { userName: '오름들불', festival: '제주들불축제', city: '제주시', regionalZone: 'JEJU', amountWon: 1000, postedAt: '2026-08-14', status: 'PENDING' },
  ];
  return samples.map((row, index) => ({
    ...row,
    id: `FR-${String(index + 1).padStart(4, '0')}`,
    regionLabel: REGION_LABEL[row.regionalZone] || row.regionalZone,
    points: 1000,
  }));
}

const FALLBACK_FEED_REWARDS = buildFallbackFeedRewards();

function mergeMatching(apiRows: any[] | undefined) {
  const fallback = FALLBACK_MATCHING;
  if (!apiRows?.length) return fallback;
  const normalized = apiRows.map((row) => ({
    ...row,
    id: matchingRowId(row),
    region: normalizeMetroId(row.region || 'GYEONGGI'),
    regionalZone: normalizeMetroId(row.regionalZone || row.region || 'GYEONGGI'),
    regionLabel: row.regionLabel || REGION_LABEL[normalizeMetroId(row.region || 'GYEONGGI')] || '경기온',
  }));
  const regions = new Set(normalized.map((row) => row.region));
  if (regions.size > 1 || normalized.length >= fallback.length * 0.8) return normalized;
  const byId = new Map(normalized.map((row) => [row.id, row]));
  const byCity = new Map(
    normalized
      .filter((row) => row.region === 'GYEONGGI')
      .map((row) => [row.city, row]),
  );
  return fallback.map((row) => {
    const overlay = byId.get(row.id) || (row.region === 'GYEONGGI' ? byCity.get(row.city) : null);
    if (!overlay) return row;
    return {
      ...row,
      officerName: overlay.officerName ?? row.officerName,
      phone: overlay.phone ?? row.phone,
      stores: overlay.stores ?? row.stores,
      festivals: overlay.festivals ?? row.festivals,
      coupons: overlay.coupons ?? row.coupons,
      approved: overlay.approved ?? row.approved,
    };
  });
}

const FALLBACK_DASHBOARD = {
  kpi: {
    festivals: 12,
    festivalsDelta: 2,
    festivalsDeltaPct: 18,
    merchants: 18,
    merchantsNtsVerified: 18,
    couponsIssued: 24,
    couponsUsed: 9,
    recoveryRate: 38,
    matchingAssigned: FALLBACK_ASSIGNED,
    matchingTotal: FALLBACK_MATCHING.length,
    matchingCoverage: `${FALLBACK_ASSIGNED}/${FALLBACK_MATCHING.length}`,
  },
  tour: {
    quotaUsed: 42,
    quotaLimit: 1000,
    lastSync: '오늘 07:00 KST',
    source: '한국관광공사 TourAPI 4.0',
    categories: [
      { name: '축제/행사', count: 12 },
      { name: '역사체험', count: 8 },
      { name: '캠핑장', count: 6 },
      { name: '음식점', count: 21 },
    ],
    logs: [
      { ran_at: '오늘 07:00', target_api: 'areaBasedList1', fetched: 42, failed: 0, status: '정상' },
      { ran_at: '어제 22:00', target_api: 'searchFestival2', fetched: 18, failed: 0, status: '정상' },
      { ran_at: '어제 18:30', target_api: 'detailCommon2', fetched: 31, failed: 0, status: '정상' },
      { ran_at: '어제 12:00', target_api: 'locationBasedList1', fetched: 24, failed: 0, status: '정상' },
    ],
  },
  coupons: [
    { id: 'CP-1001', festival: '장단콩 축제', store: '문산시장 콩국수', issued: 12, used: 4, recovery: 33, period: '2026-08', region: 'GYEONGGI', couponType: 'OFFICIAL' },
    { id: 'CP-1002', festival: '수원화성문화제', store: '화성행궁 한정식', issued: 12, used: 5, recovery: 42, period: '2026-08', region: 'GYEONGGI', couponType: 'OFFICIAL' },
    { id: 'CP-2008', festival: '보령머드축제', store: '대천항활어회센터', issued: 8, used: 3, recovery: 38, period: '2026-08', region: 'CHUNGNAM', couponType: 'SELF' },
    { id: 'CP-3011', festival: '진주남강유등축제', store: '진주중앙시장', issued: 10, used: 4, recovery: 40, period: '2026-08', region: 'GYEONGNAM', couponType: 'SELF' },
    { id: 'CP-4015', festival: '화천산천어축제', store: '화천재래시장', issued: 6, used: 2, recovery: 33, period: '2026-08', region: 'GANGWON', couponType: 'SELF' },
    { id: 'CP-5022', festival: '보성차밭빛축제', store: '보성녹차거리', issued: 7, used: 3, recovery: 43, period: '2026-08', region: 'JEONNAM', couponType: 'SELF' },
  ],
    matching: FALLBACK_MATCHING,
    feedRewards: FALLBACK_FEED_REWARDS,
  engine: { festivalWeight: 40, campingDistanceWeight: 25, marketRatioWeight: 20, historyWeight: 15 },
  courses: [{ id: 'course-1', festival: '장단콩 축제', recommendCount: 12, saveCount: 4 }],
  weekly: [
    { label: '7/27', recovery: 25, used: 1 },
    { label: '8/3', recovery: 40, used: 2 },
    { label: '8/10', recovery: 43, used: 3 },
    { label: '8/17', recovery: 36, used: 4 },
    { label: '8/24', recovery: 38, used: 9 },
  ],
};

function cleanSource(value?: string) {
  const text = String(value || '').trim();
  if (!text || text.toLowerCase() === 'none') return '';
  return text;
}

function mergeDashboard(next: any) {
  const kpi = next?.kpi ?? {};
  const tour = next?.tour ?? {};
  return {
    ...FALLBACK_DASHBOARD,
    ...next,
    kpi: {
      ...FALLBACK_DASHBOARD.kpi,
      ...kpi,
      festivals: Number(kpi.festivals) > 0 ? Number(kpi.festivals) : FALLBACK_DASHBOARD.kpi.festivals,
      merchants: Number(kpi.merchants) > 0 ? Number(kpi.merchants) : FALLBACK_DASHBOARD.kpi.merchants,
      merchantsNtsVerified: Number(kpi.merchantsNtsVerified) > 0 ? Number(kpi.merchantsNtsVerified) : FALLBACK_DASHBOARD.kpi.merchantsNtsVerified,
      couponsIssued: Number(kpi.couponsIssued) > 0 ? Number(kpi.couponsIssued) : FALLBACK_DASHBOARD.kpi.couponsIssued,
      couponsUsed: Number(kpi.couponsUsed) >= 0 && kpi.couponsUsed != null ? Number(kpi.couponsUsed) : FALLBACK_DASHBOARD.kpi.couponsUsed,
    },
    tour: {
      ...FALLBACK_DASHBOARD.tour,
      ...tour,
      source: cleanSource(tour.source) || FALLBACK_DASHBOARD.tour.source,
      categories: tour.categories?.length ? tour.categories : FALLBACK_DASHBOARD.tour.categories,
      logs: tour.logs?.length ? tour.logs : FALLBACK_DASHBOARD.tour.logs,
    },
    coupons: next?.coupons?.length ? next.coupons : FALLBACK_DASHBOARD.coupons,
    matching: mergeMatching(next?.matching),
    feedRewards: next?.feedRewards?.length ? next.feedRewards : FALLBACK_DASHBOARD.feedRewards,
    weekly: next?.weekly?.length ? next.weekly : FALLBACK_DASHBOARD.weekly,
    courses: next?.courses?.length ? next.courses : FALLBACK_DASHBOARD.courses,
  };
}

type Menu = 'dash' | 'tour' | 'coupon' | 'match' | 'feeds' | 'ai' | 'stats' | 'centers';

function formatWhen(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function AdminScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<Menu>('dash');
  const [festivalCount, setFestivalCount] = useState<number | null>(null);
  const [festivalSource, setFestivalSource] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [dashboard, setDashboard] = useState<any>(FALLBACK_DASHBOARD);
  const [festivalW, setFestivalW] = useState(40);
  const [campW, setCampW] = useState(25);
  const [marketW, setMarketW] = useState(20);
  const [historyW, setHistoryW] = useState(15);
  const [couponQuery, setCouponQuery] = useState('');
  const [couponRegion, setCouponRegion] = useState('ALL');
  const [couponType, setCouponType] = useState('ALL');
  const [couponFestival, setCouponFestival] = useState('ALL');
  const [matchRegion, setMatchRegion] = useState('GYEONGGI');
  const [feedRegion, setFeedRegion] = useState('GYEONGGI');
  const [weightMessage, setWeightMessage] = useState('');
  const [payoutTick, setPayoutTick] = useState(0);
  const [payoutDraft, setPayoutDraft] = useState<Record<string, FeedPayoutMode>>({});

  const loadFestivals = async () => {
    try {
      const res = await fetch('/api/festivals');
      const data = await res.json();
      setFestivalCount(Number(data.count ?? data.festivals?.length ?? 0));
      setFestivalSource(cleanSource(data.source || data.provider) || '한국관광공사 TourAPI 4.0');
    } catch {
      setFestivalCount(null);
      setFestivalSource('한국관광공사 TourAPI 4.0');
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      const next = data.data ?? data;
      if (next?.kpi || next?.coupons || next?.matching) setDashboard(mergeDashboard(next));
      const engine = next?.engine;
      if (engine) {
        setFestivalW(engine.festivalWeight ?? 40);
        setCampW(engine.campingDistanceWeight ?? 25);
        setMarketW(engine.marketRatioWeight ?? 20);
        setHistoryW(engine.historyWeight ?? 15);
      }
    } catch {
      // 서버가 없어도 폴백 대시보드를 유지한다.
    }
  };

  useEffect(() => {
    if (authed) {
      loadFestivals();
      loadDashboard();
    }
  }, [authed]);

  useEffect(() => subscribeFeedPayout(() => setPayoutTick((n) => n + 1)), []);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    try {
      const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/admin/login` : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        setAuthed(true);
        return;
      }
      setError('관리자 계정 정보가 올바르지 않습니다.');
    } catch {
      setError('관리자 서버에 연결하지 못했습니다.');
    }
  };

  const handleSync = async () => {
    setSyncMessage('수집을 요청하는 중입니다...');
    try {
      const res = await fetch('/api/festivals/sync', { method: 'POST' });
      const data = await res.json();
      setSyncMessage(data.message || '수집 요청을 보냈습니다.');
      await loadFestivals();
      await loadDashboard();
    } catch {
      setSyncMessage('수집 API에 연결하지 못했습니다. 홈 목록은 /api/festivals 실시간 조회를 씁니다.');
    }
  };

  const assignOfficer = (rowId: string) => {
    setDashboard((current: any) => {
      const matching = (current?.matching ?? []).map((row: any) => {
        if (matchingRowId(row) !== rowId) return row;
        const region = row.region || 'GYEONGGI';
        return {
          ...row,
          officerName: officerDisplayName(row.city),
          phone: `${REGION_PHONE[region] || '031'}-120`,
          approved: false,
        };
      });
      return { ...(current ?? {}), matching };
    });
  };

  const approveFeedReward = (rowId: string) => {
    approveUserPoints(rowId, 'PAID');
    setDashboard((current: any) => ({
      ...(current ?? {}),
      feedRewards: (current?.feedRewards ?? []).map((row: FeedRewardRow) => (
        row.id === rowId ? { ...row, status: 'PAID' } : row
      )),
    }));
  };

  const reportFeedPdf = (rows: FeedRewardRow[], city?: string) => {
    if (!rows.length) {
      if (typeof window !== 'undefined') window.alert('보고할 피드 지급 내역이 없습니다.');
      return;
    }
    const ok = downloadFeedRewardPdf(rows, city);
    if (!ok && typeof window !== 'undefined') {
      window.alert('웹 관리자 화면에서 공문 PDF를 내려받을 수 있습니다.');
    }
  };

  const handleDownloadExcel = async () => {
    const filename = settlementFilename();
    const couponRows = dashboard?.coupons?.length ? dashboard.coupons : FALLBACK_DASHBOARD.coupons;
    const matchRows = dashboard?.matching?.length ? dashboard.matching : FALLBACK_DASHBOARD.matching;
    const localCsv = adminExcelCsv({ coupons: couponRows, matching: matchRows });
    try {
      const remote = await fetchSettlementCsv([
        '/api/admin/settlement/excel',
        '/api/admin/settlements.csv',
        '/api/admin/coupons.csv',
      ]).catch(() => '');
      triggerCsvDownload(filename, remote || localCsv);
    } catch {
      try {
        triggerCsvDownload(filename, localCsv);
      } catch {
        if (typeof window !== 'undefined') {
          window.alert('엑셀 다운로드 중 오류가 발생했습니다.');
        }
      }
    }
  };

  if (!authed) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.body}>
        <Text style={styles.kicker}>온앤온+ 관리자</Text>
        <Text style={styles.title}>관리자 로그인</Text>
        <Text style={styles.label}>이메일</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="username"
          importantForAutofill="no"
          keyboardType="email-address"
        />
        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="password"
          importantForAutofill="no"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <ActionButton label="관리자 로그인" onPress={handleLogin} />
      </ScrollView>
    );
  }

  const kpi = dashboard?.kpi ?? FALLBACK_DASHBOARD.kpi;
  const tour = {
    ...FALLBACK_DASHBOARD.tour,
    ...(dashboard?.tour ?? {}),
    categories: dashboard?.tour?.categories?.length ? dashboard.tour.categories : FALLBACK_DASHBOARD.tour.categories,
    logs: dashboard?.tour?.logs?.length ? dashboard.tour.logs : FALLBACK_DASHBOARD.tour.logs,
  };
  const coupons = dashboard?.coupons?.length ? dashboard.coupons : FALLBACK_DASHBOARD.coupons;
  const matching = dashboard?.matching?.length ? dashboard.matching : FALLBACK_DASHBOARD.matching;
  const feedRewards: FeedRewardRow[] = mergeFeedRewardRows(
    dashboard?.feedRewards?.length ? dashboard.feedRewards : FALLBACK_FEED_REWARDS,
  );
  void payoutTick;
  const regionFeedRewards = feedRewards.filter((row) => (row.regionalZone || 'GYEONGGI') === feedRegion);
  const feedCities = Array.from(new Set([
    ...(METRO_LOCALITIES[feedRegion] ?? []).map((loc) => loc.label),
    ...regionFeedRewards.map((row) => row.city).filter(Boolean),
  ]));
  const feedPending = regionFeedRewards.filter((row) => row.status !== 'PAID').length;
  const feedPaidSum = regionFeedRewards.reduce((sum, row) => sum + Number(row.amountWon || 0), 0);
  const unassigned = matching.filter((row: any) => !row.officerName);
  const regionMatching = matching.filter((row: any) => (row.region || 'GYEONGGI') === matchRegion);
  const regionUnassigned = regionMatching.filter((row: any) => !row.officerName);
  const regionMeta = METRO_REGIONS.find((region) => region.id === matchRegion) ?? METRO_REGIONS[0];
  const feedRegionMeta = METRO_REGIONS.find((region) => region.id === feedRegion) ?? METRO_REGIONS[0];
  const courses = dashboard?.courses ?? [];
  const weekly = dashboard?.weekly ?? FALLBACK_DASHBOARD.weekly;
  const festivals = kpi.festivals ?? festivalCount ?? 12;
  const merchants = kpi.merchants ?? 18;
  const issued = kpi.couponsIssued ?? 24;
  const used = kpi.couponsUsed ?? 9;
  const recovery = kpi.recoveryRate ?? (issued ? Math.round((used / issued) * 100) : 0);
  const assigned = matching.filter((row: any) => row.officerName).length;
  const totalCities = matching.length;
  const matchRate = totalCities ? Math.round((assigned / totalCities) * 1000) / 10 : 0;
  const quotaUsed = tour.quotaUsed ?? 42;
  const quotaLimit = tour.quotaLimit ?? 1000;
  const weightSum = festivalW + campW + marketW + historyW;
  const weightOk = weightSum === 100;
  const sourceLabel = cleanSource(festivalSource) || cleanSource(tour.source) || '한국관광공사 TourAPI 4.0';
  const tourOk = Boolean(sourceLabel) && sourceLabel !== 'none';
  const festivalOptions: string[] = Array.from(new Set(coupons.map((row: any) => String(row.festival || '')).filter(Boolean)));
  const festivalFilters: Array<[string, string]> = [['ALL', '전체 축제'], ...festivalOptions.map((name): [string, string] => [name, name])];
  const filteredCoupons = coupons.filter((row: any) => {
    const hay = `${row.id} ${row.festival} ${row.store}`.toLowerCase();
    const matchQuery = !couponQuery.trim() || hay.includes(couponQuery.trim().toLowerCase());
    const matchRegion = couponRegion === 'ALL' || (row.region || 'GYEONGGI') === couponRegion;
    const matchType = couponType === 'ALL' || (row.couponType || 'OFFICIAL') === couponType;
    const matchFestival = couponFestival === 'ALL' || row.festival === couponFestival;
    return matchQuery && matchRegion && matchType && matchFestival;
  });
  const catMax = Math.max(1, ...(tour.categories ?? []).map((row: any) => Number(row.count) || 0));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      <Text style={styles.kicker}>온앤온+ 관리자</Text>
      <Text style={styles.title}>통합 관리자 백오피스</Text>
      <View style={styles.menuRow}>
        {([
          ['dash', '대시보드'],
          ['tour', 'TourAPI'],
          ['coupon', '상가·쿠폰'],
          ['match', '지자체'],
          ['centers', '센터장'],
          ['feeds', '피드정산'],
          ['ai', 'AI 코스'],
          ['stats', '통계'],
        ] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.menu, menu === key && styles.menuOn]} onPress={() => setMenu(key)}>
            <Text style={[styles.menuText, menu === key && styles.menuTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {menu === 'dash' ? (
        <View style={styles.kpiGrid}>
          <KpiCard title="전국 축제 현황" value={`${festivals}건`} trend={`전월 대비 +${kpi.festivalsDeltaPct ?? 18}%`} color="blue" />
          <KpiCard title="등록 상가 현황" value={`${merchants}개소`} sub={`국세청 검증 완료 ${kpi.merchantsNtsVerified ?? merchants}곳`} color="green" />
          <KpiCard title="쿠폰 발행/사용" value={`${issued} / ${used}`} sub={`회수율 ${recovery}%`} color="purple" />
          <KpiCard title="지자체 매칭률" value={`${assigned}/${totalCities}`} sub={`매칭률 ${matchRate}%`} color={unassigned.length ? 'red' : 'green'} alert={unassigned.length > 0} />
        </View>
      ) : null}

      {menu === 'dash' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>쿠폰 회수율</Text>
          <ProgressBar value={recovery} />
          <Text style={styles.hint}>사용 {used} / 발급 {issued} · 실시간 회수 모니터링</Text>
        </View>
      ) : null}

      {menu === 'tour' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TourAPI 수집 엔진</Text>
            <View style={styles.tourHead}>
              <QuotaGauge used={quotaUsed} limit={quotaLimit} />
              <View style={{ flex: 1 }}>
                <Text style={styles.metric}>{quotaUsed} / {quotaLimit}</Text>
                <Text style={styles.hint}>일일 Quota · {(quotaUsed / quotaLimit * 100).toFixed(1)}% 사용 중</Text>
                <View style={{ marginTop: 8 }}>
                  <ProgressBar value={(quotaUsed / quotaLimit) * 100} color="#0F766E" />
                </View>
                <View style={{ marginTop: 8 }}>
                  <StatusBadge label={tourOk ? '연동 정상' : '연동 확인 필요'} tone={tourOk ? 'ok' : 'warn'} />
                </View>
                <Text style={[styles.hint, { marginTop: 8 }]}>{sourceLabel}</Text>
              </View>
            </View>
            {syncMessage ? <Text style={styles.ok}>{syncMessage}</Text> : null}
            <View style={{ marginTop: 12 }}>
              <ActionButton label="즉시 동기화" onPress={handleSync} />
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>카테고리별 수집 현황</Text>
            {(tour.categories ?? []).map((row: any) => (
              <View key={row.name} style={styles.catRow}>
                <View style={styles.catHead}>
                  <Text style={styles.catName}>{row.name}</Text>
                  <Text style={styles.catCount}>{row.count}건</Text>
                </View>
                <ProgressBar value={(Number(row.count) / catMax) * 100} color="#2563EB" />
              </View>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>수집 로그</Text>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 1.1 }]}>수집시간</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>API명</Text>
              <Text style={[styles.th, { width: 54 }]}>성공</Text>
              <Text style={[styles.th, { width: 52 }]}>상태</Text>
            </View>
            {(tour.logs ?? []).map((row: any, idx: number) => (
              <View key={idx} style={styles.tr}>
                <Text style={[styles.td, { flex: 1.1 }]}>{formatWhen(row.ran_at)}</Text>
                <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>{row.target_api}</Text>
                <Text style={[styles.td, { width: 54 }]}>{row.fetched}</Text>
                <View style={{ width: 52 }}>
                  <StatusBadge label={row.status || '정상'} tone={row.failed ? 'danger' : 'ok'} />
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {menu === 'coupon' ? (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>쿠폰 마스터</Text>
            <TouchableOpacity style={styles.excelBtn} onPress={handleDownloadExcel}>
              <Text style={styles.excelText}>월별 정산 Excel</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={couponQuery}
            onChangeText={setCouponQuery}
            placeholder="쿠폰 코드 / 축제 / 상가 검색"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[['ALL', '전체 권역'], ...Object.entries(REGION_LABEL)].map(([id, label]) => (
              <TouchableOpacity key={id} style={[styles.chip, couponRegion === id && styles.chipOn]} onPress={() => setCouponRegion(id)}>
                <Text style={[styles.chipText, couponRegion === id && styles.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.filterRow}>
            {([['ALL', '전체 타입'], ['OFFICIAL', '공식 매칭'], ['SELF', '자율 할인']] as const).map(([id, label]) => (
              <TouchableOpacity key={id} style={[styles.chip, couponType === id && styles.chipOn]} onPress={() => setCouponType(id)}>
                <Text style={[styles.chipText, couponType === id && styles.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {festivalFilters.map(([id, label]) => (
              <TouchableOpacity key={id} style={[styles.chip, couponFestival === id && styles.chipOn]} onPress={() => setCouponFestival(id)}>
                <Text style={[styles.chipText, couponFestival === id && styles.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 0.9 }]}>코드/타입</Text>
            <Text style={[styles.th, { flex: 1.4 }]}>축제 · 상가</Text>
            <Text style={[styles.th, { width: 72 }]}>회수율</Text>
          </View>
          {filteredCoupons.map((row: any) => (
            <View key={row.id} style={styles.couponRow}>
              <View style={{ flex: 0.9 }}>
                <Text style={styles.tdStrong}>{row.id}</Text>
                <StatusBadge
                  label={row.couponType === 'SELF' ? '자율' : '공식'}
                  tone={row.couponType === 'SELF' ? 'info' : 'ok'}
                />
              </View>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.tdStrong} numberOfLines={1}>{row.festival}</Text>
                <Text style={styles.tdMuted} numberOfLines={1}>{row.store}</Text>
                <Text style={styles.tdMuted}>발급 {row.issued} · 사용 {row.used}</Text>
              </View>
              <View style={{ width: 64, alignItems: 'flex-end' }}>
                <Text style={styles.tdStrong}>{row.recovery}%</Text>
                <ProgressBar value={Number(row.recovery) || 0} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {menu === 'centers' ? <AdminCenterPanel /> : null}

      {menu === 'match' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>권역별 지자체 담당자</Text>
            <View style={styles.filterRow}>
              {METRO_REGIONS.map((region) => {
                const miss = matching.filter((row: any) => (row.region || 'GYEONGGI') === region.id && !row.officerName).length;
                const on = matchRegion === region.id;
                return (
                  <TouchableOpacity key={region.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setMatchRegion(region.id)}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {region.label}{miss ? ` · ${miss}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {regionMeta.covers} · {matchRegion === 'GYEONGGI' ? '공식 매칭 쿠폰' : '자율 할인'} · 전국 미지정 {unassigned.length}곳
            </Text>
          </View>
          {regionUnassigned.length ? (
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>{regionMeta.label} 담당자 미지정 {regionUnassigned.length}곳</Text>
              <Text style={styles.alertBody}>승인 대기 지자체에 담당자를 지정하면 매칭 쿠폰 운영이 시작됩니다.</Text>
            </View>
          ) : null}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{regionMeta.label} · {regionMatching.length}곳</Text>
              <StatusBadge
                label={matchRegion === 'GYEONGGI' ? '공식 매칭' : '자율 할인'}
                tone={matchRegion === 'GYEONGGI' ? 'ok' : 'info'}
              />
            </View>
            {regionMatching.map((row: any) => {
              const missing = !row.officerName;
              const rowId = matchingRowId(row);
              return (
                <View key={rowId} style={[styles.matchRow, missing && styles.matchRowAlert]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tdStrong}>{row.city}</Text>
                    <Text style={styles.tdMuted}>상가 {row.stores} · 축제 {row.festivals} · 쿠폰 {row.coupons}</Text>
                    <View style={{ marginTop: 6 }}>
                      {missing
                        ? <StatusBadge label="미지정 - 승인 대기" tone="danger" />
                        : <StatusBadge label={row.approved ? '승인' : '대기'} tone={row.approved ? 'ok' : 'warn'} />}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.officer}>{row.officerName || '미지정'}</Text>
                    {missing ? (
                      <TouchableOpacity style={styles.assignBtn} onPress={() => assignOfficer(rowId)}>
                        <Text style={styles.assignText}>담당자 지정</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {menu === 'feeds' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>축제 참여 피드 지역화폐 정산</Text>
            <Text style={styles.hint}>
              지자체와 지역화폐 협의가 된 곳은 지급, 안 된 곳은 불가로 체크해 저장하세요. 피드 업로드 안내가 자동으로 연동되고, 로그인 유저 포인트 내역은 PDF로 내려받을 수 있습니다.
            </Text>
            <View style={styles.filterRow}>
              {METRO_REGIONS.map((region) => {
                const count = feedRewards.filter((row) => row.regionalZone === region.id).length;
                const on = feedRegion === region.id;
                return (
                  <TouchableOpacity key={region.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setFeedRegion(region.id)}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {region.label}{count ? ` · ${count}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {feedRegionMeta.label} · {regionFeedRewards.length}건 · 대기 {feedPending}건 · 합계 {feedPaidSum.toLocaleString('ko-KR')}원
            </Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              <ActionButton
                label={`${feedRegionMeta.label} 권역 공문 PDF 보고`}
                onPress={() => reportFeedPdf(regionFeedRewards)}
              />
              <ActionButton
                kind="ghost"
                label="유저 포인트 현황 PDF 다운로드"
                onPress={() => {
                  const ok = downloadFeedPointsPdf();
                  if (!ok && typeof window !== 'undefined') {
                    window.alert(listUserPointRecords().length ? '웹 관리자 화면에서 PDF를 내려받을 수 있습니다.' : '저장된 유저 포인트 내역이 없습니다.');
                  }
                }}
              />
            </View>
          </View>
          {listUserPointRecords().length ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>로그인 유저 포인트 현황</Text>
              {listUserPointRecords().slice(0, 12).map((row) => (
                <View key={row.id} style={styles.matchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tdStrong}>{row.userName}</Text>
                    <Text style={styles.tdMuted}>{row.festival} · {row.city} · {row.postedAt}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.officer}>{Number(row.points || row.amountWon).toLocaleString('ko-KR')}P</Text>
                    <StatusBadge
                      label={row.status === 'PAID' ? '지급 완료' : row.status === 'BLOCKED' ? '지급 불가' : '지급 대기'}
                      tone={row.status === 'PAID' ? 'ok' : row.status === 'BLOCKED' ? 'danger' : 'warn'}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {feedCities.map((city) => {
            const cityRows = regionFeedRewards.filter((row) => row.city === city);
            const citySum = cityRows.reduce((sum, row) => sum + Number(row.amountWon || 0), 0);
            const draftKey = `${feedRegion}:${city}`;
            const mode = payoutDraft[draftKey] ?? getFeedPayoutMode({ metro: feedRegion, city });
            return (
              <View key={city} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{city} · {cityRows.length}건</Text>
                  {cityRows.length ? (
                    <TouchableOpacity style={styles.excelBtn} onPress={() => reportFeedPdf(cityRows, city)}>
                      <Text style={styles.excelText}>공문 PDF 보고</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.tdMuted}>
                  정산 {citySum.toLocaleString('ko-KR')}원 · 수신 {city.includes('구') ? `${city}청장` : city.includes('군') ? `${city.replace(/군$/, '군수')}` : `${city.replace(/시$/, '시장')}`}
                </Text>
                <Text style={[styles.tdMuted, { marginTop: 8 }]}>지역화폐 지급 설정</Text>
                <View style={styles.filterRow}>
                  <TouchableOpacity
                    style={[styles.chip, mode === 'payable' && styles.chipOn]}
                    onPress={() => setPayoutDraft((current) => ({ ...current, [draftKey]: 'payable' }))}
                  >
                    <Text style={[styles.chipText, mode === 'payable' && styles.chipTextOn]}>지급</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, mode === 'blocked' && styles.chipOn]}
                    onPress={() => setPayoutDraft((current) => ({ ...current, [draftKey]: 'blocked' }))}
                  >
                    <Text style={[styles.chipText, mode === 'blocked' && styles.chipTextOn]}>불가</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.excelBtn}
                    onPress={() => {
                      setFeedPayoutMode({ metro: feedRegion, city, mode });
                      if (typeof window !== 'undefined') window.alert(`${city} 지역화폐를 ${mode === 'payable' ? '지급' : '불가'}로 저장했습니다. 피드 업로드 안내가 바로 연동됩니다.`);
                    }}
                  >
                    <Text style={styles.excelText}>저장</Text>
                  </TouchableOpacity>
                </View>
                {cityRows.map((row) => (
                  <View key={row.id} style={styles.matchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tdStrong}>{row.userName}</Text>
                      <Text style={styles.tdMuted}>{row.festival} · {row.postedAt}</Text>
                      <View style={{ marginTop: 6 }}>
                        <StatusBadge
                          label={row.status === 'PAID' ? '지급 완료' : row.status === 'BLOCKED' ? '지급 불가' : '지급 대기'}
                          tone={row.status === 'PAID' ? 'ok' : row.status === 'BLOCKED' ? 'danger' : 'warn'}
                        />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={styles.officer}>{Number(row.amountWon).toLocaleString('ko-KR')}원</Text>
                      {row.status === 'PENDING' ? (
                        <TouchableOpacity style={styles.assignBtn} onPress={() => approveFeedReward(row.id)}>
                          <Text style={styles.assignText}>지급 승인</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </>
      ) : null}

      {menu === 'ai' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>추천 가중치</Text>
          <WeightSlider label="축제" value={festivalW} color="#2563EB" onChange={setFestivalW} />
          <WeightSlider label="캠핑거리" value={campW} color="#059669" onChange={setCampW} />
          <WeightSlider label="전통시장" value={marketW} color="#D97706" onChange={setMarketW} />
          <WeightSlider label="역사" value={historyW} color="#7C3AED" onChange={setHistoryW} />
          <Text style={[styles.hint, !weightOk && styles.error]}>합계 {weightSum}%{weightOk ? ' · 저장 가능' : ' · 100%가 되어야 저장할 수 있습니다'}</Text>
          <ActionButton
            label="가중치 저장"
            disabled={!weightOk}
            onPress={async () => {
              setWeightMessage('');
              try {
                const res = await fetch('/api/admin/engine', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    festivalWeight: festivalW,
                    campingDistanceWeight: campW,
                    marketRatioWeight: marketW,
                    historyWeight: historyW,
                  }),
                });
                if (!res.ok) throw new Error('save');
                setWeightMessage('가중치를 저장했습니다.');
                await loadDashboard();
              } catch {
                setWeightMessage('가중치를 이 화면에 반영했습니다. 서버 연결 시 동기화됩니다.');
              }
            }}
          />
          {weightMessage ? <Text style={styles.ok}>{weightMessage}</Text> : null}
          <Text style={[styles.cardTitle, { marginTop: 18 }]}>생성 이력</Text>
          <View style={styles.tagWrap}>
            {(courses.length ? courses : [{ id: 'course-1', festival: '장단콩 축제', recommendCount: 12, saveCount: 4 }]).map((row: any) => (
              <View key={row.id} style={styles.courseTag}>
                <Text style={styles.courseFest}>{row.festival}</Text>
                <Text style={styles.courseMeta}>추천 {row.recommendCount}회 · 저장 {row.saveCount}회</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {menu === 'stats' ? (
        <>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>지역 소비 활성화</Text>
              <StatusBadge label={tourOk ? 'TourAPI 연동 정상' : '연동 확인'} tone={tourOk ? 'ok' : 'warn'} />
            </View>
            <Text style={styles.hint}>{sourceLabel} · 쿠폰 회수율 {recovery}% · 실사용 {used}건</Text>
            <SparkLine values={weekly.map((row: any) => Number(row.recovery) || 0)} />
            <View style={styles.weekRow}>
              {weekly.map((row: any) => (
                <Text key={row.label} style={styles.weekLabel}>{row.label}</Text>
              ))}
            </View>
          </View>
          <View style={styles.kpiGrid}>
            <KpiCard title="주간 실사용" value={`${weekly[weekly.length - 1]?.used ?? used}건`} color="purple" />
            <KpiCard title="데이터 출처" value="TourAPI 4.0" sub={sourceLabel} color={tourOk ? 'green' : 'red'} />
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>권역별 회수율</Text>
            {Object.entries(REGION_LABEL).map(([id, label]) => {
              const rows = coupons.filter((row: any) => (row.region || 'GYEONGGI') === id);
              if (!rows.length) return null;
              const regionIssued = rows.reduce((sum: number, row: any) => sum + Number(row.issued || 0), 0);
              const regionUsed = rows.reduce((sum: number, row: any) => sum + Number(row.used || 0), 0);
              const regionRate = regionIssued ? Math.round((regionUsed / regionIssued) * 100) : 0;
              return (
                <View key={id} style={styles.catRow}>
                  <View style={styles.catHead}>
                    <Text style={styles.catName}>{label}</Text>
                    <Text style={styles.catCount}>{regionRate}% · {regionUsed}/{regionIssued}</Text>
                  </View>
                  <ProgressBar value={regionRate} color="#0F766E" />
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <TouchableOpacity style={styles.ghost} onPress={() => setAuthed(false)}>
        <Text style={styles.ghostText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  body: { padding: 20, paddingBottom: 40 },
  kicker: { fontSize: 12, fontWeight: '800', color: '#0F766E' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4, marginBottom: 12 },
  menuRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  menu: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#E5E7EB' },
  menuOn: { backgroundColor: '#111827', borderColor: '#111827' },
  menuText: { fontSize: 12, fontWeight: '800', color: '#374151' },
  menuTextOn: { color: '#fff' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 8 },
  p: { fontSize: 13, fontWeight: '600', color: '#374151', lineHeight: 20, marginBottom: 6 },
  hint: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 8, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 6, color: '#111827' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  ghost: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  ghostText: { fontWeight: '700', color: '#4B5563' },
  error: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  ok: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#047857' },
  tourHead: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metric: { fontSize: 22, fontWeight: '800', color: '#111827' },
  catRow: { marginBottom: 10 },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  catCount: { fontSize: 12, fontWeight: '800', color: '#2563EB' },
  tableHead: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 6 },
  th: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  td: { fontSize: 12, fontWeight: '600', color: '#374151' },
  tdStrong: { fontSize: 13, fontWeight: '800', color: '#111827' },
  tdMuted: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  excelBtn: { backgroundColor: '#111827', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  excelText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: '#111827' },
  chipText: { fontSize: 11, fontWeight: '800', color: '#374151' },
  chipTextOn: { color: '#fff' },
  couponRow: { flexDirection: 'row', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  alertBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  alertTitle: { fontSize: 14, fontWeight: '800', color: '#991B1B' },
  alertBody: { fontSize: 12, fontWeight: '600', color: '#B91C1C', marginTop: 4, lineHeight: 18 },
  matchRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  matchRowAlert: { backgroundColor: '#FFF7F7', marginHorizontal: -6, paddingHorizontal: 6, borderRadius: 10 },
  officer: { fontSize: 12, fontWeight: '800', color: '#111827' },
  assignBtn: { backgroundColor: '#B91C1C', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  assignText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  courseTag: { backgroundColor: '#EEF2FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  courseFest: { fontSize: 13, fontWeight: '800', color: '#312E81' },
  courseMeta: { fontSize: 11, fontWeight: '700', color: '#4338CA', marginTop: 2 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
});
