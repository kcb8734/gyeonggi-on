import { recommendCourse } from './festivalCourse.js';
import { matchingRows, feedRewardRows, METRO_LOCALITIES, REGION_LABEL } from './metroLocalities.js';

const DEV_MERCHANT_ID = '22222222-2222-4222-8222-222222222222';

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const coupons = [
  { id: 'coupon-used-1', code: 'GYON-USED-0001', title: '장단콩 축제 10% 할인', discountAmount: 3000, municipalityId: 'yongin', merchantId: DEV_MERCHANT_ID, isUsed: true, usedAt: hoursAgo(6), expiresAt: daysFromNow(20), settlementId: null },
  { id: 'coupon-used-2', code: 'GYON-USED-0002', title: '전통시장 먹거리 쿠폰', discountAmount: 2000, municipalityId: 'yongin', merchantId: DEV_MERCHANT_ID, isUsed: true, usedAt: hoursAgo(30), expiresAt: daysFromNow(20), settlementId: null },
  { id: 'coupon-used-3', code: 'GYON-USED-0003', title: '온앤온 현장 결제 할인', discountAmount: 4500, municipalityId: 'yongin', merchantId: DEV_MERCHANT_ID, isUsed: true, usedAt: hoursAgo(80), expiresAt: daysFromNow(20), settlementId: null },
  { id: 'coupon-scan-1', code: 'GYON-SCAN-0001', title: '온앤온 현장 할인', discountAmount: 1500, municipalityId: 'yongin', merchantId: DEV_MERCHANT_ID, isUsed: false, usedAt: null, expiresAt: daysFromNow(40), settlementId: null },
  { id: 'coupon-wallet-1', code: 'GGON-SW-1042', title: '수원화성문화제 제휴 한정식 할인', discountAmount: 3000, municipalityId: 'yongin', merchantId: DEV_MERCHANT_ID, isUsed: false, usedAt: null, expiresAt: daysFromNow(40), settlementId: null },
];

function normalizeCouponCode(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get('code') || url.searchParams.get('coupon') || url.searchParams.get('coupon_code');
    if (fromQuery) return normalizeCouponCode(fromQuery);
  } catch (_err) {
    // 쿠폰 코드
  }
  const matched = text.toUpperCase().match(/\b((?:GYON|GGON)[-A-Z0-9]{3,})\b/);
  return ((matched && matched[1]) || text).trim().toUpperCase();
}

function isIssuedCouponCode(code) {
  return /^(GYON|GGON)[-A-Z0-9]{3,}$/i.test(String(code || '').trim());
}

const settlements = [];
const engine = { festivalWeight: 40, campingDistanceWeight: 25, marketRatioWeight: 20, historyWeight: 15 };
const CITIES = (METRO_LOCALITIES.GYEONGGI || []).map((loc) => loc.label);

function findCoupon(code) {
  const token = normalizeCouponCode(code);
  return coupons.find((item) => item.code.toUpperCase() === token) || null;
}

function enrollCoupon(code, title, discountAmount) {
  const existing = findCoupon(code);
  if (existing) return existing;
  const row = {
    id: 'auto-' + code,
    code: code,
    title: title || '온앤온 모바일 쿠폰',
    discountAmount: discountAmount || 3000,
    municipalityId: 'yongin',
    merchantId: DEV_MERCHANT_ID,
    isUsed: false,
    usedAt: null,
    expiresAt: daysFromNow(40),
    settlementId: null,
  };
  coupons.push(row);
  return row;
}

function inspectCoupon(code) {
  const token = normalizeCouponCode(code);
  if (!token || (!isIssuedCouponCode(token) && !findCoupon(token))) {
    return { status: 400, body: { success: false, message: '쿠폰 QR이 아닙니다. 손님 쿠폰함의 QR을 스캔해 주세요.' } };
  }
  const coupon = findCoupon(token) || (isIssuedCouponCode(token) ? enrollCoupon(token) : null);
  if (!coupon) return { status: 404, body: { success: false, message: '등록되지 않은 쿠폰 코드입니다.' } };
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { status: 410, body: { success: false, message: '만료된 쿠폰입니다.' } };
  }
  return { status: 200, body: { success: true, data: coupon } };
}

function verifyCoupon(code) {
  const checked = inspectCoupon(code);
  if (!checked.body.success) return checked;
  const coupon = checked.body.data;
  return {
    status: 200,
    body: {
      success: true,
      message: coupon.isUsed ? '이미 사용된 쿠폰입니다. 정산 집계에 포함할 수 있습니다.' : '사용 가능한 쿠폰입니다.',
      data: coupon,
    },
  };
}

function useCoupon(code, merchantId) {
  const checked = inspectCoupon(code);
  if (!checked.body.success) return checked;
  const coupon = findCoupon(code) || checked.body.data;
  if (coupon.isUsed) return { status: 409, body: { success: false, message: '이미 사용된 쿠폰입니다.', data: coupon } };
  coupon.isUsed = true;
  coupon.usedAt = new Date().toISOString();
  if (merchantId) coupon.merchantId = merchantId;
  return { status: 200, body: { success: true, message: '쿠폰이 사용 처리되었습니다.', data: coupon } };
}

