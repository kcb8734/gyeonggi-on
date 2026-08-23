/**
 * Express/TypeScript 없이 동작하는 단일 Vercel Function.
 * /api/* rewrite 가 이 파일로 들어오므로 국세청 조회·헬스를 여기서 처리한다.
 */
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

async function handler(req, res) {
  try {
    const method = String(req.method || 'GET').toUpperCase();
    const path = requestPath(req);
    const body = readBody(req);
    const looksVerify = /merchants\/verify/i.test(path)
      || (method === 'POST' && typeof body.business_number === 'string')
      || method === 'OPTIONS';

    if (looksVerify) {
      await verifyNts(req, res);
      return;
    }

    send(res, 200, {
      status: 'ok',
      service: 'gyeonggi-on-api',
      nts: Boolean(String(process.env.NTS_SERVICE_KEY || '').trim()),
    }, corsHeaders(req));
  } catch (err) {
    send(res, 500, {
      success: false,
      message: err && err.message ? err.message : '국세청 상태조회에 실패했습니다.',
    }, corsHeaders(req));
  }
}

export default handler;
