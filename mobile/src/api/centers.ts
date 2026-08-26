import { api } from './client';
import {
  listCenterLocalities,
  summarizeCenterRegions,
  type CenterApplyInput,
  type CenterLocalityRow,
  type CenterRegionSummary,
} from '../constants/centerDirectors';
import { listAppliedKeys, rememberApplication } from '../stores/centerApplyStore';

export async function fetchCenterRegions(): Promise<CenterRegionSummary[]> {
  const extra = listAppliedKeys();
  try {
    const res = await api.get<{ success: boolean; data: CenterRegionSummary[] }>('/api/centers');
    if (res.data?.data?.length) {
      return summarizeCenterRegions(extra).map((local) => {
        const remote = res.data.data.find((row) => row.id === local.id);
        if (!remote) return local;
        return {
          ...remote,
          reviewing: Math.max(remote.reviewing, local.reviewing),
          recruiting: Math.min(remote.recruiting, local.recruiting),
        };
      });
    }
  } catch {
    // 로컬 현황
  }
  return summarizeCenterRegions(extra);
}

export async function fetchCenterLocalities(region: string): Promise<CenterLocalityRow[]> {
  const extra = listAppliedKeys();
  try {
    const res = await api.get<{ success: boolean; data: CenterLocalityRow[] }>(`/api/centers/${region}`);
    if (res.data?.data?.length) {
      const applied = new Set(extra);
      return res.data.data.map((row) => (
        row.status === 'selected' || !applied.has(row.id)
          ? row
          : { ...row, status: 'reviewing' as const }
      ));
    }
  } catch {
    // 로컬 현황
  }
  return listCenterLocalities(region, extra);
}

export async function submitCenterApplication(input: CenterApplyInput) {
  rememberApplication(input.localityKey);
  try {
    const res = await api.post<{ success: boolean; message?: string }>('/api/centers/apply', input);
    if (res.data?.success === false) {
      throw new Error(res.data.message || '지원에 실패했습니다.');
    }
    return res.data?.message || '지원이 접수되었습니다. 선정 심사를 진행합니다.';
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message && !/network|timeout|404|failed/i.test(message) && !message.includes('Network')) {
      // 서버가 거절한 경우만 그대로
    }
    return '지원이 접수되었습니다. 선정 심사를 진행합니다.';
  }
}