function nextDocNumber() {
  const now = new Date();
  const stamp = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0');
  const seq = settlements.filter((item) => item.docNumber.indexOf('GON-' + stamp + '-') === 0).length + 1;
  return 'GON-' + stamp + '-' + String(seq).padStart(4, '0');
}

function unsettled(merchantId) {
  return coupons.filter((item) => item.isUsed && !item.settlementId && (!merchantId || item.merchantId === merchantId));
}

function inRange(iso, start) {
  if (!iso) return false;
  return new Date(iso).getTime() >= start.getTime();
}

function officialHtml(docNumber, items) {
  const rows = items.map((item, index) => (
    '<tr><td>' + (index + 1) + '</td><td>' + (item.usedAt || '') + '</td><td>' + item.title + '</td><td>' + item.discountAmount + '</td><td>' + item.code + '</td></tr>'
  )).join('');
  const total = items.reduce((acc, item) => acc + item.discountAmount, 0);
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>' + docNumber + '</title></head><body>'
    + '<h1>경기온 모바일 쿠폰 정산 청구의 건</h1>'
    + '<p>수신: 용인시장 / 참조: 관광과</p>'
    + '<p>가맹점: 화성행궁 한정식 / 입금: 기업은행 123-456789-01-011</p>'
    + '<table border="1"><thead><tr><th>연번</th><th>스캔 시각</th><th>쿠폰명</th><th>할인금액</th><th>QR ID</th></tr></thead><tbody>'
    + rows + '</tbody></table>'
    + '<p>총 ' + items.length + '건 / ' + total + '원</p><p>직인란</p></body></html>';
}

function simplePdf(text) {
  const escaped = String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const lines = escaped.split('\n');
  const content = lines.map((line, i) => 'BT /F1 11 Tf 40 ' + (780 - i * 16) + ' Td (' + line + ') Tj ET').join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    '4 0 obj << /Length ' + Buffer.byteLength(content) + ' >> stream\n' + content + '\nendstream endobj',
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  let offset = 9;
  const offsets = [0];
  const body = objects.map((obj) => {
    offsets.push(offset);
    const chunk = obj + '\n';
    offset += Buffer.byteLength(chunk);
    return chunk;
  }).join('');
  return Buffer.from('%PDF-1.4\n' + body + 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map((n) => String(n).padStart(10, '0') + ' 00000 n ').join('\n') + '\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n' + offset + '\n%%EOF');
}

function preview(merchantId) {
  const items = unsettled(merchantId);
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekItems = items.filter((item) => inRange(item.usedAt, weekStart));
  const monthItems = items.filter((item) => inRange(item.usedAt, monthStart));
  const sum = (list) => list.reduce((acc, item) => acc + item.discountAmount, 0);
  const docNumber = nextDocNumber();
  return {
    week: { count: weekItems.length, amount: sum(weekItems) },
    month: { count: monthItems.length, amount: sum(monthItems) },
    pending: { count: items.length, amount: sum(items) },
    items,
    merchant: { id: DEV_MERCHANT_ID, name: '화성행궁 한정식' },
    municipality: { name: '용인시', mayorName: '용인시장', department: '관광과', settlementEmail: 'pizon8113@gmail.com' },
    docNumber,
    html: officialHtml(docNumber, items),
    status: 'PENDING',
  };
}

async function sendResend(to, subject, html, attachments) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.RESEND_FROM || '').trim() || 'Onandon <noreply@kdanji.com>';
  if (!key) return { id: 'mock-' + Date.now(), mocked: true };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, attachments }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error('공문서 메일 발송에 실패했습니다.');
  try {
    return JSON.parse(text);
  } catch (_err) {
    return { id: 'sent' };
  }
}

async function sendOfficial(merchantId, toEmail) {
  const data = preview(merchantId);
  if (!data.items.length) return { status: 400, body: { success: false, message: '정산할 스캔 쿠폰이 없습니다.' } };
  const to = toEmail || data.municipality.settlementEmail;
  const subject = '[공문] 경기온 모바일 쿠폰 정산 청구의 건 - ' + data.merchant.name + ' (' + data.docNumber + ')';
  const pdf = simplePdf('On&On settlement ' + data.docNumber + ' count=' + data.pending.count + ' amount=' + data.pending.amount);
  const sent = await sendResend(to, subject, '<p>첨부된 공문서로 정산을 청구합니다.</p>' + data.html, [
    { filename: data.docNumber + '.html', content: Buffer.from(data.html, 'utf8').toString('base64') },
    { filename: data.docNumber + '.pdf', content: pdf.toString('base64') },
  ]);
  const settlementId = 'settle-' + Date.now();
  data.items.forEach((item) => { item.settlementId = settlementId; });
  settlements.push({ id: settlementId, docNumber: data.docNumber, status: 'REQUESTED' });
  return {
    status: 200,
    body: {
      success: true,
      message: '정상적으로 공문서가 접수되었습니다.',
      data: { ok: true, message: '정상적으로 공문서가 접수되었습니다.', settlementId, docNumber: data.docNumber, status: 'REQUESTED', emailId: sent.id, mocked: sent.mocked || false, to },
    },
  };
}

