const ISSUED_CODE = /\b((?:GYON|GGON)[-A-Z0-9]{3,})\b/i;

export function normalizeCouponCode(raw: string): string {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get('code') || url.searchParams.get('coupon') || url.searchParams.get('coupon_code');
    if (fromQuery) return normalizeCouponCode(fromQuery);
  } catch {
    // 쿠폰 코드 또는 일반 텍스트
  }
  const matched = text.toUpperCase().match(ISSUED_CODE);
  return (matched?.[1] || text).trim().toUpperCase();
}

export function isIssuedCouponCode(code: string): boolean {
  return /^(GYON|GGON)[-A-Z0-9]{3,}$/i.test(String(code ?? '').trim());
}
