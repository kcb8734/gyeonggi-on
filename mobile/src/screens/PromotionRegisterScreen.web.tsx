import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { fetchNearbyFestivals } from '../api/festivals';
import { verifyMerchant, type MerchantVerifyResult } from '../api/merchants';
import { API_BASE_URL } from '../config';
import type { FestivalPin } from '../types/map';
import { mountBodyOverlay } from '../utils/nativeImeHost';

const FORM = `
<div class="wrap" style="font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111827;background:#F7F8FA;min-height:100%;box-sizing:border-box">
  <div style="position:sticky;top:0;z-index:6;background:#fff;border-bottom:1px solid #E5E7EB;padding:10px 12px;display:flex;align-items:center;gap:10px">
    <button id="exitBtn" type="button" style="border:0;background:#111827;color:#fff;border-radius:10px;padding:8px 12px;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer">‹ 나가기</button>
    <strong style="font-size:16px">할인 쿠폰 등록</strong>
  </div>
  <div style="padding:16px 20px 48px">
  <h1 style="font-size:22px;margin:0 0 8px">할인 쿠폰 등록</h1>
  <div style="background:#ECFDF5;border:1px solid #6EE7B7;color:#065F46;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;margin-bottom:12px">상호명·메뉴·특징은 #root 밖 브라우저 기본 입력입니다. ‘온앤온분식’처럼 치면 자모가 조합됩니다.</div>
  <p style="font-size:12px;color:#6B7280;line-height:18px;margin:0 0 8px">국세청 계속사업자 확인 후 상가 소개를 적고 쿠폰을 등록합니다.</p>
  <label for="bizName" style="display:block;font-size:14px;font-weight:600;margin:12px 0 6px">상호명</label>
  <input id="bizName" name="business_name" lang="ko" type="text" inputmode="text" placeholder="예: 화성행궁 한정식" autocomplete="off" autocorrect="off" spellcheck="false" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:0 12px;height:48px;font-size:16px;font-family:inherit;background:#fff" />
  <label for="bizNo" style="display:block;font-size:14px;font-weight:600;margin:12px 0 6px">사업자등록번호 (10자리)</label>
  <input id="bizNo" name="business_number" lang="ko" type="text" inputmode="numeric" maxlength="12" placeholder="1234567890" autocomplete="off" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:0 12px;height:48px;font-size:16px;font-family:inherit;background:#fff" />
  <button id="verifyBtn" type="button" style="width:100%;border:0;border-radius:10px;padding:12px;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer;background:#111827;color:#fff;margin-top:10px">국세청 사업자 상태 확인</button>
  <div id="nts" style="display:none;background:#FFF4E5;border:1px solid #FFD08A;border-radius:12px;padding:16px;margin-top:16px;font-size:14px;font-weight:700;color:#B4530A"></div>
  <div id="introBlock" style="display:none;background:#EEF2FF;border:1px solid #C7D2FE;border-radius:14px;padding:14px;margin-top:16px">
    <p style="font-size:12px;color:#6B7280;margin:0 0 8px">사업자 확인이 끝났습니다. 쿠폰 등록 전에 상가를 소개해 주세요.</p>
    <label for="mainMenu" style="display:block;font-size:14px;font-weight:600;margin:12px 0 6px">주요 메뉴</label>
    <textarea id="mainMenu" lang="ko" placeholder="예: 궁중갈비탕, 수원왕갈비, 김치찌개" autocomplete="off" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:12px;min-height:88px;font-size:16px;font-family:inherit;background:#fff"></textarea>
    <label for="features" style="display:block;font-size:14px;font-weight:600;margin:12px 0 6px">특징</label>
    <textarea id="features" lang="ko" placeholder="예: 행궁 앞 30년 노포, 당일 손질 고기, 단체석 가능" autocomplete="off" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:12px;min-height:88px;font-size:16px;font-family:inherit;background:#fff"></textarea>
  </div>
  <label for="festival" style="display:block;font-size:14px;font-weight:600;margin:12px 0 6px">연계 축제 선택</label>
  <select id="festival" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:0 12px;height:48px;font-size:16px;font-family:inherit;background:#fff"><option value="">축제를 선택하세요</option></select>
  <label for="rate" style="display:block;font-size:14px;font-weight:600;margin:12px 0 6px">점주 할인율 (%) — 자체 할인 최대 100%</label>
  <input id="rate" value="10" inputmode="numeric" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:0 12px;height:48px;font-size:16px;font-family:inherit;background:#fff" />
  <label for="qty" style="display:block;font-size:14px;font-weight:600;margin:12px 0 6px">발급 수량</label>
  <input id="qty" value="100" inputmode="numeric" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:0 12px;height:48px;font-size:16px;font-family:inherit;background:#fff" />
  <label for="cap" style="display:block;font-size:14px;font-weight:600;margin:12px 0 6px">건당 최대 할인 한도(원)</label>
  <input id="cap" value="5000" inputmode="numeric" style="width:100%;box-sizing:border-box;border:1px solid #DDD;border-radius:8px;padding:0 12px;height:48px;font-size:16px;font-family:inherit;background:#fff" />
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
    <label for="match" style="margin:0;font-size:14px;font-weight:600">지자체 1:1 매칭 신청</label>
    <input id="match" type="checkbox" />
  </div>
  <p style="font-size:12px;color:#6B7280;line-height:18px">끄면 상가가 할인 전액을 부담하고 즉시 쿠폰을 발행합니다. 켜면 관리자 승인 후 매칭률이 붙습니다.</p>
  <div id="preview" style="background:#FFF4E5;border:1px solid #FFD08A;border-radius:12px;padding:16px;margin-top:16px;font-size:14px;font-weight:700;color:#B4530A">상가 자체 할인 10% (지자체 매칭 없음)</div>
  <button id="submitBtn" type="button" disabled style="width:100%;border:0;border-radius:10px;padding:12px;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer;background:#2D6CDF;color:#fff;margin-top:24px;opacity:.45">할인 쿠폰 등록하기</button>
  </div>
</div>
`;

