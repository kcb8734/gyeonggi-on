import {
  dedicatedCenterName,
  directorTitleFor,
  qrUrlForLocality,
  websiteForLocality,
  type CenterDirectorProfile,
  type CenterLocalityRow,
} from '../constants/centerDirectors';

export const CARD_MM = { width: 92, height: 52, photoW: 20, photoH: 25 };

export interface CenterCardModel {
  name: string;
  title: string;
  dedicatedCenter: string;
  photoUrl?: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  qrUrl: string;
  localityLabel: string;
  regionLabel: string;
}

export function buildCenterCardModel(row: CenterLocalityRow, director?: CenterDirectorProfile): CenterCardModel | null {
  const profile = director || row.director;
  if (!profile) return null;
  const website = profile.website || websiteForLocality(row.label);
  return {
    name: profile.name,
    title: profile.title || directorTitleFor(row.regionLabel, row.label),
    dedicatedCenter: dedicatedCenterName(row.region, row.label),
    photoUrl: profile.photoUrl,
    phone: profile.phone,
    email: profile.email,
    address: profile.address || `${row.regionLabel.replace(/온$/, '')} ${row.label}`,
    website,
    qrUrl: qrUrlForLocality(row.label),
    localityLabel: row.label,
    regionLabel: row.regionLabel,
  };
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function logoSvg(color: string) {
  return `<svg class="o-mark" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M 7.9 4.6 A 8.5 8.5 0 1 0 16.1 4.6" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="12" y1="1.8" x2="12" y2="9.4" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`;
}

function logoHtml() {
  return `<div class="logo" aria-label="on&amp;on+">
    ${logoSvg('#2F6FED')}<span class="n blue">n</span>
    <span class="amp">&amp;</span>
    ${logoSvg('#22A45A')}<span class="n green">n</span>
    <span class="plus">+</span>
  </div>`;
}

export function buildCenterCardHtml(model: CenterCardModel) {
  const photo = model.photoUrl
    ? `<img class="photo" src="${escapeHtml(model.photoUrl)}" alt="" />`
    : `<div class="photo ph">${escapeHtml(model.name.slice(0, 1))}</div>`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(model.qrUrl)}`;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>온앤온+ 공식 디지털 명함 - ${escapeHtml(model.name)}</title>
  <style>
    @page { size: 92mm 52mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body { background: #e5e7eb; font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; }
    .wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px; }
    .page {
      width: 92mm; height: 52mm; background: #fff;
      padding: 7.2mm 7.5mm 6.2mm 7.5mm;
      position: relative; overflow: hidden; page-break-after: always;
    }
    .logo { display: flex; align-items: flex-end; font-weight: 800; letter-spacing: -0.4px; }
    .o-mark { width: 5.6mm; height: 5.6mm; display: block; }
    .n { font-size: 13.5pt; line-height: 1; margin-left: 0.3mm; }
    .amp { color: #F97316; font-size: 12pt; margin: 0 1.4mm 0.4mm; }
    .plus { color: #F97316; font-size: 8pt; margin: 0 0 5.2mm 0.6mm; }
    .blue { color: #2F6FED; }
    .green { color: #22A45A; }
    .front-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 4mm; }
    .photo { width: 20mm; height: 25mm; object-fit: cover; border-radius: 3.2mm; background: #d1d5db; }
    .ph { display: flex; align-items: center; justify-content: center; font-size: 16pt; font-weight: 800; color: #6b7280; }
    .who { margin-top: 3.2mm; display: flex; align-items: baseline; gap: 2mm; }
    .name { font-size: 13.5pt; font-weight: 800; color: #111; letter-spacing: -0.4px; }
    .bar { color: #c5c5c5; font-weight: 400; }
    .title { font-size: 8.4pt; color: #6b7280; font-weight: 500; }
    .brand { margin-top: 1.6mm; font-size: 10pt; font-weight: 800; color: #111; }
    .center { margin-top: 1.1mm; font-size: 8.2pt; font-style: italic; font-weight: 600; color: #111; }
    .rule { margin-top: 2.4mm; border: 0; border-top: 0.25mm solid #d1d5db; }
    .grid { margin-top: 2mm; display: grid; grid-template-columns: 1.15fr 1fr; gap: 1.6mm 4mm; font-size: 6.6pt; color: #111; line-height: 1.45; }
    .k { font-weight: 800; }
    .back { display: flex; height: 100%; padding-top: 0; gap: 3mm; }
    .back-left { flex: 1; padding-top: 0; }
    .slogan { margin-top: 6mm; font-size: 11pt; font-weight: 800; color: #374151; line-height: 1.45; }
    .qr-col { width: 32mm; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .qr-col img { width: 24mm; height: 24mm; }
    .url { margin-top: 1.6mm; font-size: 6.4pt; color: #111; }
    @media print { body { background: #fff; } .wrap { padding: 0; gap: 0; } .page { box-shadow: none; } }
    @media screen and (max-width: 640px) {
      body { overflow: auto; }
      .wrap { padding: 12px; width: 100%; box-sizing: border-box; }
      .page {
        width: 100%;
        max-width: 100%;
        height: auto;
        min-height: 0;
        aspect-ratio: 92 / 52;
        padding: 8% 8.2% 7%;
      }
      .o-mark { width: 7vw; height: 7vw; max-width: 22px; max-height: 22px; }
      .n { font-size: 4.6vw; }
      .amp { font-size: 4.2vw; }
      .plus { font-size: 2.8vw; margin-bottom: 3.6vw; }
      .name { font-size: 4.8vw; }
      .title { font-size: 3vw; }
      .brand { font-size: 3.6vw; }
      .center { font-size: 3vw; }
      .grid { font-size: 2.6vw; }
      .slogan { font-size: 4vw; margin-top: 4vw; }
      .qr-col { width: 28vw; max-width: 120px; }
      .qr-col img { width: 22vw; height: 22vw; max-width: 96px; max-height: 96px; }
      .photo { width: 22%; height: auto; aspect-ratio: 20 / 25; }
    }
    @media screen and (max-width: 420px) {
      .page { aspect-ratio: auto; height: auto; }
      .back { flex-direction: column; }
      .qr-col { width: 100%; align-items: flex-start; }
      .who { flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <div class="wrap">
  <section class="page">
    <div class="front-top">
      ${logoHtml()}
      ${photo}
    </div>
    <div class="who">
      <span class="name">${escapeHtml(model.name)}</span>
      <span class="bar">|</span>
      <span class="title">${escapeHtml(model.title)}</span>
    </div>
    <div class="brand">온앤온 +</div>
    <div class="center">${escapeHtml(model.dedicatedCenter)}</div>
    <hr class="rule" />
    <div class="grid">
      <div><span class="k">M.</span> ${escapeHtml(model.phone)}</div>
      <div><span class="k">E.</span> ${escapeHtml(model.email)}</div>
      <div><span class="k">A.</span> ${escapeHtml(model.address)}</div>
      <div><span class="k">W.</span> ${escapeHtml(model.website)}</div>
    </div>
  </section>
  <section class="page">
    <div class="back">
      <div class="back-left">
        ${logoHtml()}
        <div class="slogan">지자체 축제와<br/>소상공인 상생을 잇는<br/>온앤온+</div>
      </div>
      <div class="qr-col">
        <img src="${qr}" alt="QR" />
        <div class="url">${escapeHtml(model.website)}</div>
      </div>
    </div>
  </section>
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

export function downloadCenterCard(model: CenterCardModel) {
  if (typeof document === 'undefined') return false;
  const html = buildCenterCardHtml(model);
  const stem = `온앤온플러스_명함_${model.name}_${model.localityLabel}`;
  downloadBlob(`${stem}.html`, `\uFEFF${html}`, 'text/html;charset=utf-8');
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try { win.focus(); win.print(); } catch { /* ignore */ }
    }, 400);
  }
  return true;
}
