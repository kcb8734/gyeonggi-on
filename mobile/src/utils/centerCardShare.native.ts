import { Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CARD_PRINT_CM, PRINT_DPI, type CenterCardModel } from './centerCardDocument';

const PRINT_W = Math.round((CARD_PRINT_CM.width / 2.54) * PRINT_DPI);
const PRINT_H = Math.round((CARD_PRINT_CM.height / 2.54) * PRINT_DPI);

export async function shareCenterCardFace(
  model: CenterCardModel,
  side: 'front' | 'back',
  view?: { current?: unknown } | unknown,
) {
  const target = view && typeof view === 'object' && 'current' in (view as object)
    ? (view as { current: unknown }).current
    : view;
  if (!target) return false;
  try {
    const uri = await captureRef(target as never, {
      format: 'jpg',
      quality: 0.95,
      result: 'tmpfile',
      width: PRINT_W,
      height: PRINT_H,
    });
    const label = side === 'front' ? '전면' : '후면';
    const stem = `온앤온플러스_명함_${model.name}_${model.localityLabel}_92x52mm_${label}.jpg`;
    const dest = `${FileSystem.cacheDirectory ?? ''}${stem}`;
    if (FileSystem.cacheDirectory) {
      await FileSystem.copyAsync({ from: uri, to: dest });
    }
    const shareUri = FileSystem.cacheDirectory ? dest : uri;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(shareUri, {
        mimeType: 'image/jpeg',
        dialogTitle: stem,
        UTI: 'public.jpeg',
      });
      return true;
    }
    Alert.alert('저장 실패', '이 기기에서 파일 공유를 사용할 수 없습니다.');
    return false;
  } catch (err) {
    Alert.alert('저장 실패', err instanceof Error ? err.message : '명함 이미지를 만들지 못했습니다.');
    return false;
  }
}
