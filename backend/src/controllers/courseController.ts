import { Request, Response } from 'express';
import { recommendFestivalCourse } from '../services/courseRecommendService';
import { errorMessage, errorStatus } from '../utils/errors';

export async function recommendCourse(req: Request, res: Response) {
  try {
    const title = typeof req.query.title === 'string' ? req.query.title : String(req.body?.title ?? '');
    const city = typeof req.query.city === 'string' ? req.query.city : String(req.body?.city ?? '');
    const address = typeof req.query.address === 'string' ? req.query.address : String(req.body?.address ?? '');
    const metro = typeof req.query.metro === 'string' ? req.query.metro : String(req.body?.metro ?? '');
    const latitude = Number(req.query.lat ?? req.body?.latitude);
    const longitude = Number(req.query.lng ?? req.body?.longitude);
    const festivalId = typeof req.query.festival_id === 'string' ? req.query.festival_id : undefined;
    const contentTypeId = typeof req.query.contentTypeId === 'string'
      ? req.query.contentTypeId
      : String(req.body?.contentTypeId ?? '');
    const kind = typeof req.query.kind === 'string' ? req.query.kind : String(req.body?.kind ?? '');
    const category = typeof req.query.category === 'string' ? req.query.category : String(req.body?.category ?? '');
    const data = await recommendFestivalCourse({
      title,
      city,
      address,
      metro,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
      festivalId,
      contentTypeId,
      kind,
      category,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(errorStatus(err)).json({ success: false, message: errorMessage(err) });
  }
}
