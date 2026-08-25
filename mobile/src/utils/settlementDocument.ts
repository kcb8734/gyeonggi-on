import { Linking, Platform } from 'react-native';
import type { HomePromotion, QrScanRecord } from '../types/home';
import { DEFAULT_FESTIVAL_MANAGER_EMAIL } from '../stores/managerStore';
import { formatKoDate, formatKoDateTime } from './festivalSchedule';
import { couponDiscountWon, settlementFromScans } from './settlementAmounts';

export interface SettlementDocumentInput {
  promo: HomePromotion;
  scans: QrScanRecord[];
  amountWon: number;
  documentNo: string;
  issuedAt: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scansOf(promo: HomePromotion): QrScanRecord[] {
  if (promo.qrScans?.length) {
    return promo.qrScans.map((scan) => ({
      ...scan,
      amountWon: couponDiscountWon({
        amountWon: scan.amountWon,
        maxDiscountAmount: promo.maxDiscountAmount,
      }),
    }));
  }
  const count = promo.qrConfirmCount ?? 0;
  if (!count) return [];
  const perUse = couponDiscountWon({
    amountWon: promo.settlementAmount && count ? Math.round(promo.settlementAmount / count) : 0,
    maxDiscountAmount: promo.maxDiscountAmount,
  });
  return Array.from({ length: count }, () => ({
    at: promo.lastQrAt ?? new Date().toISOString(),
    amountWon: perUse,
  }));
}

export function buildSettlementInput(promo: HomePromotion): SettlementDocumentInput {
  const scans = scansOf(promo);
  const scanned = settlementFromScans(scans, couponDiscountWon({ maxDiscountAmount: promo.maxDiscountAmount }));
  const amountWon = scanned.total || promo.settlementAmount || 0;
  const issuedAt = promo.settledAt ?? new Date().toISOString();
  const stamp = issuedAt.slice(0, 10).replace(/-/g, '');
  const suffix = promo.id ? promo.id.slice(-4).toUpperCase() : 'SCAN';
  const documentNo = `ONON-정산-${stamp}-${suffix}`;
  return { promo, scans, amountWon, documentNo, issuedAt };
}

export function resolveSettlementEmail(promo: HomePromotion, fallback?: string) {
  return (promo.managerEmail || fallback || DEFAULT_FESTIVAL_MANAGER_EMAIL).trim();
}

export function buildOfficialDocumentHtml(input: SettlementDocumentInput): string {
  const { promo, scans, amountWon, documentNo, issuedAt } = input;
  const rows = scans.length
    ? scans.map((scan, index) => `
        <tr>
          <td class="c">${index + 1}</td>
          <td>${escapeHtml(formatKoDateTime(scan.at))}</td>
          <td>${escapeHtml(scan.title || scan.code || '모바일 쿠폰')}</td>
          <td class="r">${scan.amountWon.toLocaleString('ko-KR')}원</td>
        </tr>`).join('')
    : `<tr><td class="c" colspan="4">QR 스캔 내역이 없습니다.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentNo)} 정산 공문</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; color: #111; margin: 0; }
    .doc { max-width: 720px; margin: 0 auto; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 10px; }
    .brand { font-size: 13px; letter-spacing: 2px; font-weight: 800; }
    .org { font-size: 22px; font-weight: 900; margin-top: 4px; }
    .seal { width: 72px; height: 72px; border: 2px solid #b91c1c; border-radius: 50%; color: #b91c1c; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; text-align: center; line-height: 1.3; }
    h1 { font-size: 20px; text-align: center; margin: 22px 0 18px; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .meta th, .meta td { border: 1px solid #111; padding: 7px 8px; font-size: 12px; }
    .meta th { width: 22%; background: #f3f4f6; text-align: left; }
    p { font-size: 13px; line-height: 1.7; }
    table.data { width: 100%; border-collapse: collapse; margin: 10px 0 16px; }
    table.data th, table.data td { border: 1px solid #111; padding: 7px 8px; font-size: 12px; }
    table.data th { background: #111; color: #fff; }
    table.data { page-break-inside: auto; }
    table.data tr { page-break-inside: avoid; }
    table.data thead { display: table-header-group; }
    table.data tfoot { display: none; }
    .c { text-align: center; }
    .r { text-align: right; }
    .sum { font-weight: 800; }
    .end { text-align: right; margin-top: 28px; font-size: 13px; }
    .foot { margin-top: 36px; font-size: 11px; color: #4b5563; border-top: 1px solid #d1d5db; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="doc">
    <div class="head">
      <div>
        <div class="brand">on&amp;on+</div>
        <div class="org">온앤온+ 지역축제 상생쿠폰</div>
        <div>정산 공문 (시행)</div>
      </div>
      <div class="seal">온앤온+<br/>직인</div>
    </div>
    <h1>지역축제 연계 상생쿠폰 정산 요청</h1>
    <table class="meta">
      <tr><th>문서번호</th><td>${escapeHtml(documentNo)}</td></tr>
      <tr><th>시행일자</th><td>${escapeHtml(formatKoDate(issuedAt))}</td></tr>
      <tr><th>발신</th><td>온앤온+(on&amp;on+) 쿠폰 정산 담당</td></tr>
      <tr><th>수신</th><td>${escapeHtml(promo.managerEmail ?? '지자체 축제 담당자')}</td></tr>
      <tr><th>제목</th><td>${escapeHtml(promo.festival_title ?? '연계 축제')} 종료에 따른 매칭 쿠폰 일괄 정산 요청</td></tr>
    </table>
    <p>
      1. 관련: 온앤온+ 지자체 1:1 매칭 쿠폰 운영 기준<br/>
      2. 아래 상가의 행사 기간이 종료되어, 현장에서 확인한 쿠폰 QR 촬영 일시와 정산금액을 붙임과 같이 통보하고 일괄 정산을 요청합니다.
    </p>
    <table class="meta">
      <tr><th>상가명</th><td>${escapeHtml(promo.business_name ?? promo.title)}</td></tr>
      <tr><th>사업자등록번호</th><td>${escapeHtml(promo.businessNumber || '-')}</td></tr>
      <tr><th>소재지</th><td>${escapeHtml(promo.address || '-')}</td></tr>
      <tr><th>연락처</th><td>${escapeHtml(promo.tel || '-')}</td></tr>
      <tr><th>연계 축제</th><td>${escapeHtml(promo.festival_title || '-')} (${escapeHtml(promo.festivalStartDate || '-')} ~ ${escapeHtml(promo.festivalEndDate || '-')})</td></tr>
      <tr><th>지자체</th><td>${escapeHtml(promo.municipality_name || '-')}</td></tr>
      <tr><th>입금 은행</th><td>${escapeHtml(promo.bankName || '-')}</td></tr>
      <tr><th>계좌번호</th><td>${escapeHtml(promo.bankAccount || '-')}</td></tr>
      <tr><th>예금주</th><td>${escapeHtml(promo.bankHolder || '-')}</td></tr>
      <tr><th>QR 확인 건수</th><td>${(scans.length || promo.qrConfirmCount || 0).toLocaleString('ko-KR')}건</td></tr>
      <tr><th>정산 요청액</th><td class="sum">${amountWon.toLocaleString('ko-KR')}원</td></tr>
    </table>
    <p><strong>붙임. QR 스캔 일시 및 할인·정산금액</strong></p>
    <table class="data">
      <thead><tr><th class="c">연번</th><th>QR 스캔 일시</th><th>쿠폰</th><th class="r">할인·정산금액</th></tr></thead>
      <tbody>
        ${rows}
        <tr class="sum">
          <td class="c" colspan="3">합계</td>
          <td class="r">${amountWon.toLocaleString('ko-KR')}원</td>
        </tr>
      </tbody>
    </table>
    <p>위와 같이 행사 종료 후 일괄 정산을 요청하오니 업무에 참고하여 주시기 바랍니다. 끝.</p>
    <div class="end">${escapeHtml(formatKoDate(issuedAt))}<br/>온앤온+ 쿠폰 정산 담당</div>
    <div class="foot">본 공문은 온앤온+ 앱에서 생성된 정산 문서입니다. 인쇄 대화상자에서 PDF로 저장할 수 있습니다.</div>
  </div>
</body>
</html>`;
}

function downloadBlob(filename: string, data: BlobPart, mime: string) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

function escapePdf(text: string) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildSettlementPdfBytes(input: SettlementDocumentInput): Uint8Array {
  const lines = [
    'On&On+ Official Settlement Form',
    `Doc: ${input.documentNo}`,
    `Merchant: ${input.promo.business_name ?? input.promo.title}`,
    `Festival: ${input.promo.festival_title ?? '-'}`,
    `Bank: ${input.promo.bankName ?? '-'} ${input.promo.bankAccount ?? ''}`,
    `Count: ${input.scans.length}`,
    `Total: ${input.amountWon} KRW`,
    '',
    'QR scans (discount = settlement)',
    ...input.scans.map((scan, index) => `${index + 1}. ${scan.at} ${scan.title ?? scan.code ?? ''} ${scan.amountWon} KRW`),
  ];
  const content = lines
    .map((line, index) => `BT /F1 11 Tf 40 ${800 - index * 16} Td (${escapePdf(line)}) Tj ET`)
    .join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${new TextEncoder().encode(content).length} >> stream\n${content}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  let offset = 9;
  const offsets = [0];
  const body = objects.map((obj) => {
    offsets.push(offset);
    const chunk = `${obj}\n`;
    offset += new TextEncoder().encode(chunk).length;
    return chunk;
  }).join('');
  const xref = `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, '0')} 00000 n `).join('\n')}\n`;
  const pdf = `%PDF-1.4\n${body}${xref}trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const raw = atob(dataUrl.split(',')[1] ?? '');
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function jpegPagesToPdf(pages: Array<{ width: number; height: number; jpeg: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const pushText = (text: string) => chunks.push(encoder.encode(text));
  pushText('%PDF-1.4\n');
  const offsets = [0];
  let offset = encoder.encode('%PDF-1.4\n').length;
  const writeObj = (text: string, binary?: Uint8Array) => {
    offsets.push(offset);
    const head = encoder.encode(text);
    chunks.push(head);
    offset += head.length;
    if (binary) {
      chunks.push(binary);
      offset += binary.length;
    }
  };
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  writeObj('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
  writeObj(`2 0 obj << /Type /Pages /Kids [${kids}] /Count ${pages.length} >> endobj\n`);
  pages.forEach((page, i) => {
    const pageObj = 3 + i * 3;
    const imgObj = pageObj + 1;
    const contentObj = pageObj + 2;
    const content = `q 595 0 0 842 0 0 cm /Im${i} Do Q`;
    writeObj(`${pageObj} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${i} ${imgObj} 0 R >> >> /Contents ${contentObj} 0 R >> endobj\n`);
    writeObj(`${imgObj} 0 obj << /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >> stream\n`, page.jpeg);
    writeObj('\nendstream endobj\n');
    writeObj(`${contentObj} 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`);
  });
  const xrefStart = offset;
  const xrefLines = [`xref\n0 ${offsets.length}\n0000000000 65535 f \n`];
  for (let i = 1; i < offsets.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushText(xrefLines.join(''));
  pushText(`trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

function drawKoreanFormPages(input: SettlementDocumentInput): Array<{ width: number; height: number; jpeg: Uint8Array }> {
  if (typeof document === 'undefined') return [];
  const W = 1190;
  const H = 1684;
  const pages: Array<{ width: number; height: number; jpeg: Uint8Array }> = [];
  const rowsPerPage = 18;
  const pageCount = Math.max(1, Math.ceil((input.scans.length || 1) / rowsPerPage));

  for (let page = 0; page < pageCount; page += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;

    const text = (value: string, x: number, y: number, size = 22, align: CanvasTextAlign = 'left', weight = '700') => {
      ctx.font = `${weight} ${size}px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif`;
      ctx.textAlign = align;
      ctx.fillText(value, x, y);
    };
    const box = (x: number, y: number, w: number, h: number) => ctx.strokeRect(x, y, w, h);

    text('on&on+ 온앤온+', 56, 70, 20);
    text('지역축제 상생쿠폰 정산 공문', 56, 112, 36);
    ctx.beginPath();
    ctx.arc(1080, 90, 52, 0, Math.PI * 2);
    ctx.strokeStyle = '#b91c1c';
    ctx.stroke();
    ctx.fillStyle = '#b91c1c';
    text('온앤온+ 직인', 1080, 96, 16, 'center');
    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#111111';
    text('지역축제 연계 상생쿠폰 정산 요청', W / 2, 190, 30, 'center', '900');

    const meta = [
      ['문서번호', input.documentNo],
      ['시행일자', formatKoDate(input.issuedAt)],
      ['발신', '온앤온+(on&on+) 쿠폰 정산 담당'],
      ['수신', input.promo.managerEmail ?? '지자체 축제 담당자'],
      ['상가명', input.promo.business_name ?? input.promo.title],
      ['사업자등록번호', input.promo.businessNumber || '-'],
      ['연계 축제', input.promo.festival_title || '-'],
      ['입금 계좌', `${input.promo.bankName ?? '-'} ${input.promo.bankAccount ?? ''} ${input.promo.bankHolder ?? ''}`.trim()],
      ['QR 확인 건수', `${input.scans.length.toLocaleString('ko-KR')}건`],
      ['정산 요청액', `${input.amountWon.toLocaleString('ko-KR')}원`],
    ];
    let y = 220;
    meta.forEach(([label, value]) => {
      box(56, y, 220, 36);
      box(276, y, 858, 36);
      text(label, 68, y + 25, 18);
      text(value, 290, y + 25, 18, 'left', '600');
      y += 36;
    });

    y += 24;
    text('붙임. QR 스캔 일시 및 할인·정산금액', 56, y, 20);
    y += 16;
    const headers = ['연번', 'QR 스캔 일시', '쿠폰', '할인·정산금액'];
    const cols = [80, 320, 360, 318];
    let x = 56;
    headers.forEach((header, i) => {
      ctx.fillStyle = '#111111';
      ctx.fillRect(x, y, cols[i], 36);
      ctx.fillStyle = '#ffffff';
      text(header, x + cols[i] / 2, y + 25, 16, 'center');
      x += cols[i];
    });
    ctx.fillStyle = '#111111';
    y += 36;
    const slice = input.scans.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    (slice.length ? slice : [{ at: '-', amountWon: 0, title: '내역 없음' }]).forEach((scan, index) => {
      const values = [
        String(page * rowsPerPage + index + 1),
        formatKoDateTime(scan.at),
        scan.title || scan.code || '모바일 쿠폰',
        `${scan.amountWon.toLocaleString('ko-KR')}원`,
      ];
      x = 56;
      values.forEach((value, i) => {
        box(x, y, cols[i], 34);
        text(value, i === 3 ? x + cols[i] - 12 : x + 10, y + 24, 16, i === 3 ? 'right' : 'left', '600');
        x += cols[i];
      });
      y += 34;
    });
    if (page === pageCount - 1) {
      box(56, y, 760, 36);
      box(816, y, 318, 36);
      text('합계', 436, y + 25, 18, 'center');
      text(`${input.amountWon.toLocaleString('ko-KR')}원`, 1122, y + 25, 18, 'right');
      y += 70;
      text('위와 같이 행사 종료 후 일괄 정산을 요청합니다. 끝.', 56, y, 18, 'left', '600');
      text(formatKoDate(input.issuedAt), 1134, y + 40, 18, 'right');
      text('온앤온+ 쿠폰 정산 담당', 1134, y + 70, 18, 'right');
    }
    pages.push({
      width: W,
      height: H,
      jpeg: dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.86)),
    });
  }
  return pages;
}

export function buildKoreanSettlementPdf(input: SettlementDocumentInput): Uint8Array | null {
  try {
    const pages = drawKoreanFormPages(input);
    if (!pages.length) return null;
    return jpegPagesToPdf(pages);
  } catch {
    return null;
  }
}

function printOfficialForm(html: string) {
  if (typeof document === 'undefined') return;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 2000);
  }, 300);
}

export function downloadSettlementPdf(promo: HomePromotion): boolean {
  const input = buildSettlementInput(promo);
  const html = buildOfficialDocumentHtml(input);
  const stem = input.documentNo.replace(/\s+/g, '_');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const koreanPdf = buildKoreanSettlementPdf(input);
    downloadBlob(`${stem}.html`, html, 'text/html;charset=utf-8');
    downloadBlob(`${stem}.pdf`, (koreanPdf ?? buildSettlementPdfBytes(input)) as BlobPart, 'application/pdf');
    printOfficialForm(html);
    return true;
  }
  return false;
}

export async function openSettlementMailto(promo: HomePromotion): Promise<void> {
  const input = buildSettlementInput(promo);
  const to = resolveSettlementEmail(promo);
  if (!to) throw new Error('담당자 메일이 없습니다.');
  const subject = encodeURIComponent(`[온앤온+ 정산공문] ${promo.business_name ?? promo.title} ${input.documentNo}`);
  const body = encodeURIComponent(
    [
      '지자체 축제 담당자님께',
      '',
      '행사 종료에 따른 상생쿠폰 일괄 정산 공문을 송부합니다.',
      '',
      `문서번호: ${input.documentNo}`,
      `상가명: ${promo.business_name ?? promo.title}`,
      `사업자등록번호: ${promo.businessNumber ?? '-'}`,
      `소재지: ${promo.address ?? '-'}`,
      `연락처: ${promo.tel ?? '-'}`,
      `연계 축제: ${promo.festival_title ?? '-'}`,
      `축제 기간: ${promo.festivalStartDate ?? '-'} ~ ${promo.festivalEndDate ?? '-'}`,
      `입금 은행: ${promo.bankName ?? '-'}`,
      `계좌번호: ${promo.bankAccount ?? '-'}`,
      `예금주: ${promo.bankHolder ?? '-'}`,
      `QR 확인 건수: ${(input.scans.length || promo.qrConfirmCount || 0).toLocaleString('ko-KR')}건`,
      `정산 요청액: ${input.amountWon.toLocaleString('ko-KR')}원`,
      '',
      'QR 촬영 일시',
      ...(input.scans.length
        ? input.scans.map((scan, index) => `${index + 1}. ${formatKoDateTime(scan.at)} · ${scan.amountWon.toLocaleString('ko-KR')}원`)
        : ['내역 없음']),
      '',
      '공문서 PDF가 함께 내려받아졌습니다. 메일에 첨부해 주시기 바랍니다.',
      '온앤온+(on&on+)',
    ].join('\n'),
  );
  await Linking.openURL(`mailto:${to}?subject=${subject}&body=${body}`);
}

export async function sendSettlementDocumentMail(promo: HomePromotion): Promise<void> {
  downloadSettlementPdf({ ...promo, managerEmail: resolveSettlementEmail(promo) });
  await openSettlementMailto(promo);
}
