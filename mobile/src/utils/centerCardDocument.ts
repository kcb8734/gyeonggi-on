import { isJongnoCenter, jongnoDirectorPhotoUri } from '../assets/jongnoDirectorPhoto';
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

export const CARD_MM = {
  width: 92,
  height: 52,
  photoW: 20,
  photoH: 25,
  pad: 6.4,
  logoH: 6.4,
  nameToBrand: 5,
  ruleFromBottom: 8.2,
  brandAboveRule: 1,
  contactBelowRule: 1,
  contactFont: 2.55,
  brandLineGap: 1,
};
export const CARD_PRINT_CM = { width: 9.2, height: 5.2 };
export const CARD_COLORS = { title: '#585655', brand: '#585656', contact: '#111111' };
export const PRINT_DPI = 400;
const PREVIEW_DPI = 96;

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
    photoUrl: profile.photoUrl || (isJongnoCenter(row) ? jongnoDirectorPhotoUri() : undefined),
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

function px(mm: number, dpi: number) {
  return (mm / 25.4) * dpi;
}

export function cardPixelSize(dpi = PREVIEW_DPI) {
  return {
    width: Math.round(px(CARD_MM.width, dpi)),
    height: Math.round(px(CARD_MM.height, dpi)),
  };
}

function cardCss(dpi: number) {
  const u = (mm: number) => `${px(mm, dpi).toFixed(2)}px`;
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: ${u(CARD_MM.width)}; height: ${u(CARD_MM.height)}; background: #fff; }
    body { font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", sans-serif; color: #111; }
    .page {
      width: ${u(CARD_MM.width)}; height: ${u(CARD_MM.height)}; background: #fff;
      padding: ${u(CARD_MM.pad)};
      display: flex; flex-direction: column;
      overflow: hidden; position: relative;
    }
    .stage { flex: 0 0 auto; min-height: 0; display: flex; align-items: flex-start; gap: ${u(2.4)}; }
    .front-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; }
    .brand-logo { height: ${u(CARD_MM.logoH)}; width: auto; display: block; max-width: ${u(34)}; object-fit: contain; }
    .photo { width: ${u(CARD_MM.photoW)}; height: ${u(CARD_MM.photoH)}; object-fit: cover; border-radius: ${u(3.6)}; background: #d1d5db; flex-shrink: 0; }
    .ph { display: flex; align-items: center; justify-content: center; font-size: ${u(7)}; font-weight: 800; color: #6b7280; }
    .who { margin-top: ${u(5.2)}; display: flex; align-items: baseline; gap: ${u(1.8)}; flex-wrap: nowrap; }
    .name { font-size: ${u(3.53)}; font-weight: 800; color: #111; letter-spacing: -0.4px; white-space: nowrap; line-height: 1; }
    .bar { color: #c5c5c5; font-weight: 400; font-size: ${u(3.2)}; }
    .title { font-size: ${u(2.55)}; color: ${CARD_COLORS.title}; font-weight: 500; white-space: nowrap; overflow: hidden; }
    .brand-block {
      position: static; margin-top: ${u(CARD_MM.nameToBrand)}; padding-bottom: 0;
    }
    .brand { font-size: ${u(3.2)}; font-weight: 800; color: ${CARD_COLORS.brand}; line-height: 1; }
    .center { margin-top: ${u(CARD_MM.brandLineGap)}; font-size: ${u(2.75)}; font-style: italic; font-weight: 700; color: ${CARD_COLORS.brand}; line-height: 1; white-space: nowrap; overflow: hidden; }
    .rule {
      position: static; width: 100%; margin: ${u(CARD_MM.brandAboveRule)} 0 0;
      border: 0; border-top: ${u(0.25)} solid #d1d5db; flex-shrink: 0;
    }
    .grid {
      position: static; width: 100%; height: auto; margin: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: ${u(2.2)};
      row-gap: ${u(0.1)};
      padding-top: ${u(CARD_MM.contactBelowRule)};
      font-size: ${u(CARD_MM.contactFont)};
      color: ${CARD_COLORS.contact};
      line-height: 1.05;
    }
    .kv { display: grid; grid-template-columns: ${u(4.8)} 1fr; column-gap: ${u(0.9)}; align-items: center; min-width: 0; }
    .kv.addr { grid-column: 1 / -1; }
    .k { font-weight: 800; white-space: nowrap; }
    .v { min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; word-break: keep-all; overflow-wrap: normal; }
    .back { display: flex; height: 100%; gap: ${u(3)}; align-items: stretch; }
    .back-left { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .slogan { margin-top: ${u(7)}; font-size: ${u(3.9)}; font-weight: 800; color: #374151; line-height: 1.4; }
    .qr-col { width: ${u(28)}; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .qr-col img { width: ${u(24)}; height: ${u(24)}; }
    .url { margin-top: ${u(1.4)}; font-size: ${u(2.25)}; color: #111; text-align: center; white-space: nowrap; }
  `;
}

function logoHtml() {
  return `<img class="brand-logo" src="${ONANDON_LOGO_DATA_URI}" alt="on&amp;on+" />`;
}

function kv(label: string, value: string, extraClass = '') {
  const cls = extraClass ? `kv ${extraClass}` : 'kv';
  return `<div class="${cls}"><span class="k">${escapeHtml(label)}</span><span class="v">${escapeHtml(value)}</span></div>`;
}

function photoHtml(model: CenterCardModel) {
  const src = model.photoUrl || (isJongnoCenter(model) ? jongnoDirectorPhotoUri() : '');
  return src
    ? `<img class="photo" src="${escapeHtml(src)}" alt="" />`
    : `<div class="photo ph">${escapeHtml(model.name.slice(0, 1))}</div>`;
}

function qrSrc(model: CenterCardModel) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=8&data=${encodeURIComponent(model.qrUrl)}`;
}

function frontMarkup(model: CenterCardModel) {
  return `<div class="page" data-card-face="front">
    <div class="stage">
      <div class="front-copy">
        ${logoHtml()}
        <div class="who">
          <span class="name">${escapeHtml(model.name)}</span>
          <span class="bar">|</span>
          <span class="title">${escapeHtml(model.title)}</span>
        </div>
        <div class="brand-block">
          <div class="brand">온앤온+</div>
          <div class="center">${escapeHtml(model.dedicatedCenter)}</div>
        </div>
      </div>
      ${photoHtml(model)}
    </div>
    <hr class="rule" />
    <div class="grid">
      ${kv('M.', model.phone)}
      ${kv('E.', model.email)}
      ${kv('A.', model.address, 'addr')}
    </div>
  </div>`;
}

function backMarkup(model: CenterCardModel, qrUrl?: string) {
  const qr = qrUrl || qrSrc(model);
  return `<div class="page" data-card-face="back">
    <div class="back">
      <div class="back-left">
        ${logoHtml()}
        <div class="slogan">지자체 축제와<br/>소상공인 상생을 잇는<br/>온앤온+</div>
      </div>
      <div class="qr-col">
        <img src="${escapeHtml(qr)}" alt="QR" />
        <div class="url">${escapeHtml(model.website)}</div>
      </div>
    </div>
  </div>`;
}

export function buildCenterCardFaceDocument(model: CenterCardModel, side: 'front' | 'back', dpi = PREVIEW_DPI, assets?: { photoUrl?: string; qrUrl?: string }) {
  const hydrated: CenterCardModel = { ...model, photoUrl: assets?.photoUrl ?? model.photoUrl };
  const markup = side === 'front' ? frontMarkup(hydrated) : backMarkup(hydrated, assets?.qrUrl);
  const { width, height } = cardPixelSize(dpi);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${width}, height=${height}" />
  <title>온앤온+ 명함 ${side === 'front' ? '전면' : '후면'}</title>
  <style>${cardCss(dpi)}</style>
</head>
<body>${markup}</body>
</html>`;
}

export function buildCenterCardHtml(model: CenterCardModel) {
  const css = cardCss(PREVIEW_DPI).replace(/html, body \{[^}]+\}/, 'html, body { margin: 0; }');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>온앤온+ 공식 디지털 명함 - ${escapeHtml(model.name)}</title>
  <style>
    @page { size: 92mm 52mm; margin: 0; }
    ${css}
    body { background: #e5e7eb; }
    .wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px; }
    @media print { body { background: #fff; } .wrap { padding: 0; gap: 0; } }
  </style>
</head>
<body>
  <div class="wrap">
  ${frontMarkup(model)}
  ${backMarkup(model)}
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

function jpegFromCanvas(canvas: HTMLCanvasElement) {
  try {
    return canvas.toDataURL('image/jpeg', 0.95);
  } catch {
    return null;
  }
}

export function setJpegDpi(bytes: Uint8Array, dpi = PRINT_DPI): Uint8Array {
  const out = bytes.slice();
  for (let i = 0; i < out.length - 12; i += 1) {
    if (out[i] === 0x4A && out[i + 1] === 0x46 && out[i + 2] === 0x49 && out[i + 3] === 0x46 && out[i + 4] === 0) {
      out[i + 7] = 1;
      out[i + 8] = (dpi >> 8) & 0xff;
      out[i + 9] = dpi & 0xff;
      out[i + 10] = (dpi >> 8) & 0xff;
      out[i + 11] = dpi & 0xff;
      break;
    }
  }
  return out;
}

function bytesToDataUrl(bytes: Uint8Array, mime: string) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function downloadDataUrl(filename: string, dataUrl: string) {
  if (typeof document === 'undefined' || !dataUrl) return false;
  const stamped = dataUrl.startsWith('data:image/jpeg')
    ? bytesToDataUrl(setJpegDpi(dataUrlToBytes(dataUrl), PRINT_DPI), 'image/jpeg')
    : dataUrl;
  try {
    downloadBlob(filename, dataUrlToBytes(stamped), 'image/jpeg');
  } catch {
    const link = document.createElement('a');
    link.href = stamped;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  return true;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined' || !src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function toDataUri(src?: string): Promise<string | undefined> {
  if (!src) return undefined;
  if (src.startsWith('data:')) return src;
  const img = await loadHtmlImage(src);
  if (!img) return undefined;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width) return undefined;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

function mountCaptureFrame(html: string, width: number, height: number) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;border:0;opacity:0;pointer-events:none;`;
  iframe.width = String(width);
  iframe.height = String(height);
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return { iframe, ready: Promise.resolve(null as Document | null) };
  }
  const ready = new Promise<Document | null>((resolve) => {
    iframe.onload = () => resolve(iframe.contentDocument);
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => resolve(iframe.contentDocument), 80);
  });
  return { iframe, ready };
}

async function waitImages(doc: Document) {
  const images = Array.from(doc.images);
  await Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 1200);
    });
  }));
  await (doc.fonts?.ready ?? Promise.resolve()).catch(() => undefined);
}

