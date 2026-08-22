import React, { createElement, useRef } from 'react';
import type { TextInputProps } from 'react-native';
import { KOREAN_FONT_FAMILY } from '../../utils/koreanFont';

/** Metro web 엔트리. 조합 중 value/defaultValue를 덮어쓰지 않는다. */
export default function ImeTextInput({
  value,
  onChangeText,
  placeholder,
  maxLength,
  editable = true,
}: TextInputProps) {
  const initialValue = useRef(value ?? '');

  return createElement('input', {
    type: 'text',
    lang: 'ko',
    inputMode: 'text',
    autoComplete: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    disabled: editable === false,
    maxLength,
    placeholder,
    defaultValue: initialValue.current,
    onInput: (event: { currentTarget: HTMLInputElement }) => {
      onChangeText?.(event.currentTarget.value);
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      backgroundColor: '#fff',
      borderRadius: 8,
      border: '1px solid #DDD',
      padding: 12,
      fontSize: 16,
      lineHeight: '22px',
      color: '#111827',
      fontFamily: KOREAN_FONT_FAMILY,
      outline: 'none',
    },
  });
}
