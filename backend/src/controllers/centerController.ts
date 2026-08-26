import { Request, Response } from 'express';
import {
  applyCenterDirector,
  listCenterLocalities,
  summarizeCenterRegions,
} from '../constants/centerDirectors';

export function listCenterRegions(_req: Request, res: Response) {
  return res.json({ success: true, data: summarizeCenterRegions() });
}

export function listCenterRegionDetail(req: Request, res: Response) {
  const region = String(req.params.region || req.query.region || '');
  return res.json({ success: true, data: listCenterLocalities(region) });
}

export function applyCenter(req: Request, res: Response) {
  const result = applyCenterDirector({
    localityKey: String(req.body?.localityKey ?? ''),
    name: String(req.body?.name ?? ''),
    phone: String(req.body?.phone ?? ''),
    email: String(req.body?.email ?? ''),
    photoUrl: typeof req.body?.photoUrl === 'string' ? req.body.photoUrl : undefined,
    career: String(req.body?.career ?? ''),
    intro: String(req.body?.intro ?? ''),
  });
  if (!result.ok) {
    return res.status(400).json({ success: false, message: result.message });
  }
  return res.json({ success: true, data: result.data, message: '지원이 접수되었습니다. 선정 심사를 진행합니다.' });
}
