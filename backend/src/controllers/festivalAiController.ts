import type { Request, Response } from 'express';
import path from 'path';
import { pathToFileURL } from 'url';

type SummarizeFestival = (input: Record<string, string>) => Promise<unknown>;

async function loadSummarizeFestival(): Promise<SummarizeFestival> {
  const file = path.resolve(__dirname, '../../../api/geminiFestival.js');
  const mod = await import(pathToFileURL(file).href) as { summarizeFestival: SummarizeFestival };
  return mod.summarizeFestival;
}

export async function postFestivalAiSummary(req: Request, res: Response) {
  try {
    const summarizeFestival = await loadSummarizeFestival();
    const body = (req.body || {}) as Record<string, string>;
    const query = req.query as Record<string, string>;
    const result = await summarizeFestival({
      title: String(body.title || query.title || ''),
      place: String(body.place || body.location_name || query.place || ''),
      startDate: String(body.startDate || body.start_date || query.startDate || ''),
      endDate: String(body.endDate || body.end_date || query.endDate || ''),
      metro: String(body.metro || query.metro || ''),
      category: String(body.category || query.category || ''),
      overview: String(body.overview || body.description || query.overview || ''),
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    return res.status(error.status === 400 ? 400 : 502).json({
      success: false,
      message: error.message || 'AI 요약을 만들지 못했습니다.',
    });
  }
}
