import { tryQuery } from '../db/pool';
import { AppError } from '../utils/errors';
import { sendResendEmail } from './emailAuthService';
import { listUnsettledUsedCoupons, type CouponScanRecord } from './couponScanService';
import {
  DEV_MERCHANT_ID,
  memoryMerchant,
  memoryMunicipality,
  memorySettlements,
  memoryCoupons,
} from './inMemoryPlatform';
import {
  buildOfficialDocumentHtml,
  buildOfficialPdfText,
  buildSimplePdf,
  nextDocNumber,
  type OfficialDocumentInput,
} from './officialDocument';

function periodBounds(kind: 'week' | 'month') {
  const now = new Date();
  if (kind === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
}

function inPeriod(iso: string | null, start: Date, end: Date) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function sum(items: CouponScanRecord[]) {
  return items.reduce((acc, item) => acc + Number(item.discountAmount || 0), 0);
}

async function allocateDocNumber() {
  const stamp = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const db = await tryQuery(
    `SELECT COUNT(*)::int AS n FROM settlements WHERE doc_number LIKE $1`,
    [`GON-${stamp}-%`],
  );
  const dbCount = Number(db?.rows[0]?.n ?? 0);
  const memoryCount = memorySettlements.filter((item) => item.docNumber.includes(`GON-${stamp}-`)).length;
  return nextDocNumber(dbCount + memoryCount + 1);
}

async function loadMerchant(merchantId?: string, items: CouponScanRecord[] = []) {
  const id = merchantId ?? items[0]?.merchantId ?? DEV_MERCHANT_ID;
  const result = await tryQuery(
    `SELECT id, business_name, address, business_number, municipality_id, bank_name, bank_account_number
     FROM merchants WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (result?.rows[0]) {
    const row = result.rows[0];
    return {
      id: String(row.id),
      name: String(row.business_name),
      ownerName: String(row.business_name),
      address: row.address ? String(row.address) : '',
      phone: '',
      businessNumber: row.business_number ? String(row.business_number) : '',
      municipalityId: row.municipality_id ? String(row.municipality_id) : null,
      bankName: row.bank_name ? String(row.bank_name) : '기업은행',
      accountNumber: row.bank_account_number ? String(row.bank_account_number) : '123-456789-01-011',
      accountHolder: String(row.business_name),
    };
  }
  return { ...memoryMerchant(), id };
}

async function loadMunicipality(municipalityId: string | null, items: CouponScanRecord[]) {
  const id = municipalityId ?? items[0]?.municipalityId;
  if (id) {
    const result = await tryQuery(
      `SELECT id, name, mayor_name, department, settlement_email FROM municipalities WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (result?.rows[0]) {
      const row = result.rows[0];
      return {
        id: String(row.id),
        name: String(row.name),
        mayorName: row.mayor_name ? String(row.mayor_name) : `${row.name}장`,
        department: row.department ? String(row.department) : '관광과',
        settlementEmail: row.settlement_email ? String(row.settlement_email) : 'pizon8113@gmail.com',
      };
    }
  }
  return memoryMunicipality();
}

function toDocumentInput(
  docNumber: string,
  merchant: Awaited<ReturnType<typeof loadMerchant>>,
  municipality: Awaited<ReturnType<typeof loadMunicipality>>,
  items: CouponScanRecord[],
): OfficialDocumentInput {
  return {
    docNumber,
    issuedAt: new Date().toISOString(),
    merchantName: merchant.name,
    businessNumber: merchant.businessNumber,
    address: merchant.address,
    tel: merchant.phone,
    bankName: merchant.bankName,
    bankAccount: merchant.accountNumber,
    bankHolder: merchant.accountHolder,
    municipalityName: municipality.name,
    festivalTitle: '온앤온+ 모바일 쿠폰',
    receiver: municipality.mayorName,
    referDept: municipality.department,
    scans: items.map((item) => ({
      at: item.usedAt || new Date().toISOString(),
      title: item.title,
      amountWon: item.discountAmount,
      qrId: item.code,
    })),
    totalCount: items.length,
    totalAmount: sum(items),
  };
}

export async function getSettlementPreview(merchantId?: string) {
  const items = await listUnsettledUsedCoupons(merchantId);
  const week = periodBounds('week');
  const month = periodBounds('month');
  const weekItems = items.filter((item) => inPeriod(item.usedAt, week.start, week.end));
  const monthItems = items.filter((item) => inPeriod(item.usedAt, month.start, month.end));
  const merchant = await loadMerchant(merchantId, items);
  const municipality = await loadMunicipality(merchant.municipalityId, items);
  const docNumber = await allocateDocNumber();
  const payload = toDocumentInput(docNumber, merchant, municipality, items);
  return {
    week: { count: weekItems.length, amount: sum(weekItems) },
    month: { count: monthItems.length, amount: sum(monthItems) },
    pending: { count: items.length, amount: sum(items) },
    items,
    merchant,
    municipality,
    docNumber,
    html: buildOfficialDocumentHtml(payload),
    status: items.some((item) => item.settlementId) ? 'REQUESTED' : 'PENDING',
  };
}

export async function sendOfficialSettlement(input: {
  merchantId?: string;
  toEmail?: string;
}) {
  const preview = await getSettlementPreview(input.merchantId);
  if (!preview.items.length) {
    throw new AppError(400, '정산할 스캔 쿠폰이 없습니다.');
  }
  const payload = toDocumentInput(preview.docNumber, preview.merchant, preview.municipality, preview.items);
  const html = buildOfficialDocumentHtml(payload);
  const pdf = buildSimplePdf(buildOfficialPdfText(payload));
  const to = input.toEmail?.trim() || preview.municipality.settlementEmail;
  const subject = `[공문] 경기온 모바일 쿠폰 정산 청구의 건 - ${preview.merchant.name} (${preview.docNumber})`;
  const sent = await sendResendEmail({
    to,
    subject,
    html: `<p>수신: ${preview.municipality.mayorName}</p><p>첨부된 공문서로 모바일 쿠폰 정산을 청구합니다.</p><p>문서번호 ${preview.docNumber}</p>${html}`,
    attachments: [
      { filename: `${preview.docNumber}.html`, content: Buffer.from(html, 'utf8').toString('base64') },
      { filename: `${preview.docNumber}.pdf`, content: pdf.toString('base64') },
    ],
  });

  const settlementId = `settle-${Date.now()}`;
  const inserted = await tryQuery(
    `INSERT INTO settlements
      (merchant_id, municipality_id, total_count, total_amount, doc_number, status, pdf_url, requested_at)
     VALUES ($1,$2,$3,$4,$5,'REQUESTED',$6, NOW())
     RETURNING id, doc_number, status`,
    [
      preview.merchant.id,
      preview.municipality.id || null,
      preview.items.length,
      preview.pending.amount,
      preview.docNumber,
      `resend:${sent.id ?? 'sent'}`,
    ],
  );
  const id = String(inserted?.rows[0]?.id ?? settlementId);
  const couponIds = preview.items.filter((item) => item.source === 'coupons').map((item) => item.id);
  const userIds = preview.items.filter((item) => item.source === 'user_coupons').map((item) => item.id);
  if (couponIds.length) {
    await tryQuery(`UPDATE coupons SET settlement_id = $1 WHERE id = ANY($2::uuid[])`, [id, couponIds]);
  }
  if (userIds.length) {
    await tryQuery(`UPDATE user_coupons SET settlement_id = $1 WHERE id = ANY($2::uuid[])`, [id, userIds]);
  }

  memorySettlements.push({
    id,
    merchantId: preview.merchant.id,
    municipalityId: preview.municipality.id,
    totalCount: preview.items.length,
    totalAmount: preview.pending.amount,
    docNumber: preview.docNumber,
    status: 'REQUESTED',
    pdfUrl: `resend:${sent.id ?? 'sent'}`,
    requestedAt: new Date().toISOString(),
  });
  for (const item of preview.items) {
    const memory = memoryCoupons.find((row) => row.id === item.id || row.code === item.code);
    if (memory) memory.settlementId = id;
  }

  return {
    ok: true,
    message: '정상적으로 공문서가 접수되었습니다.',
    settlementId: id,
    docNumber: preview.docNumber,
    status: 'REQUESTED' as const,
    emailId: sent.id,
    mocked: sent.mocked ?? false,
    to,
  };
}
