import axios from 'axios';
import { api } from './client';

export interface EmailCodeSendResult {
  success: boolean;
  message: string;
  devCode?: string;
  challenge?: string;
}

function fromError(err: unknown, fallback: string): EmailCodeSendResult {
  if (axios.isAxiosError(err)) {
    return {
      success: false,
      message: err.response?.data?.message ?? fallback,
      devCode: typeof err.response?.data?.devCode === 'string' ? err.response.data.devCode : undefined,
    };
  }
  return { success: false, message: fallback };
}

export async function sendManagerEmailCode(email: string): Promise<EmailCodeSendResult> {
  try {
    const res = await api.post('/api/auth/send-email-code', { email });
    return {
      success: Boolean(res.data?.success),
      message: res.data?.message ?? '인증 메일을 보냈습니다.',
      devCode: typeof res.data?.devCode === 'string' ? res.data.devCode : undefined,
      challenge: typeof res.data?.challenge === 'string' ? res.data.challenge : undefined,
    };
  } catch (err) {
    return fromError(err, '인증 메일을 보내지 못했습니다.');
  }
}

export async function verifyManagerEmailCode(
  email: string,
  code: string,
  challenge?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await api.post('/api/auth/verify-email-code', { email, code, challenge });
    return {
      success: Boolean(res.data?.success),
      message: res.data?.message ?? '인증되었습니다.',
    };
  } catch (err) {
    return fromError(err, '인증번호 확인에 실패했습니다.');
  }
}
