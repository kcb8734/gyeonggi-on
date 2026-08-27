import { api } from './client';
import {
  listCenterLocalities,
  overlayLocalities,
  overlayRegions,
  summarizeCenterRegions,
  type CenterApplicationRecord,
  type CenterApplyInput,
  type CenterLocalityRow,
  type CenterRegionSummary,
  type CenterReviewStatus,
} from '../constants/centerDirectors';
import {
  applyLocalBusinessCard,
  centerOverlay,
  hydrateRemoteApplications,
  listCenterApplications,
  rememberApplication,
  reviewLocalApplication,
} from '../stores/centerApplyStore';

export async function fetchCenterRegions(): Promise<CenterRegionSummary[]> {
  const overlay = centerOverlay();
  try {
    const res = await api.get<{ success: boolean; data: CenterRegionSummary[] }>('/api/centers');
    if (res.data?.data?.length) return overlayRegions(res.data.data, overlay);
  } catch {
    // 로컬 현황
  }
  return summarizeCenterRegions(overlay);
}

export async function fetchCenterLocalities(region: string): Promise<CenterLocalityRow[]> {
  const overlay = centerOverlay();
  try {
    const res = await api.get<{ success: boolean; data: CenterLocalityRow[] }>(`/api/centers/${region}`);
    if (res.data?.data?.length) return overlayLocalities(res.data.data, overlay);
  } catch {
    // 로컬 현황
  }
  return listCenterLocalities(region, overlay);
}

export async function submitCenterApplication(input: CenterApplyInput, meta?: { localityLabel?: string; region?: string; regionLabel?: string }) {
  rememberApplication(input, meta);
  try {
    const res = await api.post<{ success: boolean; message?: string; data?: CenterApplicationRecord }>('/api/centers/apply', input);
    if (res.data?.data) hydrateRemoteApplications([res.data.data]);
    if (res.data?.success === false) {
      throw new Error(res.data.message || '지원에 실패했습니다.');
    }
    return res.data?.message || '지원이 접수되었습니다. 관리자가 선정 심사를 진행합니다.';
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message && !/network|timeout|404|failed/i.test(message) && !message.includes('Network')) {
      // 서버가 거절한 경우만 그대로
    }
    return '지원이 접수되었습니다. 관리자가 선정 심사를 진행합니다.';
  }
}

export async function fetchCenterApplications(): Promise<CenterApplicationRecord[]> {
  try {
    const res = await api.get<{ success: boolean; data: CenterApplicationRecord[] }>('/api/centers/applications');
    if (res.data?.data?.length) {
      hydrateRemoteApplications(res.data.data);
    }
  } catch {
    // 로컬 지원서
  }
  return listCenterApplications();
}

export async function reviewCenterApplication(id: string, status: CenterReviewStatus) {
  reviewLocalApplication(id, status);
  try {
    await api.patch(`/api/centers/applications/${id}`, { status });
  } catch {
    // 로컬 반영 유지
  }
}

export async function applyCenterBusinessCard(id: string) {
  const local = applyLocalBusinessCard(id);
  try {
    const res = await api.post<{ success: boolean; data?: CenterApplicationRecord }>(`/api/centers/applications/${id}/card`, {});
    if (res.data?.data) hydrateRemoteApplications([res.data.data]);
  } catch {
    // 로컬 반영 유지
  }
  return local;
}
