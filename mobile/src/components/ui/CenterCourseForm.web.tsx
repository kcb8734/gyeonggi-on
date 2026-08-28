import React, { useEffect, useRef } from 'react';
import type { CenterLocalityRow } from '../../constants/centerDirectors';
import { listCenterCourses, upsertCenterCourse } from '../../constants/centerCourses';
import { saveCenterCourse } from '../../api/centers';
import { mountBodyOverlay } from '../../utils/nativeImeHost';

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STOPS = [
  { key: 'history', label: '1. 역사 체험 코스', placeholder: '예: 수원화성 · 화성행궁' },
  { key: 'market', label: '2. 전통시장 및 먹거리 코스', placeholder: '예: 수원 영동시장' },
  { key: 'main', label: '3. 메인 축 / 핵심 동선', placeholder: '예: 수원화성문화제 행궁광장' },
  { key: 'camp', label: '4. 캠핑장 및 숙박 코스', placeholder: '예: 광교호수공원 가족캠핑장' },
];

const field = (extra = '') =>
  `display:block;width:100%;margin-top:6px;border:1px solid #DDD;border-radius:8px;padding:0 12px;font-size:16px;box-sizing:border-box;${extra}`;

export default function CenterCourseForm({
  visible,
  row,
  onClose,
}: {
  visible: boolean;
  row: CenterLocalityRow | null;
  onClose: () => void;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!visible || !row || typeof document === 'undefined') return;
    const existing = listCenterCourses(row.label, row.region, 'all')[0];
    const stops = [existing?.historyCourse, existing?.marketFoodCourse, existing?.mainAxis, existing?.campingAccommodation];
    const stopHtml = STOPS.map((item, index) => {
      const stop = stops[index];
      return `<div style="margin-top:12px;background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:12px;">
        <div style="font-size:14px;font-weight:800;color:#111827;margin-bottom:8px;">${item.label}</div>
        <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;">장소명
          <input data-stop-name="${index}" value="${escapeHtml(stop?.name || '')}" placeholder="${item.placeholder}" style="${field('height:48px')}" />
        </label>
        <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;margin-top:8px;">설명
          <textarea data-stop-desc="${index}" placeholder="이 스팟을 고른 이유" style="${field('height:84px;padding:12px;resize:none')}">${escapeHtml(stop?.description || '')}</textarea>
        </label>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <label style="flex:1;font-size:11px;font-weight:800;color:#6B7280;">위도
            <input data-stop-lat="${index}" inputmode="decimal" value="${stop?.latitude ?? ''}" placeholder="37.28" style="${field('height:44px')}" />
          </label>
          <label style="flex:1;font-size:11px;font-weight:800;color:#6B7280;">경도
            <input data-stop-lng="${index}" inputmode="decimal" value="${stop?.longitude ?? ''}" placeholder="127.01" style="${field('height:44px')}" />
          </label>
        </div>
      </div>`;
    }).join('');
    const html = `
      <div style="position:relative;height:100%;background:#F9FAFB;display:flex;flex-direction:column;font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
        <button data-close="1" type="button" style="position:absolute;top:10px;right:10px;z-index:2;border:0;background:#111;color:#fff;border-radius:999px;padding:6px 12px;font-weight:800;cursor:pointer;">닫기</button>
        <div style="flex:1;overflow:auto;padding:18px 16px 28px;">
          <div style="color:#1D4ED8;font-size:11px;font-weight:800;">센터장 추천 코스</div>
          <div style="font-size:20px;font-weight:800;color:#111827;margin-top:4px;">${escapeHtml(row.regionLabel)} ${escapeHtml(row.label)}</div>
          <div style="font-size:13px;color:#4B5563;margin:8px 0;">역사·시장·메인 동선·숙박 4가지 양식으로 입력하면 관리자 검토 후 승인 시 앱에 등재됩니다.</div>
          <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;">코스 제목
            <input data-title="1" value="${escapeHtml(existing?.title || `${row.label} 로컬 추천 코스`)}" placeholder="${escapeHtml(row.label)} 하루 코스" style="${field('height:48px')}" />
          </label>
          <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;margin-top:10px;">상세 설명
            <textarea data-desc="1" placeholder="현장에서 발굴한 코스 소개" style="${field('height:96px;padding:12px;resize:none')}">${escapeHtml(existing?.description || '')}</textarea>
          </label>
          <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;margin-top:10px;">현장 사진 URL (줄바꿈 또는 쉼표)
            <textarea data-images="1" placeholder="https://" style="${field('height:84px;padding:12px;resize:none')}">${escapeHtml((existing?.images || []).join('\n'))}</textarea>
          </label>
          ${stopHtml}
          <div data-error="1" style="display:none;margin-top:10px;color:#B91C1C;font-size:13px;font-weight:700;"></div>
          <button data-submit="1" type="button" style="margin-top:16px;width:100%;background:#1D4ED8;color:#fff;border:0;border-radius:14px;padding:14px;font-weight:800;font-size:16px;cursor:pointer;">코스 등록 · 검토 요청</button>
        </div>
      </div>
    `;
    const { root, dispose } = mountBodyOverlay(html);
    const q = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T | null;
    const showError = (message: string) => {
      const err = q<HTMLDivElement>('[data-error]');
      if (!err) return;
      err.style.display = 'block';
      err.textContent = message;
    };
    q<HTMLButtonElement>('[data-close]')?.addEventListener('click', () => closeRef.current());
    q<HTMLButtonElement>('[data-submit]')?.addEventListener('click', async () => {
      const title = q<HTMLInputElement>('[data-title]')?.value.trim() || '';
      if (!title) {
        showError('코스 제목을 입력해 주세요.');
        return;
      }
      const stopAt = (index: number) => ({
        name: q<HTMLInputElement>(`[data-stop-name="${index}"]`)?.value.trim() || '',
        description: q<HTMLTextAreaElement>(`[data-stop-desc="${index}"]`)?.value.trim() || '',
        latitude: Number(q<HTMLInputElement>(`[data-stop-lat="${index}"]`)?.value) || undefined,
        longitude: Number(q<HTMLInputElement>(`[data-stop-lng="${index}"]`)?.value) || undefined,
      });
      const btn = q<HTMLButtonElement>('[data-submit]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '등록 중...';
      }
      try {
        const saved = await saveCenterCourse({
          regionId: row.label,
          metro: row.region,
          centerId: row.id,
          title,
          description: q<HTMLTextAreaElement>('[data-desc]')?.value.trim() || '',
          images: (q<HTMLTextAreaElement>('[data-images]')?.value || '').split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
          historyCourse: stopAt(0),
          marketFoodCourse: stopAt(1),
          mainAxis: stopAt(2),
          campingAccommodation: stopAt(3),
        });
        upsertCenterCourse(saved);
        closeRef.current();
      } catch (err) {
        showError(err instanceof Error ? err.message : '다시 시도해 주세요.');
        if (btn) {
          btn.disabled = false;
          btn.textContent = '코스 등록 · 검토 요청';
        }
      }
    });
    return dispose;
  }, [visible, row]);

  return null;
}
