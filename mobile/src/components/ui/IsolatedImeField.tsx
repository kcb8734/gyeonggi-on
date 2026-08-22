import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { KOREAN_FONT_FAMILY } from '../../utils/koreanFont';

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
  return (
    <TextInput
      defaultValue={valueRef.current}
      placeholder={placeholder}
      maxLength={maxLength}
      editable
      multiline={multiline}
      autoCorrect={false}
      autoCapitalize="none"
      keyboardType={inputMode === 'text' ? 'default' : 'number-pad'}
      onChangeText={(text) => {
        valueRef.current = text;
        onLiveChange?.(text);
      }}
      style={[styles.input, multiline && styles.multiline]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
    fontFamily: KOREAN_FONT_FAMILY,
    color: '#111827',
  },
  multiline: { height: 96, textAlignVertical: 'top', paddingTop: 12 },
});
