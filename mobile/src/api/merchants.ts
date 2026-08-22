import { api } from './client';

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
  const res = await api.post<MerchantVerifyResult>('/api/merchants/verify', {
    merchant_id: params.merchantId,
    business_number: params.businessNumber,
    business_name: params.businessName,
  });
  return res.data;
}
