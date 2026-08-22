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

  const urls = [
    typeof window !== 'undefined' ? `${window.location.origin}/api/merchants/verify` : '',
    API_BASE_URL ? `${API_BASE_URL}/api/merchants/verify` : '',
    'http://127.0.0.1:4000/api/merchants/verify',
  ].filter((url, index, list) => url && list.indexOf(url) === index);

  let lastMessage = '국세청 상태조회에 실패했습니다.';
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
      lastMessage = `국세청 상태조회에 실패했습니다. (HTTP ${res.status || 0})`;
    } catch {
      lastMessage = '국세청 확인 서버에 연결하지 못했습니다.';
    }
  }
  return { success: false, message: lastMessage };
}
