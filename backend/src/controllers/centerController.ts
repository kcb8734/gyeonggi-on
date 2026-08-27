import { Request, Response } from 'express';
import {
  applyBusinessCard,
  applyCenterDirector,
  listApplications,
  listCenterLocalities,
  reviewApplication,
  summarizeCenterRegions,
  type CenterReviewStatus,
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
    age: String(req.body?.age ?? ''),
    phone: String(req.body?.phone ?? ''),
    email: String(req.body?.email ?? ''),
    address: String(req.body?.address ?? ''),
    photoUrl: typeof req.body?.photoUrl === 'string' ? req.body.photoUrl : undefined,
    career: String(req.body?.career ?? ''),
    intro: String(req.body?.intro ?? ''),
  });
  if (!result.ok) {
    return res.status(400).json({ success: false, message: result.message });
  }
  return res.json({ success: true, data: result.data, message: '지원이 접수되었습니다. 관리자가 선정 심사를 진행합니다.' });
}

export function listCenterApplications(_req: Request, res: Response) {
  return res.json({ success: true, data: listApplications() });
}

export function reviewCenterApplication(req: Request, res: Response) {
  const status = String(req.body?.status || '') as CenterReviewStatus;
  if (status !== 'submitted' && status !== 'reviewing' && status !== 'selected') {
    return res.status(400).json({ success: false, message: '지원완료(선정 심사 중) 또는 선정 완료만 지정할 수 있습니다.' });
  }
  const result = reviewApplication(String(req.params.id || ''), status);
  if (!result.ok) return res.status(404).json({ success: false, message: result.message });
  return res.json({ success: true, data: result.data });
}

export function applyCenterCard(req: Request, res: Response) {
  const result = applyBusinessCard(String(req.params.id || ''));
  if (!result.ok) return res.status(404).json({ success: false, message: result.message });
  return res.json({ success: true, data: result.data, message: '명함에 지원서 정보를 적용했습니다.' });
}
