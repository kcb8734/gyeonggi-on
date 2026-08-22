import { api } from './client';

export interface MerchantVerifyResult {
  success: boolean;
  message: string;
  data?: {
    verified: boolean;
    business_number: string;
    b_stt: string;
    b_stt_cd: string;
    tax_type: string;
    tax_type_cd: string;
    end_dt: string | null;
  };
}

export async function verifyMerchant(params: {
  merchantId?: string;
  businessNumber?: string;
}): Promise<MerchantVerifyResult> {
  const res = await api.post<MerchantVerifyResult>('/api/merchants/verify', {
    merchant_id: params.merchantId,
    business_number: params.businessNumber,
  });
  return res.data;
}