async function rasterizeDocument(html: string, width: number, height: number): Promise<string | null> {
  const { iframe, ready } = mountCaptureFrame(html, width, height);
  try {
    const doc = await ready;
    if (!doc) return null;
    await waitImages(doc);
    const page = doc.querySelector('.page') as HTMLElement | null;
    if (!page) return null;
    const clone = page.cloneNode(true) as HTMLElement;
    const style = doc.querySelector('style')?.textContent || '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject x="0" y="0" width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;margin:0;padding:0;background:#fff;">
          <style>${style}</style>
          ${clone.outerHTML}
        </div>
      </foreignObject>
    </svg>`;
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const img = await loadHtmlImage(url);
    if (!img) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return jpegFromCanvas(canvas);
  } finally {
    iframe.remove();
  }
}

function mm(value: number) {
  return px(value, PRINT_DPI);
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

  const drawLogo = (x: number, y: number, heightMm = CARD_MM.logoH) => {
    if (!logo) return;
    const h = mm(heightMm);
    const w = h * ONANDON_LOGO_RATIO;
    ctx.drawImage(logo, x, y, w, h);
  };

  if (side === 'front') {
    drawLogo(pad, pad);
    const photoW = mm(CARD_MM.photoW);
    const photoH = mm(CARD_MM.photoH);
    const pxPhoto = W - pad - photoW;
    const py = pad;
    ctx.save();
    roundRect(ctx, pxPhoto, py, photoW, photoH, mm(3.6));
    ctx.clip();
    if (photo) ctx.drawImage(photo, pxPhoto, py, photoW, photoH);
    else {
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(pxPhoto, py, photoW, photoH);
      ctx.fillStyle = '#6b7280';
      ctx.font = font('800', 7);
      ctx.textAlign = 'center';
      ctx.fillText(model.name.slice(0, 1), pxPhoto + photoW / 2, py + photoH / 2 + mm(2.2));
    }
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#111111';
    ctx.font = font('800', 3.53);
    const nameY = pad + mm(CARD_MM.logoH + 5.2 + 3.1);
    ctx.fillText(model.name, pad, nameY);
    const nameW = ctx.measureText(model.name).width;
    ctx.fillStyle = '#c5c5c5';
    ctx.font = font('400', 3.2);
    ctx.fillText('|', pad + nameW + mm(1.6), nameY);
    ctx.fillStyle = CARD_COLORS.title;
    ctx.font = font('500', 2.55);
    ctx.fillText(model.title, pad + nameW + mm(4.2), nameY);

    ctx.fillStyle = CARD_COLORS.brand;
    ctx.font = font('800', 3.2);
    const brandY = nameY + mm(CARD_MM.nameToBrand + 3.2);
    ctx.fillText('온앤온+', pad, brandY);
    ctx.font = 'italic 700 ' + mm(2.75) + 'px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    const centerY = brandY + mm(CARD_MM.brandLineGap + 2.75);
    ctx.fillText(model.dedicatedCenter, pad, centerY);
    const ruleY = centerY + mm(CARD_MM.brandAboveRule);

    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = Math.max(1, mm(0.25));
    ctx.beginPath();
    ctx.moveTo(pad, ruleY);
    ctx.lineTo(W - pad, ruleY);
    ctx.stroke();

    const col = (W - pad * 2 - mm(2.2)) / 2;
    const row1 = ruleY + mm(CARD_MM.contactBelowRule + CARD_MM.contactFont);
    const row2 = row1 + mm(CARD_MM.contactFont + 0.12);
    const rows: Array<[string, string, number, number, number]> = [
      ['M.', model.phone, pad, row1, col],
      ['E.', model.email, pad + col + mm(2.2), row1, col],
      ['A.', model.address, pad, row2, W - pad * 2],
    ];
    const labelW = mm(4.8);
    rows.forEach(([label, value, x, rowY, maxW]) => {
      ctx.fillStyle = CARD_COLORS.contact;
      ctx.font = font('800', CARD_MM.contactFont);
      ctx.fillText(label, x, rowY);
      ctx.font = font('600', CARD_MM.contactFont);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + labelW, rowY - mm(2.3), maxW - labelW - mm(0.4), mm(3.2));
      ctx.clip();
      ctx.fillText(value, x + labelW, rowY);
      ctx.restore();
    });
  } else {
    drawLogo(pad, pad);
    ctx.fillStyle = '#374151';
    ctx.font = font('800', 3.9);
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
    ctx.font = font('600', 2.25);
    ctx.textAlign = 'center';
    ctx.fillText(model.website, qx + qrSize / 2, qy + qrSize + mm(3.2));
  }

  return jpegFromCanvas(canvas);
}

async function cardAssets(model: CenterCardModel) {
  const [logo, qr, photo] = await Promise.all([
    loadHtmlImage(ONANDON_LOGO_DATA_URI),
    toDataUri(qrSrc(model)),
    model.photoUrl ? toDataUri(model.photoUrl) : Promise.resolve(undefined),
  ]);
  return { logo, qr, photo };
}

export async function downloadCenterCardFace(model: CenterCardModel, side: 'front' | 'back') {
  if (typeof document === 'undefined') return false;
  const stem = `온앤온플러스_명함_${model.name}_${model.localityLabel}_92x52mm`;
  const label = side === 'front' ? '전면' : '후면';
  const { width, height } = cardPixelSize(PRINT_DPI);
  const assets = await cardAssets(model);
  const html = buildCenterCardFaceDocument(model, side, PRINT_DPI, {
    photoUrl: assets.photo,
    qrUrl: assets.qr,
  });
  let jpeg = await rasterizeDocument(html, width, height);
  if (!jpeg) {
    const qrImg = assets.qr ? await loadHtmlImage(assets.qr) : null;
    const photoImg = assets.photo ? await loadHtmlImage(assets.photo) : null;
    jpeg = await drawCardFace(model, side, assets.logo, qrImg, photoImg);
    if (!jpeg && side === 'front') jpeg = await drawCardFace(model, side, assets.logo, qrImg, null);
  }
  if (!jpeg) return false;
  downloadDataUrl(`${stem}_${label}.jpg`, jpeg);
  return true;
}

export async function downloadCenterCard(model: CenterCardModel) {
  const front = await downloadCenterCardFace(model, 'front');
  await new Promise((resolve) => setTimeout(resolve, 700));
  const back = await downloadCenterCardFace(model, 'back');
  return Boolean(front && back);
}
