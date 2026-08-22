/** 지자체 자체 행사 등 TourAPI에 없는 축제를 관리자가 수동 보완한다. */

export interface AdminFestivalInput {
  contentId?: string;
  contentTypeId?: string;
  title: string;
  overview?: string;
  address?: string;
  tel?: string;
  homepage?: string;
  firstImage?: string;
  firstImage2?: string;
  mapX?: number;
  mapY?: number;
  eventStartDate?: string;
  eventEndDate?: string;
  eventPlace?: string;
  playtime?: string;
  fee?: string;
  category?: string;
}

export interface AdminFestivalOverride extends Required<Pick<AdminFestivalInput, 'title'>> {
  contentId: string;
  contentTypeId: string;
  overview?: string;
  address: string;
  tel?: string;
  homepage?: string;
  firstImage?: string;
  firstImage2?: string;
  mapX: number;
  mapY: number;
  eventStartDate?: string;
  eventEndDate?: string;
  eventPlace?: string;
  playtime?: string;
  fee?: string;
  category?: string;
  source: 'admin';
  updatedAt: string;
}

const overrides = new Map<string, AdminFestivalOverride>();

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function coord(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function listFestivalOverrides(): AdminFestivalOverride[] {
  return [...overrides.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getFestivalOverride(contentId: string): AdminFestivalOverride | undefined {
  return overrides.get(text(contentId));
}

export function upsertFestivalOverride(input: AdminFestivalInput): AdminFestivalOverride {
  const title = text(input.title);
  if (!title) {
    throw new Error('축제명이 필요합니다.');
  }
  const contentId = text(input.contentId) || `admin-${Date.now()}`;
  const prev = overrides.get(contentId);
  const next: AdminFestivalOverride = {
    contentId,
    contentTypeId: text(input.contentTypeId) || prev?.contentTypeId || '15',
    title,
    overview: text(input.overview) || prev?.overview,
    address: text(input.address) || prev?.address || '',
    tel: text(input.tel) || prev?.tel,
    homepage: text(input.homepage) || prev?.homepage,
    firstImage: text(input.firstImage) || prev?.firstImage,
    firstImage2: text(input.firstImage2) || prev?.firstImage2,
    mapX: input.mapX != null ? coord(input.mapX) : prev?.mapX ?? 0,
    mapY: input.mapY != null ? coord(input.mapY) : prev?.mapY ?? 0,
    eventStartDate: text(input.eventStartDate) || prev?.eventStartDate,
    eventEndDate: text(input.eventEndDate) || prev?.eventEndDate,
    eventPlace: text(input.eventPlace) || prev?.eventPlace,
    playtime: text(input.playtime) || prev?.playtime,
    fee: text(input.fee) || prev?.fee,
    category: text(input.category) || prev?.category,
    source: 'admin',
    updatedAt: new Date().toISOString(),
  };
  overrides.set(contentId, next);
  return next;
}

export function deleteFestivalOverride(contentId: string): boolean {
  return overrides.delete(text(contentId));
}
