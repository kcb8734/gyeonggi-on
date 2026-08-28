import {
  dedicatedCenterName,
  directorTitleFor,
  qrUrlForLocality,
  websiteForLocality,
  type CenterDirectorProfile,
  type CenterLocalityRow,
} from '../constants/centerDirectors';
import { ONANDON_LOGO_DATA_URI, ONANDON_LOGO_RATIO } from '../assets/onandonLogoData';
import { dataUrlToBytes } from './pdfJpeg';

export const CARD_MM = { width: 92, height: 52, photoW: 20, photoH: 25, pad: 5.6 };
const PRINT_DPI = 400;

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

function logoHtml() {
  return `<img class="brand-logo" src="${ONANDON_LOGO_DATA_URI}" alt="on&amp;on+" />`;
}

function kv(label: string, value: string) {
  return `<div class="kv"><span class="k">${escapeHtml(label)}</span><span class="v">${escapeHtml(value)}</span></div>`;
}

export function buildCenterCardHtml(model: CenterCardModel) {
  const photo = model.photoUrl
    ? `<img class="photo" src="${escapeHtml(model.photoUrl)}" alt="" />`
    : `<div class="photo ph">${escapeHtml(model.name.slice(0, 1))}</div>`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=640x640&data=${encodeURIComponent(model.qrUrl)}`;
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
      padding: 5.6mm;
      position: relative; overflow: hidden; page-break-after: always;
    }
    .brand-logo { height: 6.4mm; width: auto; display: block; max-width: 34mm; object-fit: contain; }
    .front-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 4mm; }
    .photo { width: 20mm; height: 25mm; object-fit: cover; border-radius: 3.6mm; background: #d1d5db; flex-shrink: 0; }
    .ph { display: flex; align-items: center; justify-content: center; font-size: 16pt; font-weight: 800; color: #6b7280; }
    .who { margin-top: 3mm; display: flex; align-items: baseline; gap: 2mm; flex-wrap: nowrap; }
    .name { font-size: 13.5pt; font-weight: 800; color: #111; letter-spacing: -0.4px; white-space: nowrap; }
    .bar { color: #c5c5c5; font-weight: 400; }
    .title { font-size: 8.4pt; color: #6b7280; font-weight: 500; }
    .brand { margin-top: 1.5mm; font-size: 10pt; font-weight: 800; color: #111; }
    .center { margin-top: 0.8mm; font-size: 8.2pt; font-style: italic; font-weight: 700; color: #111; }
    .rule { margin-top: 2.3mm; border: 0; border-top: 0.25mm solid #d1d5db; }
    .grid { margin-top: 2mm; display: grid; grid-template-columns: 1.18fr 1fr; gap: 1.5mm 4mm; font-size: 6.6pt; color: #111; line-height: 1.45; }
    .kv { display: grid; grid-template-columns: 5.2mm 1fr; column-gap: 1.1mm; align-items: start; }
    .k { font-weight: 800; }
    .v { min-width: 0; word-break: keep-all; overflow-wrap: anywhere; }
    .back { display: flex; height: 100%; gap: 3mm; align-items: stretch; }
    .back-left { flex: 1; display: flex; flex-direction: column; }
    .slogan { margin-top: 7mm; font-size: 11pt; font-weight: 800; color: #374151; line-height: 1.45; }
    .qr-col { width: 28mm; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .qr-col img { width: 24mm; height: 24mm; }
    .url { margin-top: 1.6mm; font-size: 6.4pt; color: #111; text-align: center; }
    @media print { body { background: #fff; } .wrap { padding: 0; gap: 0; } .page { box-shadow: none; } }
    @media screen and (max-width: 640px) {
      body { overflow: auto; }
      .wrap { padding: 12px; width: 100%; box-sizing: border-box; }
      .page {
        width: 100%;
        max-width: 100%;
        height: auto;
        aspect-ratio: 92 / 52;
        padding: 6.1%;
      }
      .brand-logo { height: 7.2%; max-width: 38%; }
      .photo { width: 21.7%; height: auto; aspect-ratio: 20 / 25; }
      .name { font-size: 4.6vw; }
      .title { font-size: 2.9vw; }
      .brand { font-size: 3.4vw; }
      .center { font-size: 2.8vw; }
      .grid { font-size: 2.5vw; }
      .slogan { font-size: 3.8vw; margin-top: 8%; }
      .qr-col { width: 30%; }
      .qr-col img { width: 86%; height: auto; aspect-ratio: 1; }
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
    <div class="brand">온앤온+</div>
    <div class="center">${escapeHtml(model.dedicatedCenter)}</div>
    <hr class="rule" />
    <div class="grid">
      ${kv('M.', model.phone)}
      ${kv('E.', model.email)}
      ${kv('A.', model.address)}
      ${kv('W.', model.website)}
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

function downloadBlob(filename: string, data: Uint8Array, mime: string) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([new Uint8Array(data)], { type: mime });
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

function mm(value: number) {
  return (value / 25.4) * PRINT_DPI;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined' || !src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function drawCardFace(model: CenterCardModel, side: 'front' | 'back', logo: HTMLImageElement | null, qr: HTMLImageElement | null, photo: HTMLImageElement | null) {
  const canvas = document.createElement('canvas');
  const W = Math.round(mm(CARD_MM.width));
  const H = Math.round(mm(CARD_MM.height));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  const pad = mm(CARD_MM.pad);
  const font = (weight: string, sizeMm: number) => `${weight} ${mm(sizeMm)}px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;

  const drawLogo = (x: number, y: number, heightMm = 6.4) => {
    if (!logo) return;
    const h = mm(heightMm);
    const w = h * ONANDON_LOGO_RATIO;
    ctx.drawImage(logo, x, y, w, h);
  };

  if (side === 'front') {
    drawLogo(pad, pad);
    const photoW = mm(CARD_MM.photoW);
    const photoH = mm(CARD_MM.photoH);
    const px = W - pad - photoW;
    const py = pad;
    ctx.save();
    roundRect(ctx, px, py, photoW, photoH, mm(3.6));
    ctx.clip();
    if (photo) ctx.drawImage(photo, px, py, photoW, photoH);
    else {
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(px, py, photoW, photoH);
      ctx.fillStyle = '#6b7280';
      ctx.font = font('800', 7);
      ctx.textAlign = 'center';
      ctx.fillText(model.name.slice(0, 1), px + photoW / 2, py + photoH / 2 + mm(2.2));
    }
    ctx.restore();

    let y = pad + mm(11.2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111111';
    ctx.font = font('800', 4.8);
    ctx.fillText(model.name, pad, y);
    const nameW = ctx.measureText(model.name).width;
    ctx.fillStyle = '#c5c5c5';
    ctx.font = font('400', 4.2);
    ctx.fillText('|', pad + nameW + mm(1.6), y);
    ctx.fillStyle = '#6b7280';
    ctx.font = font('500', 3);
    ctx.fillText(model.title, pad + nameW + mm(4.2), y);

    y += mm(5.2);
    ctx.fillStyle = '#111111';
    ctx.font = font('800', 3.6);
    ctx.fillText('온앤온+', pad, y);
    y += mm(4.2);
    ctx.font = font('italic 700', 2.9);
    ctx.fillText(model.dedicatedCenter, pad, y);

    y += mm(2.4);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = Math.max(1, mm(0.25));
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();

    const col = (W - pad * 2) / 2;
    const rows: Array<[string, string, number, number]> = [
      ['M.', model.phone, pad, y + mm(3.6)],
      ['E.', model.email, pad + col + mm(2), y + mm(3.6)],
      ['A.', model.address, pad, y + mm(8.2)],
      ['W.', model.website, pad + col + mm(2), y + mm(8.2)],
    ];
    ctx.font = font('800', 2.35);
    const labelW = mm(5.2);
    rows.forEach(([label, value, x, rowY]) => {
      ctx.fillStyle = '#111111';
      ctx.font = font('800', 2.35);
      ctx.fillText(label, x, rowY);
      ctx.font = font('600', 2.35);
      const maxW = col - labelW - mm(2.4);
      wrapText(ctx, value, x + labelW, rowY, maxW, mm(3.2));
    });
  } else {
    drawLogo(pad, pad);
    ctx.fillStyle = '#374151';
    ctx.font = font('800', 4);
    const slogan = ['지자체 축제와', '소상공인 상생을 잇는', '온앤온+'];
    slogan.forEach((line, index) => ctx.fillText(line, pad, pad + mm(16) + index * mm(5.4)));
    const qrSize = mm(24);
    const qx = W - pad - qrSize;
    const qy = (H - qrSize) / 2 - mm(1.4);
    if (qr) ctx.drawImage(qr, qx, qy, qrSize, qrSize);
    else {
      ctx.strokeStyle = '#111';
      ctx.strokeRect(qx, qy, qrSize, qrSize);
    }
    ctx.fillStyle = '#111111';
    ctx.font = font('600', 2.3);
    ctx.textAlign = 'center';
    ctx.fillText(model.website, qx + qrSize / 2, qy + qrSize + mm(3.2));
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const chars = String(text || '').split('');
  let line = '';
  let row = 0;
  chars.forEach((ch, index) => {
    const next = line + ch;
    if (ctx.measureText(next).width > maxW && line) {
      ctx.fillText(line, x, y + row * lineH);
      line = ch;
      row += 1;
    } else {
      line = next;
    }
    if (index === chars.length - 1) ctx.fillText(line, x, y + row * lineH);
  });
}

export async function downloadCenterCard(model: CenterCardModel) {
  if (typeof document === 'undefined') return false;
  const stem = `온앤온플러스_명함_${model.name}_${model.localityLabel}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=8&data=${encodeURIComponent(model.qrUrl)}`;
  const [logo, qr, photo] = await Promise.all([
    loadHtmlImage(ONANDON_LOGO_DATA_URI),
    loadHtmlImage(qrSrc),
    model.photoUrl ? loadHtmlImage(model.photoUrl) : Promise.resolve(null),
  ]);
  const front = await drawCardFace(model, 'front', logo, qr, photo);
  const back = await drawCardFace(model, 'back', logo, qr, photo);
  if (front) downloadBlob(`${stem}_전면.jpg`, dataUrlToBytes(front), 'image/jpeg');
  if (back) {
    setTimeout(() => downloadBlob(`${stem}_후면.jpg`, dataUrlToBytes(back), 'image/jpeg'), 250);
  }
  return Boolean(front && back);
}