function val(root: HTMLElement, id: string) {
  return ((root.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value || '').trim();
}

export default function PromotionRegisterScreen({ merchantId }: { merchantId?: string }) {
  const navigation = useNavigation<any>();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const ntsRef = useRef<MerchantVerifyResult | null>(null);
  const festivalsRef = useRef<FestivalPin[]>([]);
  const [festivals, setFestivals] = useState<FestivalPin[]>([]);

  useEffect(() => {
    fetchNearbyFestivals(merchantId ? { merchantId } : undefined)
      .then(setFestivals)
      .catch(() => undefined);
  }, [merchantId]);

  useEffect(() => {
    festivalsRef.current = festivals;
    const select = overlayRef.current?.querySelector('#festival') as HTMLSelectElement | null;
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">축제를 선택하세요</option>';
    festivals.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.title} (${item.location_name ?? ''})`;
      select.appendChild(option);
    });
    if (current) select.value = current;
  }, [festivals]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const { root, dispose } = mountBodyOverlay(FORM);
    overlayRef.current = root;

    const preview = () => {
      const rate = parseFloat(val(root, 'rate')) || 0;
      const match = (root.querySelector('#match') as HTMLInputElement)?.checked;
      const gov = match ? Math.min(rate, 10) : 0;
      const box = root.querySelector('#preview');
      if (box) {
        box.textContent = match
          ? `예상: 점주 ${rate}% + 지자체 ${gov}% = 총 ${rate + gov}%`
          : `상가 자체 할인 ${rate}% (지자체 매칭 없음)`;
      }
    };
    root.querySelector('#rate')?.addEventListener('input', preview);
    root.querySelector('#match')?.addEventListener('change', preview);

    const applyNts = (nts: MerchantVerifyResult | null) => {
      ntsRef.current = nts;
      const badge = root.querySelector('#nts') as HTMLElement | null;
      const submit = root.querySelector('#submitBtn') as HTMLButtonElement | null;
      const intro = root.querySelector('#introBlock') as HTMLElement | null;
      if (!badge) return;
      if (!nts) {
        badge.style.display = 'none';
        if (submit) submit.disabled = true;
        if (intro) intro.style.display = 'none';
        return;
      }
      badge.style.display = 'block';
      badge.style.background = nts.data?.verified ? '#E7F7EC' : '#FFF4E5';
      badge.style.borderColor = nts.data?.verified ? '#8BE0A6' : '#FFD08A';
      badge.style.color = nts.data?.verified ? '#166534' : '#B4530A';
      badge.textContent = nts.data?.verified
        ? `계속사업자 확인 완료 (${nts.data.b_stt_cd})`
        : `확인 실패: ${nts.message}`;
      const ok = !!nts.data?.verified;
      if (submit) {
        submit.disabled = !ok;
        submit.style.opacity = ok ? '1' : '.45';
      }
      if (intro) intro.style.display = ok ? 'block' : 'none';
    };

    const onVerify = async () => {
      const businessName = val(root, 'bizName');
      const businessNumber = val(root, 'bizNo').replace(/\D/g, '');
      const btn = root.querySelector('#verifyBtn') as HTMLButtonElement | null;
      if (businessName.length < 1 || businessNumber.length !== 10) {
        applyNts({ success: false, message: '상호명과 사업자등록번호 10자리를 입력해주세요.' });
        return;
      }
      if (btn) {
        btn.disabled = true;
        btn.textContent = '국세청 확인 중...';
      }
      try {
        const verified = await verifyMerchant({ merchantId, businessNumber, businessName });
        applyNts(verified);
      } catch (err: any) {
        const data = err?.response?.data;
        applyNts(data ?? { success: false, message: data?.message ?? '국세청 상태조회에 실패했습니다.' });
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '국세청 사업자 상태 확인';
        }
      }
    };

    const onSubmit = async () => {
      const nts = ntsRef.current;
      if (!nts?.data?.verified || nts.data.b_stt_cd !== '01') {
        Alert.alert('알림', '국세청 계속사업자 확인 후에 등록할 수 있습니다.');
        return;
      }
      if (!val(root, 'mainMenu') || !val(root, 'features')) {
        Alert.alert('알림', '주요 메뉴와 특징을 입력한 뒤 쿠폰을 등록해주세요.');
        return;
      }
      const festivalId = val(root, 'festival');
      if (!festivalId) {
        Alert.alert('알림', '연계할 축제를 선택해주세요.');
        return;
      }
      try {
        const res = await axios.post(`${API_BASE_URL}/api/promotions`, {
          merchant_id: merchantId,
          business_name: val(root, 'bizName'),
          business_number: val(root, 'bizNo').replace(/\D/g, ''),
          main_menu: val(root, 'mainMenu'),
          features: val(root, 'features'),
          festival_id: festivalId,
          title: `${festivalsRef.current.find((item) => item.id === festivalId)?.title ?? ''} 제휴 할인`,
          merchant_discount_rate: parseFloat(val(root, 'rate')),
          max_discount_amount: parseFloat(val(root, 'cap')),
          total_quantity: parseInt(val(root, 'qty'), 10),
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          request_matching: (root.querySelector('#match') as HTMLInputElement)?.checked,
          funding_type: (root.querySelector('#match') as HTMLInputElement)?.checked ? 'MATCHED' : 'MERCHANT_ONLY',
        });
        Alert.alert('등록 완료', res.data.message);
      } catch (err: any) {
        Alert.alert('등록 실패', err?.response?.data?.message ?? '서버 오류가 발생했습니다.');
      }
    };

    root.querySelector('#exitBtn')?.addEventListener('click', () => navigation.goBack());
    root.querySelector('#verifyBtn')?.addEventListener('click', onVerify);
    root.querySelector('#submitBtn')?.addEventListener('click', onSubmit);

    return () => {
      dispose();
      overlayRef.current = null;
    };
  }, [merchantId, navigation]);

  return <View style={styles.host} />;
}

const styles = StyleSheet.create({
  host: { flex: 1, minHeight: 860, backgroundColor: '#F7F8FA' },
});
