import React, { createElement, useEffect, useRef } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';
import { KOREAN_FONT_FAMILY } from '../../utils/koreanFont';

/**
 * 웹: React reconcile 밖에 둔 native input.
 * 네이티브: 비제어 TextInput.
 */
export default function ImeTextInput({
  value,
  onChangeText,
  placeholder,
  maxLength,
  editable = true,
  style,
  ...rest
}: TextInputProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChangeText);
  onChangeRef.current = onChangeText;
  const initialValue = useRef(value ?? '');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
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

  if (Platform.OS === 'web') {
    return createElement('div', { ref: hostRef, style: { width: '100%' } });
  }

  return (
    <TextInput
      {...rest}
      defaultValue={initialValue.current}
      onChangeText={onChangeText}
      placeholder={placeholder}
      maxLength={maxLength}
      editable={editable}
      autoCorrect={false}
      autoCapitalize="none"
      style={[{ fontFamily: KOREAN_FONT_FAMILY }, style]}
    />
  );
}
