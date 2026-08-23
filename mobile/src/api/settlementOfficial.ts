import { api } from './client';

export type OfficialScanItem = {
  id: string;
  code: string;
  title: string;
  discountAmount: number;
  usedAt: string | null;
};

export type OfficialPreview = {
  week: { count: number; amount: number };
  month: { count: number; amount: number };
  pending: { count: number; amount: number };
  items: OfficialScanItem[];
  merchant: { id: string; name: string };
  municipality: { name: string; mayorName: string; department: string; settlementEmail: string };
  docNumber: string;
  html: string;
  status: string;
};

export async function fetchOfficialPreview(merchantId?: string): Promise<OfficialPreview | null> {
  try {
    const res = await api.get<{ success: boolean; data: OfficialPreview }>('/api/settlements/preview', {
      params: merchantId ? { merchant_id: merchantId } : undefined,
    });
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

export async function sendOfficialSettlement(input: { merchantId?: string; toEmail?: string }) {
  const res = await api.post<{ success: boolean; message: string; data?: { status?: string; docNumber?: string; mocked?: boolean } }>(
    '/api/settlements/send',
    { merchant_id: input.merchantId, to_email: input.toEmail },
  );
  return {
    success: Boolean(res.data?.success),
    message: res.data?.message ?? res.data?.data?.status ?? '발송 처리되었습니다.',
    docNumber: res.data?.data?.docNumber,
    status: res.data?.data?.status ?? 'REQUESTED',
  };
}
