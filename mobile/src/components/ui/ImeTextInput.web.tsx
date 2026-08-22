import React, { createElement, useEffect, useRef } from 'react';
import type { TextInputProps } from 'react-native';
import { KOREAN_FONT_FAMILY } from '../../utils/koreanFont';

/**
 * React가 input value를 다시 그리면 한글 조합이 깨진다.
 * 빈 host div만 React에 맡기고, 실제 input은 DOM에 한 번만 붙인다.
 */
export default function ImeTextInput({
  onChangeText,
  placeholder,
  maxLength,
  editable = true,
}: TextInputProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChangeText);
  onChangeRef.current = onChangeText;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof document === 'undefined') return;

    const input = document.createElement('input');
    input.type = 'text';
    input.lang = 'ko';
    input.setAttribute('inputmode', 'text');
    input.autocomplete = 'off';
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.spellcheck = false;
    input.placeholder = placeholder ?? '';
    if (typeof maxLength === 'number') input.maxLength = maxLength;
    input.disabled = editable === false;
    input.style.cssText = [
      'width:100%',
      'box-sizing:border-box',
      'background:#fff',
      'border-radius:8px',
      'border:1px solid #DDD',
      'padding:12px',
      'font-size:16px',
      'line-height:22px',
      'color:#111827',
      `font-family:${KOREAN_FONT_FAMILY}`,
      'outline:none',
    ].join(';');

    const onInput = () => {
      onChangeRef.current?.(input.value);
    };
    input.addEventListener('input', onInput);
    host.replaceChildren(input);

    return () => {
      input.removeEventListener('input', onInput);
      input.remove();
    };
  }, [editable, maxLength, placeholder]);

  return createElement('div', { ref: hostRef, style: { width: '100%' } });
}
