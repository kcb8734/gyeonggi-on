import { checkEmailChallenge, issueEmailChallenge } from './emailChallenge';
import { generateEmailCode, saveEmailCode, verifyEmailCode } from './emailCodeStore';

const RESEND_URL = 'https://api.resend.com/emails';

export async function sendManagerEmailCode(email: string) {
  const trimmed = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { success: false, status: 400, message: '담당자 메일 형식을 확인해주세요.' };
  }
  const code = generateEmailCode();
  saveEmailCode(trimmed, code);
  const issued = issueEmailChallenge(trimmed, code);
  const subject = '[온앤온] 지자체 담당자 인증번호';
  const html = `
    <div style="font-family:sans-serif;line-height:1.6">
      <h2>온앤온 지자체 담당자 인증</h2>
      <p>인증번호는 <strong style="font-size:22px;letter-spacing:4px">${code}</strong> 입니다.</p>
      <p>3분 안에 앱의 인증번호 확인에 입력해 주세요.</p>
    </div>
  `;

  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  if (resendKey) {
    try {
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || '온앤온 <beth.t@example.com>',
          to: [trimmed],
          subject,
          html,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('[email-auth] Resend 실패', response.status, text);
        return { success: false, status: 502, message: '인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' };
      }
    } catch (err) {
      console.error('[email-auth] Resend 연결 실패', err);
      return { success: false, status: 502, message: '인증 메일 서버에 연결하지 못했습니다.' };
    }
    return {
      success: true,
      status: 200,
      message: `${trimmed}으로 인증번호를 보냈습니다. 메일함을 확인한 뒤 3분 안에 입력해주세요.`,
      challenge: issued.challenge,
    };
  }

  console.log(`[email-auth] RESEND_API_KEY 없음. ${trimmed} 인증번호 ${code}`);
  return {
    success: true,
    status: 200,
    message: '메일 서버 키(RESEND_API_KEY)가 없어 메일은 나가지 않았습니다. 화면에 표시된 개발용 코드를 입력하세요.',
    devCode: code,
    challenge: issued.challenge,
  };
}

export function confirmManagerEmailCode(email: string, code: string, challenge?: string) {
  const signed = checkEmailChallenge(email, code, challenge ?? '');
  const result = signed.ok ? signed : verifyEmailCode(email, code);
  return {
    success: result.ok,
    status: result.ok ? 200 : 400,
    message: result.ok ? '담당자 메일이 확인되었습니다.' : (result.reason ?? '인증에 실패했습니다.'),
  };
}
