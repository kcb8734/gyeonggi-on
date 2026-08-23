/**
 * Express/TypeScript 없이 동작하는 단일 Vercel Function.
 * /api/* rewrite 가 이 파일로 들어오므로 국세청 조회·헬스를 여기서 처리한다.
 */
import {
  checkEmailChallenge,
  generateEmailCode,
  issueEmailChallenge,
  normalizeEmail,
} from './emailChallenge.js';
import {
  dashboard,
  preview,
  recommendCourse,
  sendOfficial,
  settlementCsv,
  useCoupon,
  verifyCoupon,
} from './platform.js';
const NTS_STATUS_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status';
const ACTIVE_CODE = '01';
const ALLOWED_ORIGINS = [
  'https://kdanji.com',
  'https://www.kdanji.com',
  'http://localhost:3000',
  'http://localhost:19006',
];

function send(res, status, body, extraHeaders) {
  const headers = Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extraHeaders || {});
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    Object.keys(headers).forEach((key) => res.setHeader && res.setHeader(key, headers[key]));
    res.status(status).json(body);
    return;
  }
  res.statusCode = status;
  Object.keys(headers).forEach((key) => res.setHeader(key, headers[key]));
  res.end(JSON.stringify(body));
}

function originOf(req) {
  const headers = req.headers || {};
  const raw = headers.origin || headers.Origin || '';
  return Array.isArray(raw) ? raw[0] || '' : String(raw);
}

function corsHeaders(req) {
  const origin = originOf(req);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };
  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  return headers;
}

function readBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_err) {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function readQuery(req) {
  const raw = requestPath(req);
  const q = raw.indexOf('?');
  if (q < 0) return {};
  try {
    return Object.fromEntries(new URLSearchParams(raw.slice(q + 1)));
  } catch (_err) {
    return {};
  }
}

function requestPath(req) {
  const headers = req.headers || {};
  const pick = (value) => (Array.isArray(value) ? value[0] : value) || '';
  return [
    req.url,
    req.originalUrl,
    pick(headers['x-invoke-path']),
    pick(headers['x-matched-path']),
    pick(headers['x-forwarded-uri']),
    pick(headers['x-vercel-original-url']),
  ].filter(Boolean).join(' ');
}

function normalizeBusinessNumber(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function rejectionMessage(status) {
  if (status.b_stt_cd === '02') return '휴업 중인 사업자는 할인 프로모션을 등록할 수 없습니다.';
  if (status.b_stt_cd === '03') {
    const closed = status.end_dt ? ' (폐업일 ' + status.end_dt + ')' : '';
    return '폐업한 사업자는 할인 프로모션을 등록할 수 없습니다.' + closed;
  }
  if (status.tax_type) return status.tax_type;
  return '국세청 사업자 상태가 계속사업자(01)가 아니므로 프로모션을 등록할 수 없습니다.';
}

async function verifyNts(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }

  const body = readBody(req);
  const businessName = typeof body.business_name === 'string' ? body.business_name.trim() : '';
  const businessNumber = normalizeBusinessNumber(body.business_number);

  if (!/^\d{10}$/.test(businessNumber)) {
    send(res, 400, { success: false, message: '사업자등록번호는 숫자 10자리여야 합니다.' }, headers);
    return;
  }

  const serviceKey = String(process.env.NTS_SERVICE_KEY || '').trim();
  if (!serviceKey) {
    send(res, 500, {
      success: false,
      message: '국세청 API 인증키(NTS_SERVICE_KEY)가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.',
    }, headers);
    return;
  }

  const url = NTS_STATUS_URL + '?serviceKey=' + encodeURIComponent(serviceKey) + '&returnType=JSON';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ b_no: [businessNumber] }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    payload = null;
  }

  if (!response.ok) {
    const authFail = response.status === 401 || response.status === 403;
    send(res, authFail ? response.status : 502, {
      success: false,
      message: authFail
        ? '국세청 API 인증키(NTS_SERVICE_KEY)가 유효하지 않습니다. Vercel 환경변수를 확인하세요.'
        : '국세청 사업자 상태조회가 실패했습니다. (HTTP ' + response.status + ')',
    }, headers);
    return;
  }

  const row = payload && payload.data && payload.data[0];
  if (!row) {
    send(res, 404, { success: false, message: '국세청에 등록되지 않은 사업자등록번호입니다.' }, headers);
    return;
  }

  const status = {
    b_no: row.b_no || businessNumber,
    b_stt: row.b_stt || '',
    b_stt_cd: row.b_stt_cd || '',
    tax_type: row.tax_type || '',
    tax_type_cd: row.tax_type_cd || '',
    end_dt: row.end_dt || '',
  };
  const verified = status.b_stt_cd === ACTIVE_CODE;
  send(res, verified ? 200 : 409, {
    success: verified,
    message: verified
      ? '국세청 계속사업자로 확인되었습니다. 상가 자체 할인은 바로 등록할 수 있습니다.'
      : rejectionMessage(status),
    data: {
      verified: verified,
      business_name: businessName || null,
      business_number: status.b_no,
      b_stt: status.b_stt,
      b_stt_cd: status.b_stt_cd,
      tax_type: status.tax_type,
      tax_type_cd: status.tax_type_cd,
      end_dt: status.end_dt || null,
    },
  }, headers);
}

