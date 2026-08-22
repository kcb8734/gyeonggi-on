import React, { useMemo, useRef } from 'react';
import { unstable_createElement as createEl } from 'react-native-web';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * RN-web renderer는 일반 createElement('iframe')을 호스트로 취급하지 않을 수 있다.
 * react-native-web의 unstable_createElement로 실제 HTML iframe을 만든다.
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
  const liveRef = useRef(onLiveChange);
  const valueRefStable = useRef(valueRef);
  liveRef.current = onLiveChange;
  valueRefStable.current = valueRef;

  const srcDoc = useMemo(() => `<!doctype html><html lang="ko"><head><meta charset="utf-8" />
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
</body></html>`, [inputMode, maxLength, placeholder]);

  return createEl('iframe', {
    title: placeholder,
    srcDoc,
    onLoad: (event: { currentTarget: HTMLIFrameElement }) => {
      const input = event.currentTarget.contentDocument?.querySelector('input');
      if (!input) return;
      if (valueRefStable.current.current) input.value = valueRefStable.current.current;
      const sync = () => {
        valueRefStable.current.current = input.value;
        liveRef.current?.(input.value);
      };
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
    },
    style: {
      width: '100%',
      height: 52,
      borderWidth: 0,
      borderStyle: 'none',
      display: 'block',
      backgroundColor: 'transparent',
    },
  });
}
