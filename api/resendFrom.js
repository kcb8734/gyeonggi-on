export const RESEND_ACCOUNT_EMAIL = 'pizon8113@gmail.com';
export const RESEND_TEST_FROM = 'beth.t@example.com';
export const RESEND_DOMAIN_FROM = 'Onandon <noreply@kdanji.com>';

export function resendFromCandidates(envFrom) {
  const configured = String(envFrom || '').trim();
  const values = [];
  const add = (value) => {
    if (value && values.indexOf(value) === -1) values.push(value);
  };
  add(configured);
  add(RESEND_DOMAIN_FROM);
  add(RESEND_TEST_FROM);
  add('Onandon <' + RESEND_TEST_FROM + '>');
  add(RESEND_ACCOUNT_EMAIL);
  add('Onandon <' + RESEND_ACCOUNT_EMAIL + '>');
  return values;
}

export async function sendResendEmail({ key, to, subject, html, fetchImpl }) {
  const fetchFn = fetchImpl || fetch;
  const candidates = resendFromCandidates(process.env.RESEND_FROM);
  let lastDetail = '';
  let lastStatus = 0;
  let lastFrom = '';
  for (const from of candidates) {
    try {
      const response = await fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: from,
          to: [to],
          reply_to: RESEND_ACCOUNT_EMAIL,
          subject: subject,
          html: html,
        }),
      });
      if (response.ok) {
        return { ok: true, from: from };
      }
      let detail = '';
      try {
        const payload = await response.json();
        detail = payload && payload.message ? String(payload.message) : '';
      } catch (_err) {
        detail = '';
      }
      lastDetail = detail;
      lastStatus = response.status;
      lastFrom = from;
      console.error('[api] Resend 실패', response.status, detail, 'from=' + from);
    } catch (_err) {
      lastDetail = 'connect';
      lastFrom = from;
      console.error('[api] Resend 연결 실패', from);
    }
  }
  if (lastDetail === 'connect') {
    return { ok: false, message: '인증 메일 서버에 연결하지 못했습니다.' };
  }
  const ownInbox = /own email|testing emails/i.test(lastDetail);
  return {
    ok: false,
    message: ownInbox
      ? 'Resend 테스트 발신은 계정 메일(' + RESEND_ACCOUNT_EMAIL + ')로만 보낼 수 있습니다.'
      : '발신 메일 주소가 Resend에서 확인되지 않았습니다. kdanji.com 도메인을 인증하거나 RESEND_FROM을 확인해주세요.',
    status: lastStatus,
    from: lastFrom,
  };
}
