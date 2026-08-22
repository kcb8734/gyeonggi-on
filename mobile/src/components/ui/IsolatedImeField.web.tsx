import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * RN-web은 #root에서 IME 조합을 가로챈다.
 * 실제 iframe을 document.body에 붙여 입력 문서 자체를 분리한다.
 */
export default function IsolatedImeField({
  valueRef,
  placeholder,
  inputMode = 'text',
  maxLength,
  onLiveChange,
  multiline = false,
}: {
  valueRef: React.MutableRefObject<string>;
  placeholder: string;
  inputMode?: 'text' | 'numeric' | 'tel';
  maxLength?: number;
  onLiveChange?: (value: string) => void;
  multiline?: boolean;
}) {
  const hostRef = useRef<View>(null);
  const liveRef = useRef(onLiveChange);
  const valueRefStable = useRef(valueRef);
  liveRef.current = onLiveChange;
  valueRefStable.current = valueRef;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host) return;

    const tag = multiline ? 'textarea' : 'input';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', placeholder);
    iframe.setAttribute('lang', 'ko');
    iframe.style.cssText = 'position:fixed;z-index:2147483000;border:0;background:transparent;margin:0;padding:0;overflow:hidden;';
    iframe.srcdoc = `<!doctype html><html lang="ko"><head><meta charset="utf-8" />
<style>
  html, body { margin: 0; height: 100%; background: transparent; }
  input, textarea {
    width: 100%; height: 100%; box-sizing: border-box;
    border: 1px solid #DDD; border-radius: 8px; padding: 12px;
    font-size: 16px; line-height: 22px; color: #111827;
    font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    outline: none; background: #fff; resize: none;
  }
</style></head><body>
<${tag} lang="ko" ${multiline ? '' : `type="text" inputmode="${inputMode}"`}
  placeholder="${escapeHtml(placeholder)}"
  ${typeof maxLength === 'number' ? `maxlength="${maxLength}"` : ''}
  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></${tag}>
</body></html>`;
    document.body.appendChild(iframe);

    const place = () => {
      const rect = host.getBoundingClientRect();
      iframe.style.top = `${rect.top}px`;
      iframe.style.left = `${rect.left}px`;
      iframe.style.width = `${Math.max(rect.width, 40)}px`;
      iframe.style.height = `${Math.max(rect.height, multiline ? 96 : 48)}px`;
      iframe.style.visibility = rect.width < 8 ? 'hidden' : 'visible';
    };

    const onLoad = () => {
      const field = iframe.contentDocument?.querySelector(tag) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!field) return;
      if (valueRefStable.current.current) field.value = valueRefStable.current.current;
      const sync = () => {
        valueRefStable.current.current = field.value;
        liveRef.current?.(field.value);
      };
      field.addEventListener('input', sync);
      field.addEventListener('change', sync);
      place();
    };
    iframe.addEventListener('load', onLoad);
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    ro?.observe(host);

    return () => {
      iframe.removeEventListener('load', onLoad);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      ro?.disconnect();
      iframe.remove();
    };
  }, [inputMode, maxLength, multiline, placeholder]);

  return <View ref={hostRef} style={{ height: multiline ? 96 : 48, width: '100%' }} />;
}
