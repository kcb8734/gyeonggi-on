import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { KOREAN_FONT_FAMILY } from '../../utils/koreanFont';

/** 네이티브: 일반 TextInput. 웹은 ImeTextInput.web.tsx가 한글 IME를 처리한다. */
export default function ImeTextInput({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      {...props}
      autoCorrect={false}
      autoCapitalize="none"
      style={[{ fontFamily: KOREAN_FONT_FAMILY }, style]}
    />
  );
}
