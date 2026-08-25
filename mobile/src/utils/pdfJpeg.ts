export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const raw = atob(dataUrl.split(',')[1] ?? '');
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function jpegPagesToPdf(pages: Array<{ width: number; height: number; jpeg: Uint8Array }>): Uint8Array {
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
    const tail = encoder.encode('\nendstream endobj\n');
    chunks.push(tail);
    offset += tail.length;
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
