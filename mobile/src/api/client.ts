import axios from 'axios';
import { API_BASE_URL, CANONICAL_ORIGIN, canonicalizeApiOrigin } from '../config';

export const api = axios.create({
  baseURL: canonicalizeApiOrigin(API_BASE_URL || CANONICAL_ORIGIN),
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const current = String(config.baseURL || API_BASE_URL || CANONICAL_ORIGIN);
  config.baseURL = canonicalizeApiOrigin(current);
  if (typeof config.url === 'string' && config.url.includes('://kdanji.com') && !config.url.includes('://www.kdanji.com')) {
    config.url = config.url.replace('://kdanji.com', '://www.kdanji.com');
  }
  if (String(config.method || 'get').toUpperCase() === 'POST') {
    config.maxRedirects = 0;
  }
  return config;
});
