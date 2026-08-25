import { Platform } from 'react-native';
import { REGION_LABEL } from '../constants/regions';

export type FeedRewardStatus = 'PENDING' | 'PAID';

export interface FeedRewardRow {
  id: string;
  userName: string;
  festival: string;
  city: string;
  regionalZone: string;
  regionLabel: string;
  amountWon: number;
  points: number;
  postedAt: string;
  status: FeedRewardStatus;
}

export interface FeedRewardDocumentInput {
  regionalZone: string;
  regionLabel: string;
  city: string;
  receiver: string;
  documentNo: string;
  issuedAt: string;
  rows: FeedRewardRow[];
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatKoDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function mayorTitle(city: string): string {
  const text = String(city || '');
  if (text.includes('구')) return `${text}청장`;
  if (text.includes('군')) return `${text.replace(/군$/, '군수')}`;
  if (text.includes('시')) return `${text.replace(/시$/, '시장')}`;
  return `${text}장`;
}

export function buildFeedRewardInput(rows: FeedRewardRow[], city?: string): FeedRewardDocumentInput {
  const first = rows[0];
  const zone = first?.regionalZone || 'GYEONGGI';
  const regionLabel = first?.regionLabel || REGION_LABEL[zone] || '경기온';
  const targetCity = city || first?.city || regionLabel;
  const issuedAt = new Date().toISOString();
  const stamp = issuedAt.slice(0, 7).replace('-', '');
  const suffix = (targetCity || 'ZONE').replace(/\s+/g, '').slice(-4);
  return {
    regionalZone: zone,
    regionLabel,
    city: targetCity,
    receiver: mayorTitle(targetCity),
    documentNo: `GFR-${stamp}-${suffix}`,
    issuedAt,
    rows,
  };
}

export function buildFeedRewardHtml(input: FeedRewardDocumentInput): string {
  const total = input.rows.reduce((sum, row) => sum + Number(row.amountWon || 0), 0);
  const paid = input.rows.filter((row) => row.status === 'PAID').length;
  const rows = input.rows.length
    ? input.rows.map((row, index) => `
        <tr>
          <td class="c">${index + 1}</td>
          <td>${escapeHtml(row.userName)}</td>
          <td>${escapeHtml(row.festival)}</td>
          <td class="c">${escapeHtml(row.postedAt)}</td>
          <td class="r">${Number(row.amountWon).toLocaleString('ko-KR')}원</td>
          <td class="c">${row.status === 'PAID' ? '지급' : '대기'}</td>
        </tr>`).join('')
    : '<tr><td class="c" colspan="6">지급 내역이 없습니다.</td></tr>';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.documentNo)} 피드 지역화폐 정산 공문</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif; color:#111; margin:0; }
    .doc { max-width: 720px; margin: 0 auto; }
    .head { display:flex; justify-content:space-between; border-bottom:3px solid #111; padding-bottom:10px; }
    .org { font-size:22px; font-weight:900; }
    .seal { width:76px; height:76px; border:2px solid #b91c1c; border-radius:50%; color:#b91c1c; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; text-align:center; }
    h1 { text-align:center; font-size:20px; }
    table { width:100%; border-collapse:collapse; margin:10px 0 16px; }
    th, td { border:1px solid #111; padding:7px 8px; font-size:12px; }
    th { background:#f3f4f6; text-align:left; }
    table.data th { background:#111; color:#fff; text-align:center; }
    .c { text-align:center; } .r { text-align:right; } .sum { font-weight:800; }
    .end { text-align:right; margin-top:28px; }
  </style>
</head>
<body>
  <div class="doc">
    <div class="head">
      <div>
        <div>on&amp;on+ 온앤온+</div>
        <div class="org">${escapeHtml(input.regionLabel)} 피드 지역화폐 정산 공문</div>
        <div>시행 · 지자체 제출용</div>
      </div>
      <div class="seal">온앤온+<br/>직인</div>
    </div>
    <h1>축제 현장 참여 피드 지역화폐 지급 정산의 건</h1>
    <table>
      <tr><th>문서번호</th><td>${escapeHtml(input.documentNo)}</td></tr>
      <tr><th>시행일자</th><td>${escapeHtml(formatKoDate(input.issuedAt))}</td></tr>
      <tr><th>수신</th><td>${escapeHtml(input.receiver)}</td></tr>
      <tr><th>참조</th><td>관광과 · 지역화폐 담당부서</td></tr>
      <tr><th>발신</th><td>온앤온+(on&amp;on+) 피드 정산 담당</td></tr>
      <tr><th>권역</th><td>${escapeHtml(input.regionLabel)} (${escapeHtml(input.regionalZone)})</td></tr>
      <tr><th>대상 지자체</th><td>${escapeHtml(input.city)}</td></tr>
      <tr><th>지급 건수</th><td>${input.rows.length.toLocaleString('ko-KR')}건 (지급 ${paid} / 대기 ${input.rows.length - paid})</td></tr>
      <tr><th>정산 금액</th><td class="sum">${total.toLocaleString('ko-KR')}원</td></tr>
    </table>
    <p>1. 관련: 온앤온+ 축제 현장 참여 피드 지역화폐 지급 운영 기준<br/>
    2. 해당 지자체 축제에 참여 피드를 게시한 이용자에게 지역화폐를 지급한 내역을 붙임과 같이 통보하고 정산을 보고합니다.</p>
    <p><strong>붙임. 피드 지역화폐 지급 내역</strong></p>
    <table class="data">
      <thead><tr><th>연번</th><th>이용자</th><th>축제</th><th>게시일</th><th>지급액</th><th>상태</th></tr></thead>
      <tbody>${rows}
        <tr class="sum"><td class="c" colspan="4">합계</td><td class="r">${total.toLocaleString('ko-KR')}원</td><td></td></tr>
      </tbody>
    </table>
    <p>위와 같이 내역과 정산을 보고하오니 업무에 참고하여 주시기 바랍니다. 끝.</p>
    <div class="end">${escapeHtml(formatKoDate(input.issuedAt))}<br/>온앤온+ 피드 정산 담당</div>
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

function buildSimplePdf(input: FeedRewardDocumentInput): Uint8Array {
  const total = input.rows.reduce((sum, row) => sum + Number(row.amountWon || 0), 0);
  const lines = [
    'On&On+ Festival Feed Local-Currency Settlement',
    `Doc: ${input.documentNo}`,
    `To: ${input.receiver}`,
    `Zone: ${input.regionLabel} ${input.regionalZone}`,
    `City: ${input.city}`,
    `Count: ${input.rows.length}`,
    `Total: ${total} KRW`,
    '',
    'Feed reward rows',
    ...input.rows.map((row, index) => `${index + 1}. ${row.userName} ${row.festival} ${row.amountWon} ${row.status}`),
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

function printOfficialForm(html: string) {
  if (typeof document === 'undefined') return;
  const iframe = document.createElement('iframe');
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

export function downloadFeedRewardPdf(rows: FeedRewardRow[], city?: string): boolean {
  if (!rows.length) return false;
  const input = buildFeedRewardInput(rows, city);
  const html = buildFeedRewardHtml(input);
  const stem = input.documentNo.replace(/\s+/g, '_');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    downloadBlob(`${stem}.html`, html, 'text/html;charset=utf-8');
    downloadBlob(`${stem}.pdf`, buildSimplePdf(input) as BlobPart, 'application/pdf');
    printOfficialForm(html);
    return true;
  }
  return false;
}
