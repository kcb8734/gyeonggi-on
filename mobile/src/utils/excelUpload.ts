export function isWebFilePickerAvailable() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

export function fileToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const chunks: string[] = [];
  const size = 0x8000;
  for (let i = 0; i < buffer.length; i += size) {
    chunks.push(String.fromCharCode(...buffer.subarray(i, i + size)));
  }
  return btoa(chunks.join(''));
}

export async function blobToBase64(file: Blob): Promise<string> {
  return fileToBase64(await file.arrayBuffer());
}

export function pickExcelFile(): Promise<File | null> {
  return new Promise((resolve) => {
    if (!isWebFilePickerAvailable()) {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

export async function uploadExcelFile(file: File, options?: { dryRun?: boolean; apiBase?: string }) {
  const apiBase = (options?.apiBase || '').replace(/\/$/, '');
  const content = await blobToBase64(file);
  const response = await fetch(`${apiBase}/api/admin/excel/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      content,
      dryRun: Boolean(options?.dryRun),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `엑셀 업로드 실패 (HTTP ${response.status})`);
  }
  return data;
}

export async function downloadExcelTemplate(apiBase = '') {
  const base = apiBase.replace(/\/$/, '');
  const response = await fetch(`${base}/api/admin/excel/template`);
  if (!response.ok) throw new Error(`템플릿 다운로드 실패 (HTTP ${response.status})`);
  const buffer = await response.arrayBuffer();
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return buffer;
  }
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', '경기온_엑셀적재_템플릿.xlsx');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return buffer;
}
