import React, { useEffect, useRef } from 'react';
import type { TextInputProps } from 'react-native';
import { KOREAN_FONT_FAMILY } from '../../utils/koreanFont';

/**
 * RN Web TextInput은 한글 조합(IME) 중에 value를 다시 써서
 * 자모가 음절로 안 합쳐지거나 입력이 리셋된다.
 * 웹은 브라우저 native input으로 조합을 유지한다.
 */
export default function ImeTextInput({
  value,
  onChangeText,
  placeholder,
  maxLength,
  editable = true,
  style,
}: TextInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const composing = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || composing.current) return;
    const next = value ?? '';
    if (node.value !== next) node.value = next;
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      lang="ko"
      inputMode="text"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      disabled={editable === false}
      maxLength={maxLength}
      placeholder={placeholder}
      defaultValue={value}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        onChangeText?.(event.currentTarget.value);
      }}
      onInput={(event) => {
        onChangeText?.(event.currentTarget.value);
      }}
      style={{
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
        imeMode: 'active',
        ...(typeof style === 'object' && style && !Array.isArray(style)
          ? {
              backgroundColor: (style as { backgroundColor?: string }).backgroundColor ?? '#fff',
              borderRadius: (style as { borderRadius?: number }).borderRadius ?? 8,
              fontSize: (style as { fontSize?: number }).fontSize ?? 16,
            }
          : {}),
      }}
    />
  );
}
