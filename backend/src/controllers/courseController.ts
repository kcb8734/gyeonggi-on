import { Request, Response } from 'express';
import { recommendFestivalCourse } from '../services/courseRecommendService';
import { errorMessage, errorStatus } from '../utils/errors';

export async function recommendCourse(req: Request, res: Response) {
  try {
    const title = typeof req.query.title === 'string' ? req.query.title : String(req.body?.title ?? '');
    const city = typeof req.query.city === 'string' ? req.query.city : String(req.body?.city ?? '');
    const festivalId = typeof req.query.festival_id === 'string' ? req.query.festival_id : undefined;
    const data = await recommendFestivalCourse({ title, city, festivalId });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(errorStatus(err)).json({ success: false, message: errorMessage(err) });
  }
}
