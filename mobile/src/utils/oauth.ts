import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

type OAuthResult = { type: 'success'; params: Record<string, string> } | { type: 'cancel' };

function paramsFromUrl(url: string): Record<string, string> {
  const hash = url.split('#')[1] ?? '';
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  return {
    ...Object.fromEntries(new URLSearchParams(query)),
    ...Object.fromEntries(new URLSearchParams(hash)),
  };
}

export function makeRedirect(): string {
  return AuthSession.makeRedirectUri({ path: 'auth' });
}

export async function startOAuth(authUrl: string): Promise<OAuthResult> {
  const result = await WebBrowser.openAuthSessionAsync(authUrl, makeRedirect());
  if (result.type === 'success' && 'url' in result && result.url) {
    return { type: 'success', params: paramsFromUrl(result.url) };
  }
  return { type: 'cancel' };
}
