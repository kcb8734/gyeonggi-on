import { REGION_LABEL } from '../constants/regions';
import { dataUrlToBytes, jpegPagesToPdf } from './pdfJpeg';

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

function drawKoreanFeedPages(input: FeedRewardDocumentInput): Array<{ width: number; height: number; jpeg: Uint8Array }> {
  if (typeof document === 'undefined') return [];
  const W = 1190;
  const H = 1684;
  const rowsPerPage = 16;
  const pageCount = Math.max(1, Math.ceil((input.rows.length || 1) / rowsPerPage));
  const total = input.rows.reduce((sum, row) => sum + Number(row.amountWon || 0), 0);
  const paid = input.rows.filter((row) => row.status === 'PAID').length;
  const pages: Array<{ width: number; height: number; jpeg: Uint8Array }> = [];

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
    text(`${input.regionLabel} 피드 지역화폐 정산 공문`, 56, 112, 32);
    ctx.beginPath();
    ctx.arc(1080, 90, 52, 0, Math.PI * 2);
    ctx.strokeStyle = '#b91c1c';
    ctx.stroke();
    ctx.fillStyle = '#b91c1c';
    text('온앤온+ 직인', 1080, 96, 16, 'center');
    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#111111';
    text('축제 현장 참여 피드 지역화폐 지급 정산의 건', W / 2, 190, 28, 'center', '900');

    if (page === 0) {
      const meta = [
        ['문서번호', input.documentNo],
        ['시행일자', formatKoDate(input.issuedAt)],
        ['수신', input.receiver],
        ['참조', '관광과 · 지역화폐 담당부서'],
        ['발신', '온앤온+(on&on+) 피드 정산 담당'],
        ['권역', `${input.regionLabel} (${input.regionalZone})`],
        ['대상 지자체', input.city],
        ['지급 건수', `${input.rows.length.toLocaleString('ko-KR')}건 (지급 ${paid} / 대기 ${input.rows.length - paid})`],
        ['정산 금액', `${total.toLocaleString('ko-KR')}원`],
      ];
      let y = 220;
      meta.forEach(([label, value]) => {
        box(56, y, 220, 36);
        box(276, y, 858, 36);
        text(label, 68, y + 25, 18);
        text(value, 290, y + 25, 18, 'left', '600');
        y += 36;
      });
      y += 22;
      text('1. 관련: 온앤온+ 축제 현장 참여 피드 지역화폐 지급 운영 기준', 56, y, 18, 'left', '600');
      y += 28;
      text('2. 해당 지자체 축제 참여 피드 지급 내역을 붙임과 같이 통보하고 정산을 보고합니다.', 56, y, 18, 'left', '600');
      y += 36;
      text('붙임. 피드 지역화폐 지급 내역', 56, y, 20);
      y += 16;

      const headers = ['연번', '이용자', '축제', '게시일', '지급액', '상태'];
      const cols = [80, 160, 390, 160, 180, 108];
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
      const slice = input.rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
      slice.forEach((row, index) => {
        const values = [
          String(page * rowsPerPage + index + 1),
          row.userName,
          row.festival,
          row.postedAt,
          `${Number(row.amountWon).toLocaleString('ko-KR')}원`,
          row.status === 'PAID' ? '지급' : '대기',
        ];
        x = 56;
        values.forEach((value, i) => {
          box(x, y, cols[i], 34);
          text(value, i === 4 ? x + cols[i] - 12 : x + cols[i] / 2, y + 24, 15, i === 4 ? 'right' : 'center', '600');
          x += cols[i];
        });
        y += 34;
      });
      box(56, y, 790, 36);
      box(846, y, 288, 36);
      text('합계', 451, y + 25, 18, 'center');
      text(`${total.toLocaleString('ko-KR')}원`, 1118, y + 25, 18, 'right');
      y += 70;
      text('위와 같이 내역과 정산을 보고하오니 업무에 참고하여 주시기 바랍니다. 끝.', 56, y, 18, 'left', '600');
      text(formatKoDate(input.issuedAt), 1134, y + 40, 18, 'right');
      text('온앤온+ 피드 정산 담당', 1134, y + 70, 18, 'right');
    } else {
      let y = 220;
      text('붙임. 피드 지역화폐 지급 내역 (계속)', 56, y, 20);
      y += 16;
      const headers = ['연번', '이용자', '축제', '게시일', '지급액', '상태'];
      const cols = [80, 160, 390, 160, 180, 108];
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
      const slice = input.rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
      slice.forEach((row, index) => {
        const values = [
          String(page * rowsPerPage + index + 1),
          row.userName,
          row.festival,
          row.postedAt,
          `${Number(row.amountWon).toLocaleString('ko-KR')}원`,
          row.status === 'PAID' ? '지급' : '대기',
        ];
        x = 56;
        values.forEach((value, i) => {
          box(x, y, cols[i], 34);
          text(value, i === 4 ? x + cols[i] - 12 : x + cols[i] / 2, y + 24, 15, i === 4 ? 'right' : 'center', '600');
          x += cols[i];
        });
        y += 34;
      });
    }

    pages.push({
      width: W,
      height: H,
      jpeg: dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.92)),
    });
  }
  return pages;
}

export function buildKoreanFeedPdf(input: FeedRewardDocumentInput): Uint8Array | null {
  try {
    const pages = drawKoreanFeedPages(input);
    if (!pages.length) return null;
    return jpegPagesToPdf(pages);
  } catch {
    return null;
  }
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
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const koreanPdf = buildKoreanFeedPdf(input);
    downloadBlob(`${stem}.html`, `\uFEFF${html}`, 'text/html;charset=utf-8');
    if (koreanPdf) {
      downloadBlob(`${stem}.pdf`, koreanPdf as BlobPart, 'application/pdf');
    }
    printOfficialForm(html);
    return true;
  }
  return false;
}