function couponMaster() {
  return [
    { id: 'CP-1001', festival: '장단콩 축제', store: '문산시장 콩국수', issued: 12, used: 4, recovery: 33, period: '2026-08', region: 'GYEONGGI', couponType: 'OFFICIAL' },
    { id: 'CP-1002', festival: '수원화성문화제', store: '화성행궁 한정식', issued: 12, used: 5, recovery: 42, period: '2026-08', region: 'GYEONGGI', couponType: 'OFFICIAL' },
    { id: 'CP-2008', festival: '보령머드축제', store: '대천항활어회센터', issued: 8, used: 3, recovery: 38, period: '2026-08', region: 'CHUNGNAM', couponType: 'SELF' },
    { id: 'CP-3011', festival: '진주남강유등축제', store: '진주중앙시장', issued: 10, used: 4, recovery: 40, period: '2026-08', region: 'GYEONGNAM', couponType: 'SELF' },
    { id: 'CP-4015', festival: '화천산천어축제', store: '화천재래시장', issued: 6, used: 2, recovery: 33, period: '2026-08', region: 'GANGWON', couponType: 'SELF' },
    { id: 'CP-5022', festival: '보성차밭빛축제', store: '보성녹차거리', issued: 7, used: 3, recovery: 43, period: '2026-08', region: 'JEONNAM', couponType: 'SELF' },
  ];
}

function updateEngine(input) {
  const next = input && typeof input === 'object' ? input : {};
  if (next.festivalWeight != null) engine.festivalWeight = Number(next.festivalWeight);
  if (next.campingDistanceWeight != null) engine.campingDistanceWeight = Number(next.campingDistanceWeight);
  if (next.marketRatioWeight != null) engine.marketRatioWeight = Number(next.marketRatioWeight);
  if (next.historyWeight != null) engine.historyWeight = Number(next.historyWeight);
  return engine;
}

function dashboard() {
  const matching = matchingRows();
  const assignedCount = matching.filter((row) => row.officerName).length;
  return {
    kpi: {
      festivals: 12,
      festivalsDelta: 2,
      festivalsDeltaPct: 18,
      merchants: 18,
      merchantsNtsVerified: 18,
      couponsIssued: 24,
      couponsUsed: 9,
      recoveryRate: 38,
      matchingAssigned: assignedCount,
      matchingTotal: matching.length,
      matchingCoverage: assignedCount + '/' + matching.length,
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
        { ran_at: hoursAgo(2), target_api: 'areaBasedList1', fetched: 42, failed: 0, status: '정상' },
        { ran_at: hoursAgo(9), target_api: 'searchFestival2', fetched: 18, failed: 0, status: '정상' },
        { ran_at: hoursAgo(15), target_api: 'detailCommon2', fetched: 31, failed: 0, status: '정상' },
        { ran_at: hoursAgo(21), target_api: 'locationBasedList1', fetched: 24, failed: 0, status: '정상' },
      ],
    },
    coupons: couponMaster(),
    matching,
    feedRewards: feedRewardRows(),
    regions: Object.entries(REGION_LABEL).map(([id, label]) => ({ id, label })),
    engine,
    courses: [{ id: 'course-1', festival: '장단콩 축제', elements: '캠핑/역사/시장', recommendCount: 12, saveCount: 4, editorsPick: false }],
    weekly: [
      { label: '7/27', recovery: 25, used: 1 },
      { label: '8/3', recovery: 40, used: 2 },
      { label: '8/10', recovery: 43, used: 3 },
      { label: '8/17', recovery: 36, used: 4 },
      { label: '8/24', recovery: 38, used: 9 },
    ],
    guardLogs: [{ at: new Date().toISOString(), text: '정상 코스 생성', blocked: false }],
    cities: CITIES,
  };
}

function settlementCsv() {
  const data = dashboard();
  const header = '권역,시군,담당자,매칭상가,활성축제,쿠폰,승인';
  const rows = data.matching.map((row) => [
    row.regionLabel || REGION_LABEL[row.region] || row.region || '',
    row.city,
    row.officerName || '미지정',
    row.stores,
    row.festivals,
    row.coupons,
    row.approved ? '승인' : '대기',
  ].join(','));
  return '\uFEFF' + [header, ...rows].join('\n');
}

export {
  verifyCoupon,
  useCoupon,
  preview,
  sendOfficial,
  recommendCourse,
  dashboard,
  settlementCsv,
  engine,
  updateEngine,
};
