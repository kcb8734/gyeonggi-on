export interface OfficialScanRow {
  at: string;
  title: string;
  amountWon: number;
  qrId: string;
}

export interface OfficialDocumentInput {
  docNumber: string;
  issuedAt: string;
  merchantName: string;
  businessNumber: string;
  address: string;
  tel: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  municipalityName: string;
  festivalTitle: string;
  receiver: string;
  referDept: string;
  scans: OfficialScanRow[];
  totalCount: number;
  totalAmount: number;
}

export function nextDocNumber(seq: number, now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `GON-${y}${m}-${String(seq).padStart(4, '0')}`;
}

export function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatKoDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function buildOfficialDocumentHtml(input: OfficialDocumentInput): string {
  const rows = input.scans.length
    ? input.scans.map((scan, index) => `
        <tr>
          <td class="c">${index + 1}</td>
          <td>${escapeHtml(formatKoDateTime(scan.at))}</td>
          <td>${escapeHtml(scan.title)}</td>
          <td class="r">${scan.amountWon.toLocaleString('ko-KR')}</td>
          <td>${escapeHtml(scan.qrId)}</td>
        </tr>`).join('')
    : '<tr><td class="c" colspan="5">스캔된 미정산 쿠폰이 없습니다.</td></tr>';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.docNumber)} 정산 공문</title>
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
    .sign { margin-top:24px; display:flex; justify-content:flex-end; gap:24px; }
    .sign box { width:120px; height:80px; border:1px solid #111; text-align:center; padding-top:8px; font-size:11px; }
  </style>
</head>
<body>
  <div class="doc">
    <div class="head">
      <div>
        <div>on&amp;on 온앤온</div>
        <div class="org">경기온 모바일 쿠폰 정산 공문</div>
        <div>시행 · 지자체 제출용</div>
      </div>
      <div class="seal">온앤온<br/>직인</div>
    </div>
    <h1>경기온 모바일 쿠폰 정산 청구의 건</h1>
    <table>
      <tr><th>문서번호</th><td>${escapeHtml(input.docNumber)}</td></tr>
      <tr><th>시행일자</th><td>${escapeHtml(formatKoDateTime(input.issuedAt))}</td></tr>
      <tr><th>수신</th><td>${escapeHtml(input.receiver || (input.municipalityName + '장'))}</td></tr>
      <tr><th>참조</th><td>${escapeHtml(input.referDept || '관광과 · 소상공인 담당부서')}</td></tr>
      <tr><th>발신</th><td>온앤온(on&amp;on) 쿠폰 정산 담당</td></tr>
    </table>
    <p>1. 관련: 온앤온 지자체 1:1 매칭 쿠폰 운영 기준<br/>
    2. 아래 가맹점에서 사용한 모바일 쿠폰 QR 스캔 내역을 붙임과 같이 통보하고 정산금을 청구합니다.</p>
    <table>
      <tr><th>가맹점</th><td>${escapeHtml(input.merchantName)}</td></tr>
      <tr><th>사업자등록번호</th><td>${escapeHtml(input.businessNumber || '-')}</td></tr>
      <tr><th>소재지</th><td>${escapeHtml(input.address || '-')}</td></tr>
      <tr><th>연락처</th><td>${escapeHtml(input.tel || '-')}</td></tr>
      <tr><th>연계 축제</th><td>${escapeHtml(input.festivalTitle || '-')}</td></tr>
      <tr><th>지자체</th><td>${escapeHtml(input.municipalityName || '-')}</td></tr>
      <tr><th>입금 은행</th><td>${escapeHtml(input.bankName || '-')}</td></tr>
      <tr><th>계좌번호</th><td>${escapeHtml(input.bankAccount || '-')}</td></tr>
      <tr><th>예금주</th><td>${escapeHtml(input.bankHolder || '-')}</td></tr>
      <tr><th>총 정산 건수</th><td>${input.totalCount.toLocaleString('ko-KR')}건</td></tr>
      <tr><th>총 정산 금액</th><td class="sum">${input.totalAmount.toLocaleString('ko-KR')}원</td></tr>
    </table>
    <p><strong>붙임. QR 스캔 상세 내역</strong></p>
    <table class="data">
      <thead><tr><th>연번</th><th>스캔 시각</th><th>쿠폰명</th><th>할인금액</th><th>QR ID</th></tr></thead>
      <tbody>${rows}
        <tr class="sum"><td class="c" colspan="3">합계</td><td class="r">${input.totalAmount.toLocaleString('ko-KR')}</td><td></td></tr>
      </tbody>
    </table>
    <p>위와 같이 정산을 청구하오니 업무에 참고하여 주시기 바랍니다. 끝.</p>
    <div class="end">${escapeHtml(formatKoDateTime(input.issuedAt))}<br/>온앤온 쿠폰 정산 담당</div>
    <div class="sign">
      <div class="seal" style="width:90px;height:90px">직인란</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildOfficialPdfText(input: OfficialDocumentInput): string {
  const lines = [
    'On&On / Gyeonggi-On Official Settlement Request',
    `Doc: ${input.docNumber}`,
    `To: ${input.receiver || input.municipalityName}`,
    `Merchant: ${input.merchantName}`,
    `Count: ${input.totalCount}`,
    `Amount: ${input.totalAmount} KRW`,
    `Bank: ${input.bankName} ${input.bankAccount} ${input.bankHolder}`,
    '',
    'QR scans',
    ...input.scans.map((scan, i) => `${i + 1}. ${scan.at} ${scan.title} ${scan.amountWon} ${scan.qrId}`),
  ];
  return lines.join('\n');
}

export function buildSimplePdf(text: string): Buffer {
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const lines = escaped.split('\n');
  const content = lines.map((line, i) => `BT /F1 11 Tf 40 ${780 - i * 16} Td (${line}) Tj ET`).join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  let offset = 9;
  const offsets = [0];
  const body = objects.map((obj) => {
    offsets.push(offset);
    const chunk = obj + '\n';
    offset += Buffer.byteLength(chunk);
    return chunk;
  }).join('');
  const xref = `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, '0')} 00000 n `).join('\n')}\n`;
  const pdf = `%PDF-1.4\n${body}${xref}trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}
