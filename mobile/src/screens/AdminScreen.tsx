import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ADMIN_EMAIL = 'admin@gyeonggi-on.kr';
const ADMIN_PASSWORD = 'admin1234';

type Menu = 'dash' | 'tour' | 'coupon' | 'match' | 'ai' | 'stats';

export default function AdminScreen() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<Menu>('dash');
  const [festivalCount, setFestivalCount] = useState<number | null>(null);
  const [festivalSource, setFestivalSource] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [dashboard, setDashboard] = useState<any>(null);
  const [festivalW, setFestivalW] = useState(40);
  const [campW, setCampW] = useState(25);
  const [marketW, setMarketW] = useState(20);
  const [historyW, setHistoryW] = useState(15);

  const loadFestivals = async () => {
    try {
      const res = await fetch('/api/festivals');
      const data = await res.json();
      setFestivalCount(Number(data.count ?? data.festivals?.length ?? 0));
      setFestivalSource(String(data.source ?? ''));
    } catch {
      setFestivalCount(null);
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      setDashboard(data.data);
      if (data.data?.engine) {
        setFestivalW(data.data.engine.festivalWeight ?? 40);
        setCampW(data.data.engine.campingDistanceWeight ?? 25);
        setMarketW(data.data.engine.marketRatioWeight ?? 20);
        setHistoryW(data.data.engine.historyWeight ?? 15);
      }
    } catch {
      setDashboard(null);
    }
  };

  useEffect(() => {
    if (authed) {
      loadFestivals();
      loadDashboard();
    }
  }, [authed]);

  const handleLogin = async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        setAuthed(true);
        return;
      }
    } catch {
      // 서버 미연결 시 기본 계정으로 안내 화면만 연다
    }
    if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setAuthed(true);
      return;
    }
    setError('관리자 계정 정보가 올바르지 않습니다.');
  };

  const handleSync = async () => {
    setSyncMessage('수집을 요청하는 중입니다...');
    try {
      const res = await fetch('/api/festivals/sync', { method: 'POST' });
      const data = await res.json();
      setSyncMessage(data.message || '수집 요청을 보냈습니다.');
      await loadFestivals();
    } catch {
      setSyncMessage('수집 API에 연결하지 못했습니다. 홈 목록은 /api/festivals 실시간 조회를 씁니다.');
    }
  };

  if (!authed) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.body}>
        <Text style={styles.kicker}>온앤온 관리자</Text>
        <Text style={styles.title}>관리자 페이지 접속</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>접속 방법</Text>
          <Text style={styles.p}>1. 주소창에 https://www.kdanji.com/admin 을 입력합니다.</Text>
          <Text style={styles.p}>2. 마이페이지 맨 아래 「관리자 페이지」를 눌러도 같습니다.</Text>
          <Text style={styles.p}>3. 기본 계정은 {ADMIN_EMAIL} / {ADMIN_PASSWORD} 입니다.</Text>
          <Text style={styles.p}>4. 로컬에서 Vite 관리자를 쓸 때는 admin 폴더에서 npm run dev 후 http://localhost:5173/admin/login 입니다.</Text>
        </View>
        <Text style={styles.label}>이메일</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
        <Text style={styles.label}>비밀번호</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={handleLogin}>
          <Text style={styles.btnText}>관리자 로그인</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const kpi = dashboard?.kpi ?? {};
  const tour = dashboard?.tour ?? {};
  const coupons = dashboard?.coupons ?? [];
  const matching = dashboard?.matching ?? [];
  const unassigned = matching.filter((row: any) => !row.officerName);
  const courses = dashboard?.courses ?? [];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      <Text style={styles.kicker}>온앤온 관리자</Text>
      <Text style={styles.title}>통합 관리자 백오피스</Text>
      <View style={styles.menuRow}>
        {([
          ['dash', '대시보드'],
          ['tour', 'TourAPI'],
          ['coupon', '상가·쿠폰'],
          ['match', '지자체'],
          ['ai', 'AI 코스'],
          ['stats', '통계'],
        ] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.menu, menu === key && styles.menuOn]} onPress={() => setMenu(key)}>
            <Text style={[styles.menuText, menu === key && styles.menuTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {menu === 'dash' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>핵심 KPI</Text>
          <Text style={styles.p}>축제 {kpi.festivals ?? festivalCount ?? '-'} · 상가 {kpi.merchants ?? '-'}</Text>
          <Text style={styles.p}>쿠폰 발행 {kpi.couponsIssued ?? 0} · 사용 {kpi.couponsUsed ?? 0} · 회수율 {kpi.recoveryRate ?? 0}%</Text>
        </View>
      ) : null}

      {menu === 'tour' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TourAPI 수집 엔진</Text>
            <Text style={styles.p}>일일 Quota {tour.quotaUsed ?? 0} / {tour.quotaLimit ?? 1000}</Text>
            <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.min(100, ((tour.quotaUsed ?? 0) / (tour.quotaLimit ?? 1000)) * 100)}%` }]} /></View>
            {(tour.categories ?? []).map((row: any) => (
              <Text key={row.name} style={styles.p}>{row.name} {row.count}건</Text>
            ))}
            <Text style={styles.p}>경기 축제 {festivalCount == null ? '확인 중' : `${festivalCount}건`}{festivalSource ? ` · ${festivalSource}` : ''}</Text>
            {syncMessage ? <Text style={styles.ok}>{syncMessage}</Text> : null}
            <TouchableOpacity style={styles.btn} onPress={handleSync}>
              <Text style={styles.btnText}>즉시 동기화</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>수집 로그</Text>
            {(tour.logs ?? []).map((row: any, idx: number) => (
              <Text key={idx} style={styles.p}>{row.ran_at} · {row.target_api} · 수집 {row.fetched} · 실패 {row.failed} · {row.status}</Text>
            ))}
          </View>
        </>
      ) : null}

      {menu === 'coupon' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>쿠폰 마스터</Text>
          {coupons.map((row: any) => (
            <Text key={row.id} style={styles.p}>
              {row.id} · {row.festival} / {row.store} · 발급 {row.issued} 사용 {row.used} 회수율 {row.recovery}%
            </Text>
          ))}
          <TouchableOpacity
            style={styles.btn}
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.location.href = '/api/admin/settlements.csv';
              }
            }}
          >
            <Text style={styles.btnText}>월별 정산 Excel 내려받기</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {menu === 'match' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>경기도 31개 시·군 매칭</Text>
          {unassigned.length ? <Text style={styles.error}>담당자 미지정 {unassigned.length}곳</Text> : null}
          {matching.map((row: any) => (
            <Text key={row.city} style={styles.p}>
              {row.city} · {row.officerName || '미지정'} · 상가 {row.stores} · 축제 {row.festivals} · 쿠폰 {row.coupons} · {row.approved ? '승인' : '대기'}
            </Text>
          ))}
        </View>
      ) : null}

      {menu === 'ai' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>추천 가중치</Text>
          <Text style={styles.p}>축제 {festivalW} / 캠핑거리 {campW} / 전통시장 {marketW} / 역사 {historyW}</Text>
          <TextInput style={styles.input} value={String(festivalW)} onChangeText={(v) => setFestivalW(Number(v) || 0)} />
          <TextInput style={styles.input} value={String(campW)} onChangeText={(v) => setCampW(Number(v) || 0)} />
          <TextInput style={styles.input} value={String(marketW)} onChangeText={(v) => setMarketW(Number(v) || 0)} />
          <TextInput style={styles.input} value={String(historyW)} onChangeText={(v) => setHistoryW(Number(v) || 0)} />
          <TouchableOpacity
            style={styles.btn}
            onPress={async () => {
              await fetch('/api/admin/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  festivalWeight: festivalW,
                  campingDistanceWeight: campW,
                  marketRatioWeight: marketW,
                  historyWeight: historyW,
                }),
              });
              await loadDashboard();
            }}
          >
            <Text style={styles.btnText}>가중치 저장</Text>
          </TouchableOpacity>
          {courses.map((row: any) => (
            <Text key={row.id} style={styles.p}>{row.festival} · 추천 {row.recommendCount} · 저장 {row.saveCount}</Text>
          ))}
        </View>
      ) : null}

      {menu === 'stats' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>지역 소비 활성화</Text>
          <Text style={styles.p}>쿠폰 회수율 {kpi.recoveryRate ?? 0}% · 사용 {kpi.couponsUsed ?? 0}건</Text>
          <Text style={styles.p}>TourAPI 출처 {festivalSource || '실시간 조회'}</Text>
        </View>
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
  btn: { marginTop: 14, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  ghost: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  ghostText: { fontWeight: '700', color: '#4B5563' },
  error: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  ok: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#047857' },
  bar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: 8, backgroundColor: '#0F766E' },
});
