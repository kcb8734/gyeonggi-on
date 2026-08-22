const NTS_STATUS_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status';

/** 납세자상태: 01 계속사업자, 02 휴업자, 03 폐업자 */
export const ACTIVE_BUSINESS_STATUS_CODE = '01';

export class NtsLookupError extends Error {
  constructor(
    message: string,
    readonly statusCode = 502,
  ) {
    super(message);
    this.name = 'NtsLookupError';
  }
}

export interface NtsBusinessStatus {
  b_no: string;
  b_stt: string;
  b_stt_cd: string;
  tax_type: string;
  tax_type_cd: string;
  end_dt: string;
  utcc_yn: string;
  tax_type_change_dt: string;
  invoice_apply_dt: string;
  rbf_tax_type: string;
  rbf_tax_type_cd: string;
  isActive: boolean;
}

interface StatusApiResponse {
  status_code?: string;
  match_cnt?: number;
  request_cnt?: number;
  data?: Array<Partial<NtsBusinessStatus> & { b_no?: string }>;
}

export interface FetchBusinessStatusOptions {
  serviceKey?: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
}

export function normalizeBusinessNumber(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '');
}

export function isValidBusinessNumber(raw: string): boolean {
  return /^\d{10}$/.test(normalizeBusinessNumber(raw));
}

function toStatus(row: Partial<NtsBusinessStatus> & { b_no?: string }): NtsBusinessStatus {
  const bSttCd = row.b_stt_cd ?? '';
  return {
    b_no: row.b_no ?? '',
    b_stt: row.b_stt ?? '',
    b_stt_cd: bSttCd,
    tax_type: row.tax_type ?? '',
    tax_type_cd: row.tax_type_cd ?? '',
    end_dt: row.end_dt ?? '',
    utcc_yn: row.utcc_yn ?? '',
    tax_type_change_dt: row.tax_type_change_dt ?? '',
    invoice_apply_dt: row.invoice_apply_dt ?? '',
    rbf_tax_type: row.rbf_tax_type ?? '',
    rbf_tax_type_cd: row.rbf_tax_type_cd ?? '',
    isActive: bSttCd === ACTIVE_BUSINESS_STATUS_CODE,
  };
}

/**
 * 공공데이터포털 국세청 사업자등록 상태조회.
 * POST https://api.odcloud.kr/api/nts-businessman/v1/status
 */
export async function fetchBusinessStatus(
  businessNumber: string,
  options: FetchBusinessStatusOptions = {},
): Promise<NtsBusinessStatus> {
  const bNo = normalizeBusinessNumber(businessNumber);
  if (!/^\d{10}$/.test(bNo)) {
    throw new NtsLookupError('사업자등록번호는 숫자 10자리여야 합니다.', 400);
  }

  const serviceKey = options.serviceKey ?? process.env.NTS_SERVICE_KEY;
  if (!serviceKey) {
    throw new NtsLookupError('국세청 API 인증키(NTS_SERVICE_KEY)가 설정되지 않았습니다.', 500);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? NTS_STATUS_URL;
  const timeoutMs = options.timeoutMs ?? 8000;
  const url = `${endpoint}?serviceKey=${encodeURIComponent(serviceKey)}&returnType=JSON`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ b_no: [bNo] }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new NtsLookupError('국세청 사업자 상태조회 요청이 시간 초과되었습니다.');
    }
    throw new NtsLookupError('국세청 사업자 상태조회 서비스에 연결하지 못했습니다.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new NtsLookupError(`국세청 사업자 상태조회가 실패했습니다. (HTTP ${response.status})`);
  }

  let payload: StatusApiResponse;
  try {
    payload = (await response.json()) as StatusApiResponse;
  } catch {
    throw new NtsLookupError('국세청 응답을 해석하지 못했습니다.');
  }

  if (payload.status_code && payload.status_code !== 'OK') {
    throw new NtsLookupError(`국세청 사업자 상태조회가 실패했습니다. (${payload.status_code})`);
  }

  const row = payload.data?.[0];
  if (!row) {
    throw new NtsLookupError('국세청에 등록되지 않은 사업자등록번호입니다.', 404);
  }

  return toStatus(row);
}

export function rejectionMessage(status: NtsBusinessStatus): string {
  if (status.b_stt_cd === '02') {
    return '휴업 중인 사업자는 할인 프로모션을 등록할 수 없습니다.';
  }
  if (status.b_stt_cd === '03') {
    const closed = status.end_dt ? ` (폐업일 ${status.end_dt})` : '';
    return `폐업한 사업자는 할인 프로모션을 등록할 수 없습니다.${closed}`;
  }
  if (status.tax_type) {
    return status.tax_type;
  }
  return '국세청 사업자 상태가 계속사업자(01)가 아니므로 프로모션을 등록할 수 없습니다.';
}
