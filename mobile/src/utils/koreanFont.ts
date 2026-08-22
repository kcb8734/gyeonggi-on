import { Platform } from 'react-native';

export const KOREAN_FONT_FAMILY =
  Platform.OS === 'web'
    ? '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Apple Gothic", sans-serif'
    : undefined;

/** Expo 웹에서 한글 조합·표시가 되도록 Noto Sans KR을 한 번만 넣는다. */
export function ensureKoreanWebFont() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('gyeonggi-noto-sans-kr')) return;

  const link = document.createElement('link');
  link.id = 'gyeonggi-noto-sans-kr';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.id = 'gyeonggi-korean-font-style';
  style.textContent = `
    html, body, input, textarea, button, select {
      font-family: ${KOREAN_FONT_FAMILY};
    }
  `;
  document.head.appendChild(style);
}
