export const RESEND_ACCOUNT_EMAIL = 'pizon8113@gmail.com';
export const RESEND_TEST_FROM = 'beth.t@example.com';

export function resendFromCandidates(envFrom) {
  const configured = String(envFrom || '').trim();
  const values = [];
  const add = (value) => {
    if (value && values.indexOf(value) === -1) values.push(value);
  };
  add(configured);
  add(RESEND_TEST_FROM);
  add('Onandon <' + RESEND_TEST_FROM + '>');
  add(RESEND_ACCOUNT_EMAIL);
  add('Onandon <' + RESEND_ACCOUNT_EMAIL + '>');
  add('Onandon <noreply@kdanji.com>');
  return values;
}
