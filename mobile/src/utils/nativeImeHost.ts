type Rect = { top: number; left: number; width: number; height: number };

function applyRect(el: HTMLElement, rect: Rect) {
  el.style.top = `${rect.top}px`;
  el.style.left = `${rect.left}px`;
  el.style.width = `${Math.max(rect.width, 40)}px`;
  el.style.height = `${Math.max(rect.height, 40)}px`;
}

function phoneRect(): Rect | null {
  const phone = document.getElementById('onandon-phone');
  if (!phone) return null;
  const rect = phone.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

export function readLiveImeValue(fieldKey: string): string {
  if (typeof document === 'undefined' || !fieldKey) return '';
  const node = document.querySelector(`[data-onandon-ime-key="${fieldKey}"]`) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  return (node?.value || '').trim();
}

/**
 * RN-web은 #root에서 IME 조합을 가로챈다.
 * 미리보기 자체도 iframe이라 내부에 또 iframe을 두면 한글이 조합되지 않는다.
 * document.body(#root 형제)에 일반 HTML을 올려 브라우저 기본 입력을 쓴다.
 */
export function mountBodyOverlay(html: string): { root: HTMLDivElement; dispose: () => void } {
  const root = document.createElement('div');
  root.setAttribute('data-onandon-ime-overlay', '1');
  root.style.position = 'fixed';
  root.style.zIndex = '2147483645';
  root.style.overflow = 'auto';
  root.style.background = '#F7F8FA';
  root.style.boxSizing = 'border-box';
  root.innerHTML = html;
  document.body.appendChild(root);
  document.querySelectorAll('[data-onandon-ime-field]').forEach((node) => {
    const el = node as HTMLElement;
    el.dataset.onandonPrevDisplay = el.style.display;
    el.style.display = 'none';
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
  });

  const place = () => {
    const rect = phoneRect();
    if (rect) applyRect(root, rect);
    else {
      root.style.inset = '0';
      root.style.width = '100%';
      root.style.height = '100%';
    }
  };
  place();
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  const ro = typeof ResizeObserver !== 'undefined' && document.getElementById('onandon-phone')
    ? new ResizeObserver(place)
    : null;
  const phone = document.getElementById('onandon-phone');
  if (phone) ro?.observe(phone);

  return {
    root,
    dispose: () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      ro?.disconnect();
      root.remove();
      document.querySelectorAll('[data-onandon-ime-field]').forEach((node) => {
        const el = node as HTMLElement;
        el.style.display = el.dataset.onandonPrevDisplay || '';
        el.style.visibility = '';
        el.style.pointerEvents = 'auto';
      });
    },
  };
}

export function mountBodyField(options: {
  tag: 'input' | 'textarea';
  placeholder: string;
  inputMode?: string;
  maxLength?: number;
  initialValue?: string;
  fieldKey?: string;
  host: HTMLElement;
}): { field: HTMLInputElement | HTMLTextAreaElement; dispose: () => void } {
  const field = document.createElement(options.tag);
  field.lang = 'ko';
  field.placeholder = options.placeholder;
  field.autocomplete = 'off';
  field.setAttribute('autocorrect', 'off');
  field.setAttribute('autocapitalize', 'off');
  field.spellcheck = false;
  if (options.tag === 'input') {
    (field as HTMLInputElement).type = 'text';
    field.inputMode = (options.inputMode as HTMLInputElement['inputMode']) || 'text';
  }
  if (typeof options.maxLength === 'number') field.maxLength = options.maxLength;
  if (options.initialValue) field.value = options.initialValue;
  field.setAttribute('data-onandon-ime-field', '1');
  if (options.fieldKey) field.setAttribute('data-onandon-ime-key', options.fieldKey);
  field.style.cssText = [
    'position:fixed',
    'z-index:2147483000',
    'box-sizing:border-box',
    'margin:0',
    'border:1px solid #DDD',
    'border-radius:8px',
    'padding:12px',
    'font-size:16px',
    'line-height:22px',
    'color:#111827',
    'background:#fff',
    'font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif',
    'outline:none',
    'resize:none',
  ].join(';');
  document.body.appendChild(field);

  const place = () => {
    const overlayOpen = !!document.querySelector('[data-onandon-ime-overlay]');
    const rect = options.host.getBoundingClientRect();
    applyRect(field, {
      top: rect.top,
      left: rect.left,
      width: Math.max(rect.width, 40),
      height: Math.max(rect.height, options.tag === 'textarea' ? 96 : 48),
    });
    const hidden = overlayOpen || rect.width < 8;
    field.style.display = hidden ? 'none' : 'block';
    field.style.visibility = hidden ? 'hidden' : 'visible';
    field.style.pointerEvents = hidden ? 'none' : 'auto';
  };
  place();
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
  ro?.observe(options.host);

  return {
    field,
    dispose: () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      ro?.disconnect();
      field.remove();
    },
  };
}