const emailCodes = new Map();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function resendConfigured() {
  return Boolean(String(process.env.RESEND_API_KEY || '').trim());
}

function resendFrom() {
  return String(process.env.RESEND_FROM || '').trim() || '온앤온 <beth.t@example.com>';
}

function todayYmd() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + month + day;
}

function formatYmd(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 8) return '';
  return digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8);
}

function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function tourToHome(item) {
  const contentId = String(item.contentid || item.contentId || '');
  const start = formatYmd(item.eventstartdate) || formatYmd(item.eventStartDate);
  const end = formatYmd(item.eventenddate) || start;
  return {
    id: contentId ? 'tour-' + contentId : '',
    contentId: contentId,
    contentTypeId: String(item.contenttypeid || '15'),
    title: String(item.title || ''),
    location_name: [item.addr1, item.addr2].filter(Boolean).join(' '),
    latitude: Number(item.mapy) || 0,
    longitude: Number(item.mapx) || 0,
    start_date: start,
    end_date: end,
    municipality_name: String(item.addr1 || '').split(' ')[1] || null,
    description: null,
    category: '문화/예술',
    image_url: String(item.firstimage || item.firstimage2 || '').replace(/^http:\/\//i, 'https://') || null,
    is_trending: Boolean(item.firstimage),
    source: 'tour',
    tel: item.tel || undefined,
  };
}

async function fetchTourItems(baseUrl, path, areaCode) {
  const key = String(process.env.TOUR_API_SERVICE_KEY || process.env.NTS_SERVICE_KEY || '').trim();
  if (!key) throw new Error('TOUR_API_SERVICE_KEY 가 없습니다.');
  const params = new URLSearchParams();
  params.set('serviceKey', key);
  params.set('MobileOS', 'ETC');
  params.set('MobileApp', 'kdanji');
  params.set('_type', 'json');
  params.set('areaCode', String(areaCode || '31'));
  params.set('eventStartDate', todayYmd());
  params.set('numOfRows', '80');
  params.set('pageNo', '1');
  params.set('arrange', 'C');
  const url = baseUrl.replace(/\/$/, '') + path + '?' + params.toString();
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('TourAPI HTTP ' + response.status);
  const payload = await response.json();
  const code = payload && payload.response && payload.response.header && payload.response.header.resultCode;
  if (code && code !== '0000') {
    throw new Error(payload.response.header.resultMsg || code);
  }
  const items = payload && payload.response && payload.response.body && payload.response.body.items;
  if (!items || typeof items === 'string') return [];
  return asList(items.item).map(tourToHome).filter((item) => item.contentId && item.title);
}

async function listFestivalsLive(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const query = readQuery(req);
  const metroArea = { GYEONGGI: '31', SEOUL: '1', INCHEON: '2', GANGWON: '32', CHUNGCHEONG: '33', JEOLLA: '35', GYEONGSANG: '37', JEJU: '39' };
  const resolvedArea = String(query.areaCode || metroArea[String(query.metro || '').toUpperCase()] || '31');
  let festivals = [];
  let source = 'none';
  try {
    festivals = await fetchTourItems('https://apis.data.go.kr/B551011/KorService1', '/searchFestival1', resolvedArea);
    source = festivals.length ? 'searchFestival1' : source;
  } catch (err) {
    console.error('[api] searchFestival1', err && err.message ? err.message : err);
  }
  if (!festivals.length) {
    try {
      festivals = await fetchTourItems('https://apis.data.go.kr/B551011/KorService2', '/searchFestival2', resolvedArea);
      source = festivals.length ? 'searchFestival2' : source;
    } catch (err) {
      console.error('[api] searchFestival2', err && err.message ? err.message : err);
    }
  }
  send(res, 200, {
    success: true,
    metro: query.metro || 'GYEONGGI',
    areaCode: resolvedArea,
    count: festivals.length,
    source: source,
    festivals: festivals,
    data: festivals,
    message: festivals.length ? '권역 축제 목록' : 'TourAPI 목록이 비어 있습니다.',
  }, headers);
}

async function sendEmailCode(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const body = readBody(req);
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!isValidEmail(email)) {
    send(res, 400, { success: false, message: '담당자 메일 형식을 확인해주세요.' }, headers);
    return;
  }
  const code = generateEmailCode();
  const issued = issueEmailChallenge(email, code);
  emailCodes.set(normalizeEmail(email), { code: code, expiresAt: issued.expiresAt, challenge: issued.challenge });
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (key) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: resendFrom(),
          to: [email],
          subject: '[온앤온] 지자체 담당자 인증번호',
          html: '<p>온앤온 지자체 담당자 인증번호는 <strong>' + code + '</strong> 입니다. 3분 안에 입력해 주세요.</p>',
        }),
      });
      if (!response.ok) {
        let detail = '';
        try {
          const payload = await response.json();
          detail = payload && payload.message ? String(payload.message) : '';
        } catch (_err) {
          detail = '';
        }
        console.error('[api] Resend 실패', response.status, detail);
        const domainFail = /domain|from/i.test(detail);
        send(res, 502, {
          success: false,
          message: domainFail
            ? '발신 메일 주소가 Resend에서 확인되지 않았습니다. RESEND_FROM을 확인해주세요.'
            : '인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
        }, headers);
        return;
      }
    } catch (_err) {
      send(res, 502, { success: false, message: '인증 메일 서버에 연결하지 못했습니다.' }, headers);
      return;
    }
    send(res, 200, {
      success: true,
      message: email + '으로 인증번호를 보냈습니다. 메일함을 확인한 뒤 3분 안에 입력해주세요.',
      challenge: issued.challenge,
    }, headers);
    return;
  }
  console.log('[api] email code', email, code);
  send(res, 200, {
    success: true,
    message: '메일 서버 키(RESEND_API_KEY)가 없어 메일은 나가지 않았습니다. 화면에 표시된 개발용 코드를 입력하세요.',
    devCode: code,
    challenge: issued.challenge,
  }, headers);
}

