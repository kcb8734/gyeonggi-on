import { api } from './client';

export type FestivalAiSummary = {
  overview: string;
  highlights: string[];
  tips: string;
  source: 'gemini' | 'fallback';
  model?: string;
  cached?: boolean;
};

export type FestivalAiQuery = {
  title: string;
  place?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  metro?: string | null;
  category?: string | null;
  overview?: string | null;
};

export async function fetchFestivalAiSummary(query: FestivalAiQuery): Promise<FestivalAiSummary | null> {
  const title = String(query.title || '').trim();
  if (!title) return null;
  const res = await api.post<{ success: boolean; data?: FestivalAiSummary }>(
    '/api/festivals/ai-summary',
    {
      title,
      place: query.place || '',
      startDate: query.startDate || '',
      endDate: query.endDate || '',
      metro: query.metro || '',
      category: query.category || '',
      overview: query.overview || '',
    },
    { timeout: 25000 },
  );
  return res.data?.data ?? null;
}
