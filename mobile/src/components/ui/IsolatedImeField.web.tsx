import React, { createElement, useEffect, useRef } from 'react';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * RN-web TextInput은 document 레벨에서 IME 조합을 가로챈다.
 * 필드마다 작은 iframe을 써서 브라우저 기본 한글 입력을 그대로 쓴다.
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const primed = useRef(false);
  const valueRefStable = useRef(valueRef);
  valueRefStable.current = valueRef;
  const liveRef = useRef(onLiveChange);
  liveRef.current = onLiveChange;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || primed.current) return;

    const mount = () => {
      const doc = iframe.contentDocument;
      if (!doc || primed.current) return;
      primed.current = true;
      doc.open();
      doc.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8" />
<style>
  html, body { margin: 0; height: 100%; background: transparent; }
  input {
    width: 100%;
    height: 48px;
    box-sizing: border-box;
    border: 1px solid #DDD;
    border-radius: 8px;
    padding: 0 12px;
    font-size: 16px;
    line-height: 22px;
    color: #111827;
    font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    outline: none;
    background: #fff;
  }
</style></head><body>
<input lang="ko" type="text" inputmode="${inputMode}" placeholder="${escapeHtml(placeholder)}"
  ${typeof maxLength === 'number' ? `maxlength="${maxLength}"` : ''}
  autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
</body></html>`);
      doc.close();
      const input = doc.querySelector('input');
      if (!input) return;
      input.value = valueRefStable.current.current;
      const sync = () => {
        valueRefStable.current.current = input.value;
        liveRef.current?.(input.value);
      };
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
    };

    iframe.addEventListener('load', mount);
    mount();
    return () => iframe.removeEventListener('load', mount);
  }, [inputMode, maxLength, placeholder]);

  return createElement('iframe', {
    ref: iframeRef,
    title: placeholder,
    style: {
      width: '100%',
      height: 52,
      border: 'none',
      display: 'block',
      background: 'transparent',
    },
  });
}
