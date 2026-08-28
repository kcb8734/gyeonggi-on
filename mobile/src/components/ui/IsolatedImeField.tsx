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
  fieldKey: _fieldKey,
  ignoreModalLock: _ignoreModalLock,
  secureTextEntry = false,
}: {
  valueRef: React.MutableRefObject<string>;
  placeholder: string;
  inputMode?: 'text' | 'numeric' | 'tel';
  maxLength?: number;
  onLiveChange?: (value: string) => void;
  multiline?: boolean;
  fieldKey?: string;
  ignoreModalLock?: boolean;
  secureTextEntry?: boolean;
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
      secureTextEntry={Boolean(secureTextEntry)}
      keyboardType={inputMode === 'text' ? 'default' : 'number-pad'}
      onChangeText={(text) => {
        valueRef.current = text;
        onLiveChange?.(text);
      }}
      onEndEditing={(event) => {
        const text = event.nativeEvent.text ?? valueRef.current;
        valueRef.current = text;
        onLiveChange?.(text);
      }}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
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
