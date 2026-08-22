import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

function webFile(accept: string, capture?: string): Promise<string | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.setAttribute('capture', capture);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

async function nativePick(fromCamera: boolean, photoOnly = false): Promise<string | null> {
  const permission = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const mediaTypes = photoOnly ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.All;
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync({ mediaTypes, quality: 0.8 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes, quality: 0.8 });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

export function pickFromGallery(): Promise<string | null> {
  if (Platform.OS === 'web') return webFile('image/*,video/*');
  return nativePick(false);
}

export function pickPhotoFromGallery(): Promise<string | null> {
  if (Platform.OS === 'web') return webFile('image/*');
  return nativePick(false, true);
}

export function pickFromCamera(): Promise<string | null> {
  if (Platform.OS === 'web') return webFile('image/*', 'environment');
  return nativePick(true);
}