async function verifyEmailCode(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const body = readBody(req);
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').trim();
  const challenge = typeof body.challenge === 'string' ? body.challenge : '';
  const signed = checkEmailChallenge(email, code, challenge);
  const record = emailCodes.get(email);
  const memoryOk = record
    && record.expiresAt >= Date.now()
    && record.code === code;
  if (!signed.ok && !memoryOk) {
    send(res, 400, {
      success: false,
      message: signed.reason || (record ? '인증번호가 일치하지 않습니다.' : '인증번호를 먼저 받아주세요.'),
    }, headers);
    return;
  }
  emailCodes.delete(email);
  send(res, 200, { success: true, message: '담당자 메일이 확인되었습니다.', email: email }, headers);
}

function cronAuthorized(req) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) return true;
  return String(req.headers.authorization || '') === 'Bearer ' + secret;
}

async function handler(req, res) {
  try {
    const method = String(req.method || 'GET').toUpperCase();
    const path = requestPath(req);
    const body = readBody(req);

    if (/coupons\/verify/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = verifyCoupon(body.code || body.coupon_code);
      send(res, result.status, result.body, corsHeaders(req));
      return;
    }
    if (/coupons\/use/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = useCoupon(body.code || body.coupon_code, body.merchant_id);
      send(res, result.status, result.body, corsHeaders(req));
      return;
    }
    if (/settlements\/preview/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const query = readQuery(req);
      const merchantId = body.merchant_id || query.merchant_id;
      send(res, 200, { success: true, data: preview(merchantId) }, corsHeaders(req));
      return;
    }
    if (/settlements\/send/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = await sendOfficial(body.merchant_id, body.to_email);
      send(res, result.status, result.body, corsHeaders(req));
      return;
    }
    if (/courses\/recommend/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const query = readQuery(req);
      const title = body.title || query.title || '';
      const city = body.city || query.city || '';
      send(res, 200, { success: true, data: recommendCourse(title, city) }, corsHeaders(req));
      return;
    }
    if (/admin\/dashboard/i.test(path)) {
      send(res, 200, { success: true, data: dashboard() }, corsHeaders(req));
      return;
    }
    if (/admin\/settlements\.csv/i.test(path)) {
      send(res, 200, { success: true, csv: settlementCsv() }, corsHeaders(req));
      return;
    }
    if (/admin\/login/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const email = String(body.email || '').trim();
      const password = String(body.password || '');
      if (email === 'admin@gyeonggi-on.kr' && password === 'admin1234') {
        send(res, 200, { success: true, data: { token: 'admin-local' }, message: '관리자 로그인' }, corsHeaders(req));
        return;
      }
      send(res, 401, { success: false, message: '관리자 계정 정보가 올바르지 않습니다.' }, corsHeaders(req));
      return;
    }

    if (/auth\/send-email-code/i.test(path)) {
      await sendEmailCode(req, res);
      return;
    }
    if (/auth\/verify-email-code/i.test(path)) {
      await verifyEmailCode(req, res);
      return;
    }
    if (/\/api\/festivals\/?(\?|$)/i.test(path) || /\/api\/festivals["\s]/i.test(path) || /(^|[^\w])\/api\/festivals([^\w]|$)/i.test(path)) {
      if (!/festivals\/(nearby|sync|[^/]+\/map)/i.test(path)) {
        await listFestivalsLive(req, res);
        return;
      }
    }
    if (/cron\/festivals|festivals\/sync/i.test(path)) {
      if (!cronAuthorized(req)) {
        send(res, 401, { success: false, message: 'cron 인증이 필요합니다.' }, corsHeaders(req));
        return;
      }
      await listFestivalsLive(req, res);
      return;
    }

    const looksVerify = /merchants\/verify/i.test(path)
      || (method === 'POST' && typeof body.business_number === 'string');
    if (looksVerify || (method === 'OPTIONS' && /merchants\/verify/i.test(path))) {
      await verifyNts(req, res);
      return;
    }

    if (/\/health|\/api\/health/i.test(path)) {
      send(res, 200, {
        status: 'ok',
        service: 'gyeonggi-on-api',
        nts: Boolean(String(process.env.NTS_SERVICE_KEY || '').trim()),
        email: resendConfigured(),
      }, corsHeaders(req));
      return;
    }

    send(res, 404, { success: false, message: '지원하지 않는 API입니다.' }, corsHeaders(req));
  } catch (err) {
    send(res, 500, {
      success: false,
      message: err && err.message ? err.message : '요청 처리에 실패했습니다.',
    }, corsHeaders(req));
  }
}

export default handler;
