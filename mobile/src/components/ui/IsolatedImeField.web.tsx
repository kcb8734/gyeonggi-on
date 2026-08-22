import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
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
}: {
  valueRef: React.MutableRefObject<string>;
  placeholder: string;
  inputMode?: 'text' | 'numeric' | 'tel';
  maxLength?: number;
  onLiveChange?: (value: string) => void;
  multiline?: boolean;
  fieldKey?: string;
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
    });
    const sync = () => {
      valueRefStable.current.current = field.value;
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
  }, [fieldKey, inputMode, maxLength, multiline, placeholder]);

  return <View ref={hostRef} style={{ height: multiline ? 96 : 48, width: '100%' }} />;
}
