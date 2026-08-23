import type { QrScanRecord } from '../types/home';

/** 지자체 매칭 % 공식. 스캔 할인·정산 요청액에는 쓰지 않는다. */
export function matchingAmountWon(params: {
  maxDiscountAmount: number;
  govRate: number;
  qrCount: number;
}) {
  const perUse = Math.max(0, Math.round((params.maxDiscountAmount * params.govRate) / 100));
  return { perUse, total: perUse * Math.max(0, params.qrCount) };
}

/** 쿠폰 스캔 시 보여 준 할인액. 정산 매칭 금액과 동일해야 한다. */
export function couponDiscountWon(input: {
  discountAmount?: number | null;
  amountWon?: number | null;
  maxDiscountAmount?: number | null;
  totalDiscountRate?: number | null;
}) {
  const scanned = Number(input.discountAmount ?? input.amountWon ?? 0);
  if (scanned > 0) return Math.round(scanned);
  const cap = Number(input.maxDiscountAmount ?? 0);
  if (cap > 0) return Math.round(cap);
  const rate = Number(input.totalDiscountRate ?? 0);
  if (rate > 0) return Math.round((rate / 10) * 3000);
  return 3000;
}

export function settlementFromScans(
  scans: Array<{ amountWon?: number }>,
  fallbackPerUse = 0,
) {
  const rows = scans ?? [];
  const amounts = rows.map((row) => couponDiscountWon({
    amountWon: row.amountWon,
    maxDiscountAmount: fallbackPerUse,
  }));
  const total = amounts.reduce((sum, value) => sum + value, 0);
  const perUse = amounts.length ? amounts[amounts.length - 1] : fallbackPerUse;
  return { count: rows.length, perUse, total };
}

export function mergeQrScans(...groups: Array<QrScanRecord[] | undefined>): QrScanRecord[] {
  const merged: QrScanRecord[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const scan of group ?? []) {
      const key = scan.code
        ? `code:${scan.code.toUpperCase()}`
        : `at:${scan.at}:${scan.amountWon}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({
        ...scan,
        amountWon: couponDiscountWon(scan),
      });
    }
  }
  return merged.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}
