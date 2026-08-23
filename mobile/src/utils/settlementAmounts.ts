export function matchingAmountWon(params: {
  maxDiscountAmount: number;
  govRate: number;
  qrCount: number;
}) {
  const perUse = Math.max(0, Math.round((params.maxDiscountAmount * params.govRate) / 100));
  return { perUse, total: perUse * Math.max(0, params.qrCount) };
}

export function settlementFromScans(scans: Array<{ amountWon?: number }>) {
  const rows = scans ?? [];
  const total = rows.reduce((sum, row) => sum + Math.max(0, Number(row.amountWon || 0)), 0);
  const perUse = rows.length ? Math.max(0, Number(rows[rows.length - 1]?.amountWon || 0)) : 0;
  return { count: rows.length, perUse, total };
}
