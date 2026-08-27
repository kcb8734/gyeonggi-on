import React, { useEffect, useRef, useState } from 'react';
import type { CenterApplyInput, CenterLocalityRow } from '../../constants/centerDirectors';
import { mountBodyOverlay } from '../../utils/nativeImeHost';

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function CenterApplyModal({
  visible,
  row,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  row: CenterLocalityRow | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: CenterApplyInput) => Promise<void> | void;
}) {
  const [photoUrl, setPhotoUrl] = useState('');
  const photoRef = useRef('');
  const submitRef = useRef(onSubmit);
  const closeRef = useRef(onClose);
  submitRef.current = onSubmit;
  closeRef.current = onClose;
  photoRef.current = photoUrl;

  useEffect(() => {
    if (!visible) setPhotoUrl('');
  }, [visible, row?.id]);

  useEffect(() => {
    if (!visible || !row || typeof document === 'undefined') return;
    const html = `
      <div style="position:relative;height:100%;background:#fff;display:flex;flex-direction:column;font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
        <button data-close="1" type="button" style="position:absolute;top:10px;right:10px;z-index:2;border:0;background:#111;color:#fff;border-radius:999px;padding:6px 12px;font-weight:800;cursor:pointer;">닫기</button>
        <div style="flex:1;overflow:auto;padding:18px 16px 28px;">
          <div style="color:#0F766E;font-size:11px;font-weight:800;">간편 지원</div>
          <div style="font-size:20px;font-weight:800;color:#111827;margin-top:4px;">${escapeHtml(row.regionLabel)} ${escapeHtml(row.label)} 센터장 지원</div>
          <div style="margin-top:6px;color:#EA580C;font-weight:800;font-size:13px;">현재 ${row.applicantCount ?? 0}명 지원 중</div>
          <div style="font-size:13px;color:#6B7280;margin:6px 0 12px;">서류 없이 한 번에 작성하고 바로 접수합니다. 모든 칸에 바로 입력할 수 있습니다.</div>
          <img data-photo-preview="1" alt="" style="display:none;width:80px;height:100px;object-fit:cover;border-radius:14px;margin:0 auto 10px;background:#E5E7EB;" />
          <div data-photo-empty="1" style="width:80px;height:100px;border-radius:14px;background:#E5E7EB;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;color:#6B7280;font-weight:700;font-size:12px;">프로필 사진</div>
          <label style="display:block;background:#111827;color:#fff;border-radius:12px;padding:11px;text-align:center;font-weight:800;margin-bottom:12px;cursor:pointer;">
            사진 촬영 · 갤러리 선택
            <input data-photo="1" type="file" accept="image/*" capture="user" style="display:none" />
          </label>
          <div style="display:flex;gap:8px;">
            <label style="flex:1.4;font-size:12px;font-weight:800;color:#6B7280;">이름
              <input data-name="1" value="" placeholder="홍길동" style="display:block;width:100%;margin-top:6px;height:48px;border:1px solid #DDD;border-radius:8px;padding:0 12px;font-size:16px;box-sizing:border-box;" />
            </label>
            <label style="width:92px;font-size:12px;font-weight:800;color:#6B7280;">나이
              <input data-age="1" inputmode="numeric" placeholder="35" style="display:block;width:100%;margin-top:6px;height:48px;border:1px solid #DDD;border-radius:8px;padding:0 12px;font-size:16px;box-sizing:border-box;" />
            </label>
          </div>
          <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;margin-top:8px;">연락처
            <input data-phone="1" inputmode="tel" placeholder="010-0000-0000" style="display:block;width:100%;margin-top:6px;height:48px;border:1px solid #DDD;border-radius:8px;padding:0 12px;font-size:16px;box-sizing:border-box;" />
          </label>
          <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;margin-top:8px;">이메일
            <input data-email="1" placeholder="name@example.com" style="display:block;width:100%;margin-top:6px;height:48px;border:1px solid #DDD;border-radius:8px;padding:0 12px;font-size:16px;box-sizing:border-box;" />
          </label>
          <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;margin-top:8px;">활동 주소
            <input data-address="1" placeholder="시·군·구 활동 주소를 입력해 주세요" style="display:block;width:100%;margin-top:6px;height:48px;border:1px solid #DDD;border-radius:8px;padding:0 12px;font-size:16px;box-sizing:border-box;" />
          </label>
          <div style="font-size:12px;font-weight:800;color:#6B7280;margin-top:8px;">활동 지역</div>
          <div style="border:1px solid #D1FAE5;background:#ECFDF5;border-radius:12px;padding:12px;margin-top:6px;color:#065F46;font-weight:800;">${escapeHtml(row.regionLabel)} ${escapeHtml(row.label)}</div>
          <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;margin-top:8px;">주요 경력
            <textarea data-career="1" placeholder="지역 축제·상권 관련 경력을 적어 주세요" style="display:block;width:100%;margin-top:6px;height:96px;border:1px solid #DDD;border-radius:8px;padding:12px;font-size:16px;box-sizing:border-box;resize:none;"></textarea>
          </label>
          <label style="display:block;font-size:12px;font-weight:800;color:#6B7280;margin-top:8px;">자기소개 · 센터 운영 계획
            <textarea data-intro="1" placeholder="현장에서 어떻게 축제와 상가를 잇고 싶은지 적어 주세요" style="display:block;width:100%;margin-top:6px;height:96px;border:1px solid #DDD;border-radius:8px;padding:12px;font-size:16px;box-sizing:border-box;resize:none;"></textarea>
          </label>
          <div data-error="1" style="display:none;margin-top:10px;color:#B91C1C;font-size:13px;font-weight:700;"></div>
          <button data-submit="1" type="button" style="margin-top:16px;width:100%;background:#EA580C;color:#fff;border:0;border-radius:14px;padding:14px;font-weight:800;font-size:16px;cursor:pointer;">${submitting ? '접수 중...' : '원클릭 지원하기'}</button>
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
    const closeBtn = q<HTMLButtonElement>('[data-close]');
    const submitBtn = q<HTMLButtonElement>('[data-submit]');
    const file = q<HTMLInputElement>('[data-photo]');
    const preview = q<HTMLImageElement>('[data-photo-preview]');
    const empty = q<HTMLDivElement>('[data-photo-empty]');
    closeBtn?.addEventListener('click', () => closeRef.current());
    file?.addEventListener('change', () => {
      const picked = file.files?.[0];
      if (!picked) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || '');
        photoRef.current = url;
        setPhotoUrl(url);
        if (preview) {
          preview.src = url;
          preview.style.display = 'block';
        }
        if (empty) empty.style.display = 'none';
      };
      reader.readAsDataURL(picked);
    });
    submitBtn?.addEventListener('click', async () => {
      const name = q<HTMLInputElement>('[data-name]')?.value.trim() || '';
      const age = q<HTMLInputElement>('[data-age]')?.value.trim() || '';
      const phone = q<HTMLInputElement>('[data-phone]')?.value.trim() || '';
      const email = q<HTMLInputElement>('[data-email]')?.value.trim() || '';
      const address = q<HTMLInputElement>('[data-address]')?.value.trim() || '';
      const career = q<HTMLTextAreaElement>('[data-career]')?.value.trim() || '';
      const intro = q<HTMLTextAreaElement>('[data-intro]')?.value.trim() || '';
      if (!photoRef.current) {
        showError('얼굴이 보이는 프로필 사진을 올려 주세요.');
        return;
      }
      if (!name || !age || !phone || !address || !career || !intro) {
        showError('이름, 나이, 연락처, 활동 주소, 경력, 자기소개를 모두 입력해 주세요.');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = '접수 중...';
      await submitRef.current({
        localityKey: row.id,
        name,
        age,
        phone,
        email,
        address,
        photoUrl: photoRef.current,
        career,
        intro,
      });
    });
    return dispose;
  }, [visible, row, submitting]);

  return null;
}
