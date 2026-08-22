import React, { createElement, useRef } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';
import { KOREAN_FONT_FAMILY } from '../../utils/koreanFont';

/**
 * 웹 한글 IME: 브라우저 native input을 비제어로 둔다.
 * React 19는 defaultValue가 바뀌면 value를 다시 써서 조합이 깨지므로
 * 마운트 시점 값만 쓰고, 타이핑 중 setState로 다시 그리지 않는다.
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
  const initialValue = useRef(value ?? '');

  if (Platform.OS === 'web') {
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
