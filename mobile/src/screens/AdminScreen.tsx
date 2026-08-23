import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ADMIN_EMAIL = 'admin@gyeonggi-on.kr';
const ADMIN_PASSWORD = 'admin1234';

export default function AdminScreen() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [festivalCount, setFestivalCount] = useState<number | null>(null);
  const [festivalSource, setFestivalSource] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

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

  useEffect(() => {
    if (authed) loadFestivals();
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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      <Text style={styles.kicker}>온앤온 관리자</Text>
      <Text style={styles.title}>한국관광공사 API 수집</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>데이터 수집 프로세스</Text>
        <Text style={styles.p}>1. 서비스 키(TOUR_API_SERVICE_KEY 또는 NTS_SERVICE_KEY)로 한국관광공사 TourAPI 4.0에 접속합니다.</Text>
        <Text style={styles.p}>2. KorService2 / searchFestival2 를 호출합니다. areaCode=31(경기), MobileOS=ETC, MobileApp=kdanji, 오늘 이후 행사만 가져옵니다.</Text>
        <Text style={styles.p}>3. 구 KorService1 / searchFestival1 은 폐기되어 결과가 없으면 쓰지 않습니다. 운영 API는 2.0 경로를 먼저 시도한 뒤 필요 시 보완합니다.</Text>
        <Text style={styles.p}>4. 매일 03:00 Vercel Cron이 /api/cron/festivals 를 호출해 동기화합니다. 관리자는 아래 버튼으로 즉시 수집을 요청할 수 있습니다.</Text>
        <Text style={styles.p}>5. 응답의 contentid, title, 주소, 좌표, 기간, 이미지를 홈 축제 카드로 바꿉니다. 12시간 캐시로 트래픽을 줄입니다.</Text>
        <Text style={styles.p}>6. TourAPI에 없는 지자체 자체 행사는 관리자가 수동 등록하면 앱 홈·상세에 바로 붙습니다.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>현재 수집 상태</Text>
        <Text style={styles.p}>
          경기 축제 {festivalCount == null ? '확인 중' : `${festivalCount}건`}
          {festivalSource ? ` · 출처 ${festivalSource}` : ''}
        </Text>
        {syncMessage ? <Text style={styles.ok}>{syncMessage}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={handleSync}>
          <Text style={styles.btnText}>TourAPI 지금 수집</Text>
        </TouchableOpacity>
      </View>
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
  },
  btn: { marginTop: 14, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  ghost: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  ghostText: { fontWeight: '700', color: '#4B5563' },
  error: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  ok: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#047857' },
});
