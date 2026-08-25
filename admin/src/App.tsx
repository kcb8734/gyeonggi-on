import React, { useEffect, useMemo, useState } from 'react';
import {
  adminLogin,
  approveMerchant,
  deleteAdminFestival,
  fetchAdminFestivals,
  fetchBudget,
  fetchDashboard,
  fetchMerchants,
  fetchStats,
  logout,
  saveAdminFestival,
} from './api';

type View = 'login' | 'dashboard';

export default function App() {
  const path = window.location.pathname;
  const [view, setView] = useState<View>(
    localStorage.getItem('admin_token') ? 'dashboard' : 'login',
  );
  const [email, setEmail] = useState('admin@gyeonggi-on.kr');
  const [password, setPassword] = useState('admin1234');
  const [error, setError] = useState('');
  const [merchants, setMerchants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [budget, setBudget] = useState<any[]>([]);
  const [manualFestivals, setManualFestivals] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [matchRegion, setMatchRegion] = useState('GYEONGGI');
  const [festivalForm, setFestivalForm] = useState({
    title: '',
    address: '',
    tel: '',
    overview: '',
    fee: '',
    eventStartDate: '',
    eventEndDate: '',
    firstImage: '',
    category: '먹거리',
    municipality: '수원시',
    mapX: '127.013',
    mapY: '37.287',
  });

  useEffect(() => {
    if (path === '/admin/login' && view !== 'login') {
      history.replaceState(null, '', '/admin/login');
    }
    if (view === 'dashboard') history.replaceState(null, '', '/admin');
    if (view === 'login') history.replaceState(null, '', '/admin/login');
  }, [view, path]);

  const load = async () => {
    const [m, s, b, f, d] = await Promise.all([
      fetchMerchants(),
      fetchStats(),
      fetchBudget(),
      fetchAdminFestivals().catch(() => []),
      fetchDashboard().catch(() => null),
    ]);
    setMerchants(m);
    setStats(s);
    setBudget(b);
    setManualFestivals(f);
    setDashboard(d);
  };

  useEffect(() => {
    if (view !== 'dashboard') return;
    load().catch((err) => setError(err.message));
  }, [view]);

  const pending = useMemo(
    () => merchants.filter((row) => row.matching_status === 'PENDING'),
    [merchants],
  );
  const kpi = dashboard?.kpi ?? {};
  const matching = dashboard?.matching ?? [];
  const unassigned = matching.filter((row: any) => !row.officerName);
  const regionMatching = matching.filter((row: any) => (row.region || 'GYEONGGI') === matchRegion);
  const regionUnassigned = regionMatching.filter((row: any) => !row.officerName);
  const recovery = kpi.recoveryRate ?? 38;
  const assigned = matching.filter((row: any) => row.officerName).length || kpi.matchingAssigned || 0;
  const totalCities = matching.length || kpi.matchingTotal || 0;
  const REGION_TABS = [
    ['SEOUL', '서울온'],
    ['BUSAN', '부산온'],
    ['DAEGU', '대구온'],
    ['INCHEON', '인천온'],
    ['GWANGJU', '광주온'],
    ['DAEJEON', '대전온'],
    ['ULSAN', '울산온'],
    ['SEJONG', '세종온'],
    ['GYEONGGI', '경기온'],
    ['GANGWON', '강원온'],
    ['CHUNGBUK', '충북온'],
    ['CHUNGNAM', '충남온'],
    ['JEONBUK', '전북온'],
    ['JEONNAM', '전남온'],
    ['GYEONGBUK', '경북온'],
    ['GYEONGNAM', '경남온'],
    ['JEJU', '제주온'],
  ] as const;
  const regionLabel = REGION_TABS.find(([id]) => id === matchRegion)?.[1] ?? '경기온';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await adminLogin(email, password);
      setView('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    }
  };

  if (view === 'login') {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <p className="eyebrow">온앤온+(on&on+) Admin</p>
          <h1>관리자 로그인</h1>
          <p className="muted">운영 주소 https://www.kdanji.com/admin · 기본 계정 admin@gyeonggi-on.kr / admin1234</p>
          <label>이메일</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <label>비밀번호</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="error">{error}</p> : null}
          <button type="submit">로그인</button>
        </form>
      </div>
    );
  }

  return (
    <div className="dash">
      <header>
        <div>
          <p className="eyebrow">온앤온+(on&on+)</p>
          <h1>관리자 대시보드</h1>
        </div>
        <button
          className="ghost"
          onClick={() => {
            logout();
            setView('login');
          }}
        >
          로그아웃
        </button>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section>
        <h2>한국관광공사 TourAPI 데이터 수집 프로세스</h2>
        <ol className="process">
          <li>서비스 키로 TourAPI 4.0(KorService2)에 접속합니다.</li>
          <li>searchFestival2를 areaCode=31(경기), MobileApp=kdanji, 오늘 이후 행사 조건으로 호출합니다.</li>
          <li>매일 03:00 Vercel Cron이 /api/cron/festivals 를 호출하고, 관리자는 즉시 수집도 요청할 수 있습니다.</li>
          <li>contentid·제목·주소·좌표·기간·이미지를 홈 축제 카드로 변환하고 12시간 캐시합니다.</li>
          <li>TourAPI에 없는 지자체 자체 행사는 아래 수동 등록으로 앱에 바로 반영합니다.</li>
        </ol>
      </section>

      <section className="kpi-grid">
        <article className="kpi blue">
          <span>전국 축제 현황</span>
          <strong>{kpi.festivals ?? 12}건</strong>
          <em>전월 대비 +{kpi.festivalsDeltaPct ?? 18}%</em>
        </article>
        <article className="kpi green">
          <span>등록 상가 현황</span>
          <strong>{kpi.merchants ?? (merchants.length || 18)}개소</strong>
          <em>국세청 검증 완료 {kpi.merchantsNtsVerified ?? (merchants.length || 18)}곳</em>
        </article>
        <article className="kpi purple">
          <span>쿠폰 발행/사용</span>
          <strong>{kpi.couponsIssued ?? stats?.summary?.issued_count ?? 24} / {kpi.couponsUsed ?? stats?.summary?.used_count ?? 9}</strong>
          <div className="bar"><i style={{ width: `${recovery}%` }} /></div>
          <em>회수율 {recovery}%</em>
        </article>
        <article className={`kpi ${unassigned.length ? 'red' : 'green'}`}>
          <span>지자체 매칭률</span>
          <strong>{assigned}/{totalCities}</strong>
          <em>매칭률 {totalCities ? Math.round((assigned / totalCities) * 1000) / 10 : 0}%</em>
        </article>
      </section>

      <section className="cards">
        <article>
          <span>총 발행 쿠폰</span>
          <strong>{stats?.summary?.issued_count ?? kpi.couponsIssued ?? 0}</strong>
        </article>
        <article>
          <span>QR 사용 완료</span>
          <strong>{stats?.summary?.used_count ?? kpi.couponsUsed ?? 0}</strong>
        </article>
        <article>
          <span>총 할인 지원액</span>
          <strong>{Number(stats?.summary?.total_discount_amount ?? 0).toLocaleString()}원</strong>
        </article>
        <article>
          <span>상가 자체 할인 사용</span>
          <strong>{stats?.self_funded?.used_count ?? 0}</strong>
        </article>
      </section>

      <section>
        <h2>가맹점 승인 대기목록</h2>
        <table>
          <thead>
            <tr>
              <th>상호명</th>
              <th>사업자번호</th>
              <th>점주 할인율</th>
              <th>지자체 매칭</th>
              <th>상태</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            {(pending.length ? pending : merchants.slice(0, 8)).map((row, idx) => (
              <tr key={`${row.id}-${row.promotion_id || idx}`}>
                <td>{row.business_name}</td>
                <td>{row.business_number}</td>
                <td>{row.merchant_discount_rate ?? '-'}%</td>
                <td>{row.gov_matching_rate ?? 0}%</td>
                <td>{row.matching_status || 'NONE'}</td>
                <td>
                  {row.matching_status === 'PENDING' ? (
                    <>
                      <button onClick={() => approveMerchant(row.id, 'APPROVE', row.promotion_id).then(load)}>승인</button>
                      <button className="danger" onClick={() => approveMerchant(row.id, 'REJECT', row.promotion_id).then(load)}>거절</button>
                    </>
                  ) : (
                    <span className="muted">처리됨</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>축제별 정산 데이터</h2>
        <table>
          <thead>
            <tr>
              <th>축제명</th>
              <th>가맹점수</th>
              <th>쿠폰 사용 건수</th>
              <th>점주 부담액</th>
              <th>지자체 지원액</th>
              <th>정산 상태</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.by_festival ?? []).map((row: any) => (
              <tr key={row.festival_id}>
                <td>{row.festival_title}</td>
                <td>{row.merchant_count}</td>
                <td>{row.used_count}</td>
                <td>{Number(row.merchant_burden).toLocaleString()}원</td>
                <td>{Number(row.gov_support).toLocaleString()}원</td>
                <td>{row.settlement_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>지자체 축제 등록 / TourAPI 수동 보완</h2>
        <p className="muted">지자체 담당자가 우리 지역 축제를 직접 등록하고 지역화폐 쿠폰을 연동합니다. 앱 홈·상세에 즉시 반영됩니다.</p>
        <form
          className="festival-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await saveAdminFestival({
                ...festivalForm,
                mapX: Number(festivalForm.mapX),
                mapY: Number(festivalForm.mapY),
              });
              setFestivalForm({
                title: '',
                address: '',
                tel: '',
                overview: '',
                fee: '',
                eventStartDate: '',
                eventEndDate: '',
                firstImage: '',
                category: '먹거리',
                municipality: '수원시',
                mapX: '127.013',
                mapY: '37.287',
              });
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : '저장 실패');
            }
          }}
        >
          <input placeholder="축제명" value={festivalForm.title} onChange={(e) => setFestivalForm({ ...festivalForm, title: e.target.value })} required />
          <input placeholder="지자체 (예: 수원시)" value={festivalForm.municipality} onChange={(e) => setFestivalForm({ ...festivalForm, municipality: e.target.value })} />
          <input placeholder="장소/주소 검색" value={festivalForm.address} onChange={(e) => setFestivalForm({ ...festivalForm, address: e.target.value })} />
          <select value={festivalForm.category} onChange={(e) => setFestivalForm({ ...festivalForm, category: e.target.value })}>
            {['먹거리', '체험', '공연', '문화/예술', '가족', '계절축제', '플리마켓'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <input placeholder="전화" value={festivalForm.tel} onChange={(e) => setFestivalForm({ ...festivalForm, tel: e.target.value })} />
          <input placeholder="이용요금" value={festivalForm.fee} onChange={(e) => setFestivalForm({ ...festivalForm, fee: e.target.value })} />
          <input type="date" value={festivalForm.eventStartDate} onChange={(e) => setFestivalForm({ ...festivalForm, eventStartDate: e.target.value })} />
          <input type="date" value={festivalForm.eventEndDate} onChange={(e) => setFestivalForm({ ...festivalForm, eventEndDate: e.target.value })} />
          <input placeholder="대표 이미지 / 포스터 URL" value={festivalForm.firstImage} onChange={(e) => setFestivalForm({ ...festivalForm, firstImage: e.target.value })} />
          <input placeholder="경도 mapX" value={festivalForm.mapX} onChange={(e) => setFestivalForm({ ...festivalForm, mapX: e.target.value })} />
          <input placeholder="위도 mapY" value={festivalForm.mapY} onChange={(e) => setFestivalForm({ ...festivalForm, mapY: e.target.value })} />
          <textarea placeholder="한 줄 소개 / 상세 내용" value={festivalForm.overview} onChange={(e) => setFestivalForm({ ...festivalForm, overview: e.target.value })} />
          <button type="submit">지자체 축제 등록</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>축제명</th>
              <th>주소</th>
              <th>전화</th>
              <th>요금</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            {manualFestivals.map((row) => (
              <tr key={row.contentId}>
                <td>{row.title}</td>
                <td>{row.address}</td>
                <td>{row.tel}</td>
                <td>{row.fee}</td>
                <td>
                  <button className="danger" onClick={() => deleteAdminFestival(row.contentId).then(load)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>지자체 매칭 매트릭스</h2>
        <p className="muted">{regionLabel} · {regionMatching.length}곳 · {matchRegion === 'GYEONGGI' ? '공식 매칭' : '자율 할인'} · 전국 미지정 {unassigned.length}곳</p>
        <div className="chip-row">
          {REGION_TABS.map(([id, label]) => {
            const miss = matching.filter((row: any) => (row.region || 'GYEONGGI') === id && !row.officerName).length;
            return (
              <button
                key={id}
                type="button"
                className={matchRegion === id ? 'chip on' : 'chip'}
                onClick={() => setMatchRegion(id)}
              >
                {label}{miss ? ` · ${miss}` : ''}
              </button>
            );
          })}
        </div>
        {regionUnassigned.length ? (
          <div className="alert">{regionLabel} 담당자 미지정 {regionUnassigned.length}곳 — 승인 대기 지자체에 담당자를 지정해 주세요.</div>
        ) : null}
        <table>
          <thead>
            <tr>
              <th>시·군·구</th>
              <th>담당자</th>
              <th>매칭 상가</th>
              <th>활성 축제</th>
              <th>쿠폰</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {regionMatching.map((row: any) => (
              <tr key={row.id || `${row.region || 'GYEONGGI'}:${row.city}`} className={row.officerName ? '' : 'row-alert'}>
                <td>{row.city}</td>
                <td>{row.officerName || '미지정'}</td>
                <td>{row.stores}</td>
                <td>{row.festivals}</td>
                <td>{row.coupons}</td>
                <td>
                  {row.officerName
                    ? <span className={`badge ${row.approved ? 'ok' : 'warn'}`}>{row.approved ? '승인' : '대기'}</span>
                    : <span className="badge danger">미지정 - 승인 대기</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>지자체 예산</h2>
        <table>
          <thead>
            <tr>
              <th>지자체</th>
              <th>잔여 예산</th>
              <th>초기 예산</th>
              <th>집행률</th>
            </tr>
          </thead>
          <tbody>
            {budget.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{Number(row.budget_balance).toLocaleString()}원</td>
                <td>{Number(row.initial_budget).toLocaleString()}원</td>
                <td>{row.execution_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
