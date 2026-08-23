import { api } from './client';
import { API_BASE_URL } from '../config';

export interface MerchantVerifyResult {
  success: boolean;
  message: string;
  data?: {
    verified: boolean;
    business_name?: string | null;
    business_number: string;
    b_stt: string;
    b_stt_cd: string;
    tax_type: string;
    tax_type_cd: string;
    end_dt: string | null;
  };
}

export interface MerchantSettlement {
  issued_count: number;
  used_count: number;
  pending_amount: number;
  rows: Array<{
    id: string;
    title: string;
    issued_count: number;
    used_count: number;
    merchant_discount_total: number;
    gov_support_total: number;
    status: string;
  }>;
}

const PREVIEW_SETTLEMENT: MerchantSettlement = {
  issued_count: 18,
  used_count: 7,
  pending_amount: 246000,
  rows: [
    {
      id: '1',
      title: '수원화성문화제 제휴 한정식 할인',
      issued_count: 12,
      used_count: 5,
      merchant_discount_total: 85000,
      gov_support_total: 85000,
      status: '정산 대기',
    },
    {
      id: '2',
      title: '영동시장 상가 자체 할인',
      issued_count: 6,
      used_count: 2,
      merchant_discount_total: 76000,
      gov_support_total: 0,
      status: '자체 할인 정산 불필요',
    },
  ],
};

export async function fetchMerchantSettlement(merchantId: string): Promise<MerchantSettlement> {
  try {
    const res = await api.get<{ success: boolean; data: MerchantSettlement }>(`/api/merchants/${merchantId}/settlement`);
    if (res.data?.data) return res.data.data;
  } catch {
    // 미리보기
  }
  return PREVIEW_SETTLEMENT;
}

const CANONICAL_VERIFY = 'https://www.kdanji.com/api/merchants/verify';
const LOCAL_VERIFY = 'http://127.0.0.1:4000/api/merchants/verify';

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

/** apex kdanji.com 은 POST를 www로 308 해서 브라우저 조회가 실패한다. */
export function verifyMerchantUrls(options?: {
  hostname?: string;
  origin?: string;
  apiBaseUrl?: string;
  isDev?: boolean;
}): string[] {
  const hostname = options?.hostname
    ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const origin = (options?.origin
    ?? (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  const apiBase = (options?.apiBaseUrl ?? API_BASE_URL).replace(/\/$/, '');
  const isDev = options?.isDev ?? (typeof __DEV__ !== 'undefined' && __DEV__);
  const local = isLocalHost(hostname);
  const urls: string[] = [];

  if (local && origin) urls.push(`${origin}/api/merchants/verify`);
  if (!local && origin && hostname && hostname !== 'kdanji.com') {
    urls.push(`${origin}/api/merchants/verify`);
  }
  if (!local) urls.push(CANONICAL_VERIFY);
  if (apiBase && !apiBase.includes('kdanji.com') && !apiBase.includes('127.0.0.1')) {
    urls.push(`${apiBase}/api/merchants/verify`);
  }
  if (local || isDev) urls.push(LOCAL_VERIFY);

  return urls.filter((url, index, list) => url && list.indexOf(url) === index);
}

export async function verifyMerchant(params: {
  merchantId?: string;
  businessNumber?: string;
  businessName?: string;
}): Promise<MerchantVerifyResult> {
  const payload = {
    merchant_id: params.merchantId,
    business_number: params.businessNumber,
    business_name: params.businessName,
  };

  const urls = verifyMerchantUrls();
  let lastMessage = '국세청 상태조회에 실패했습니다.';
  let sawHttp = false;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null) as MerchantVerifyResult | null;
      if (data && typeof data === 'object' && 'success' in data) {
        return data;
      }
      sawHttp = true;
      lastMessage = `국세청 상태조회에 실패했습니다. (HTTP ${res.status || 0})`;
    } catch {
      if (!sawHttp) lastMessage = '국세청 확인 서버에 연결하지 못했습니다.';
    }
  }
  return { success: false, message: lastMessage };
}
