import { Text, TextInput } from 'react-native';

type WithDefaults = { defaultProps?: Record<string, unknown> };

/** Android 시스템 글자 크기/표시 크기 확대가 탭·카드 레이아웃을 깨지 않게 고정한다. */
export function disableSystemFontScaling() {
  const text = Text as typeof Text & WithDefaults;
  const input = TextInput as typeof TextInput & WithDefaults;
  text.defaultProps = {
    ...text.defaultProps,
    allowFontScaling: false,
    maxFontSizeMultiplier: 1,
  };
  input.defaultProps = {
    ...input.defaultProps,
    allowFontScaling: false,
    maxFontSizeMultiplier: 1,
  };
}
