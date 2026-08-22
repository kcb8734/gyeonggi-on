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
 * RN-web은 document/#root에서 IME composition을 가로챈다.
 * 필드를 실제 HTML iframe(srcdoc)으로 붙여 React fiber 밖에 둔다.
 */
export default function IsolatedImeField({
  valueRef,
  placeholder,
  inputMode = 'text',
  maxLength,
  onLiveChange,
}: {
  valueRef: React.MutableRefObject<string>;
  placeholder: string;
  inputMode?: 'text' | 'numeric' | 'tel';
  maxLength?: number;
  onLiveChange?: (value: string) => void;
}) {
  const hostRef = useRef<View>(null);
  const liveRef = useRef(onLiveChange);
  const valueRefStable = useRef(valueRef);
  liveRef.current = onLiveChange;
  valueRefStable.current = valueRef;

  useEffect(() => {
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host || typeof document === 'undefined') return;

    const iframe = document.createElement('iframe');
    iframe.title = placeholder;
    iframe.setAttribute('lang', 'ko');
    iframe.style.cssText = 'width:100%;height:52px;border:0;display:block;background:transparent;';
    iframe.srcdoc = `<!doctype html><html lang="ko"><head><meta charset="utf-8" />
<style>
  html, body { margin: 0; height: 100%; background: transparent; }
  input {
    width: 100%; height: 48px; box-sizing: border-box;
    border: 1px solid #DDD; border-radius: 8px; padding: 0 12px;
    font-size: 16px; line-height: 22px; color: #111827;
    font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    outline: none; background: #fff;
  }
</style></head><body>
<input lang="ko" type="text" inputmode="${inputMode}" placeholder="${escapeHtml(placeholder)}"
  ${typeof maxLength === 'number' ? `maxlength="${maxLength}"` : ''}
  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
</body></html>`;
    host.appendChild(iframe);

    const onLoad = () => {
      const input = iframe.contentDocument?.querySelector('input');
      if (!input) return;
      if (valueRefStable.current.current) input.value = valueRefStable.current.current;
      const sync = () => {
        valueRefStable.current.current = input.value;
        liveRef.current?.(input.value);
      };
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
    };
    iframe.addEventListener('load', onLoad);
    return () => {
      iframe.removeEventListener('load', onLoad);
      iframe.remove();
    };
  }, [inputMode, maxLength, placeholder]);

  return <View ref={hostRef} style={{ height: 52, width: '100%' }} />;
}
