import React, { useEffect, useRef } from 'react';
import { TextInput, View } from 'react-native';
import { KOREAN_FONT_FAMILY } from '../../utils/koreanFont';
import { mountBodyField } from '../../utils/nativeImeHost';

/**
 * RN-web #root 밖에서 브라우저 기본 input/textarea를 띄운다.
 */
export default function IsolatedImeField({
  valueRef,
  placeholder,
  inputMode = 'text',
  maxLength,
  onLiveChange,
  multiline = false,
  fieldKey,
  ignoreModalLock = false,
}: {
  valueRef: React.MutableRefObject<string>;
  placeholder: string;
  inputMode?: 'text' | 'numeric' | 'tel';
  maxLength?: number;
  onLiveChange?: (value: string) => void;
  multiline?: boolean;
  fieldKey?: string;
  ignoreModalLock?: boolean;
}) {
  const hostRef = useRef<View>(null);
  const liveRef = useRef(onLiveChange);
  const valueRefStable = useRef(valueRef);
  liveRef.current = onLiveChange;
  valueRefStable.current = valueRef;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host) return;

    const { field, dispose } = mountBodyField({
      tag: multiline ? 'textarea' : 'input',
      placeholder,
      inputMode,
      maxLength,
      initialValue: valueRefStable.current.current,
      fieldKey,
      host,
      ignoreModalLock,
    });
    const sync = (event?: Event) => {
      const composing = Boolean(
        event && 'isComposing' in event && (event as InputEvent).isComposing,
      );
      valueRefStable.current.current = field.value;
      if (composing) return;
      liveRef.current?.(field.value);
    };
    field.addEventListener('input', sync);
    field.addEventListener('change', sync);
    field.addEventListener('blur', sync);
    field.addEventListener('compositionend', sync);
    return () => {
      sync();
      field.removeEventListener('input', sync);
      field.removeEventListener('change', sync);
      field.removeEventListener('blur', sync);
      field.removeEventListener('compositionend', sync);
      dispose();
    };
  }, [fieldKey, ignoreModalLock, inputMode, maxLength, multiline, placeholder]);

  return (
    <View ref={hostRef} style={{ height: multiline ? 96 : 48, width: '100%' }}>
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
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#DDD',
          paddingHorizontal: 12,
          height: multiline ? 96 : 48,
          fontSize: 16,
          fontFamily: KOREAN_FONT_FAMILY,
          color: '#111827',
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
