import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import axios from 'axios';
import { fetchNearbyFestivals } from '../api/festivals';
import { verifyMerchant, type MerchantVerifyResult } from '../api/merchants';
import { API_BASE_URL } from '../config';
import type { FestivalPin } from '../types/map';

const FORM = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  html, body { margin: 0; background: #F7F8FA; font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; color: #111827; }
  .wrap { padding: 20px 20px 48px; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  .note { font-size: 12px; color: #6B7280; line-height: 18px; margin-bottom: 8px; }
  .ime { background: #ECFDF5; border: 1px solid #6EE7B7; color: #065F46; border-radius: 12px; padding: 10px 12px; font-size: 12px; font-weight: 700; margin-bottom: 12px; }
  label { display: block; font-size: 14px; font-weight: 600; margin: 12px 0 6px; }
  input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #DDD; border-radius: 8px; padding: 0 12px; font-size: 16px; font-family: inherit; background: #fff; }
  input, select { height: 48px; }
  textarea { min-height: 88px; padding: 12px; resize: vertical; line-height: 22px; }
  .btn { width: 100%; border: 0; border-radius: 10px; padding: 12px; font-weight: 700; font-size: 15px; font-family: inherit; cursor: pointer; }
  .dark { background: #111827; color: #fff; margin-top: 10px; }
  .blue { background: #2D6CDF; color: #fff; margin-top: 24px; }
  .blue:disabled { opacity: .45; }
  .badge { background: #FFF4E5; border: 1px solid #FFD08A; border-radius: 12px; padding: 16px; margin-top: 16px; font-size: 14px; font-weight: 700; color: #B4530A; }
  .ok { background: #E7F7EC; border-color: #8BE0A6; color: #166534; }
  .row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
  #introBlock { display: none; background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 14px; padding: 14px; margin-top: 16px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>할인 쿠폰 등록</h1>
  <div class="ime">상호명·메뉴·특징은 브라우저 기본 한글 입력입니다. ‘온앤온분식’처럼 치면 자모가 조합됩니다.</div>
  <p class="note">국세청 계속사업자 확인 후 상가 소개를 적고 쿠폰을 등록합니다.</p>
  <label for="bizName">상호명</label>
  <input id="bizName" name="business_name" lang="ko" type="text" inputmode="text" placeholder="예: 화성행궁 한정식" autocomplete="off" autocorrect="off" spellcheck="false" />
  <label for="bizNo">사업자등록번호 (10자리)</label>
  <input id="bizNo" name="business_number" lang="ko" type="text" inputmode="numeric" maxlength="12" placeholder="1234567890" autocomplete="off" />
  <button class="btn dark" id="verifyBtn" type="button">국세청 사업자 상태 확인</button>
  <div id="nts" class="badge" style="display:none"></div>

  <div id="introBlock">
    <p class="note" style="margin:0 0 8px">사업자 확인이 끝났습니다. 쿠폰 등록 전에 상가를 소개해 주세요.</p>
    <label for="mainMenu">주요 메뉴</label>
    <textarea id="mainMenu" lang="ko" placeholder="예: 궁중갈비탕, 수원왕갈비, 김치찌개" autocomplete="off"></textarea>
    <label for="features">특징</label>
    <textarea id="features" lang="ko" placeholder="예: 행궁 앞 30년 노포, 당일 손질 고기, 단체석 가능" autocomplete="off"></textarea>
  </div>

  <label for="festival">연계 축제 선택</label>
  <select id="festival"><option value="">축제를 선택하세요</option></select>
  <label for="rate">점주 할인율 (%) — 자체 할인 최대 100%</label>
  <input id="rate" value="10" inputmode="numeric" />
  <label for="qty">발급 수량</label>
  <input id="qty" value="100" inputmode="numeric" />
  <label for="cap">건당 최대 할인 한도(원)</label>
  <input id="cap" value="5000" inputmode="numeric" />
  <div class="row">
    <label for="match" style="margin:0">지자체 1:1 매칭 신청</label>
    <input id="match" type="checkbox" style="width:auto;height:auto" />
  </div>
  <p class="note">끄면 상가가 할인 전액을 부담하고 즉시 쿠폰을 발행합니다. 켜면 관리자 승인 후 매칭률이 붙습니다.</p>
  <div id="preview" class="badge">상가 자체 할인 10% (지자체 매칭 없음)</div>
  <button class="btn blue" id="submitBtn" type="button" disabled>할인 쿠폰 등록하기</button>
</div>
<script>
  function val(id) { return (document.getElementById(id).value || '').trim(); }
  function preview() {
    var rate = parseFloat(val('rate')) || 0;
    var match = document.getElementById('match').checked;
    var gov = match ? Math.min(rate, 10) : 0;
    document.getElementById('preview').textContent = match
      ? ('예상: 점주 ' + rate + '% + 지자체 ' + gov + '% = 총 ' + (rate + gov) + '%')
      : ('상가 자체 할인 ' + rate + '% (지자체 매칭 없음)');
  }
  document.getElementById('rate').addEventListener('input', preview);
  document.getElementById('match').addEventListener('change', preview);
  document.getElementById('verifyBtn').onclick = function () {
    parent.postMessage({
      source: 'onandon-promo',
      type: 'verify',
      businessName: val('bizName'),
      businessNumber: val('bizNo')
    }, '*');
  };
  document.getElementById('submitBtn').onclick = function () {
    parent.postMessage({
      source: 'onandon-promo',
      type: 'submit',
      businessName: val('bizName'),
      businessNumber: val('bizNo'),
      mainMenu: val('mainMenu'),
      features: val('features'),
      festivalId: val('festival'),
      rate: val('rate'),
      qty: val('qty'),
      cap: val('cap'),
      requestMatching: document.getElementById('match').checked
    }, '*');
  };
</script>
</body>
</html>`;

export default function PromotionRegisterScreen({ merchantId }: { merchantId?: string }) {
  const hostRef = useRef<View>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [festivals, setFestivals] = useState<FestivalPin[]>([]);
  const [nts, setNts] = useState<MerchantVerifyResult | null>(null);

  useEffect(() => {
    fetchNearbyFestivals(merchantId ? { merchantId } : undefined)
      .then(setFestivals)
      .catch(() => undefined);
  }, [merchantId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const host = hostRef.current as unknown as HTMLElement | null;
    const phone = document.getElementById('onandon-phone');
    const parent = phone ?? host ?? document.body;
    const iframe = document.createElement('iframe');
    iframe.title = '할인 쿠폰 등록';
    iframe.setAttribute('lang', 'ko');
    iframe.srcdoc = FORM;
    iframe.style.cssText = phone
      ? 'position:absolute;inset:0;width:100%;height:100%;border:0;z-index:30;background:#F7F8FA;'
      : 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:#F7F8FA;';
    if (phone) {
      const style = window.getComputedStyle(phone);
      if (style.position === 'static') phone.style.position = 'relative';
    }
    parent.appendChild(iframe);
    iframeRef.current = iframe;
    return () => {
      iframe.remove();
      iframeRef.current = null;
    };
  }, []);

  const fillFestivals = () => {
    const select = iframeRef.current?.contentDocument?.getElementById('festival') as HTMLSelectElement | null;
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">축제를 선택하세요</option>';
    festivals.forEach((item) => {
      const option = iframeRef.current!.contentDocument!.createElement('option');
      option.value = item.id;
      option.textContent = `${item.title} (${item.location_name ?? ''})`;
      select.appendChild(option);
    });
    if (current) select.value = current;
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    iframe?.addEventListener('load', fillFestivals);
    fillFestivals();
    return () => iframe?.removeEventListener('load', fillFestivals);
  }, [festivals]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    const badge = doc?.getElementById('nts');
    const submit = doc?.getElementById('submitBtn') as HTMLButtonElement | null;
    const intro = doc?.getElementById('introBlock');
    if (!badge) return;
    if (!nts) {
      badge.setAttribute('style', 'display:none');
      if (submit) submit.disabled = true;
      if (intro) intro.style.display = 'none';
      return;
    }
    badge.style.display = 'block';
    badge.className = nts.data?.verified ? 'badge ok' : 'badge';
    badge.textContent = nts.data?.verified
      ? `계속사업자 확인 완료 (${nts.data.b_stt_cd})`
      : `확인 실패: ${nts.message}`;
    const ok = !!nts.data?.verified;
    if (submit) submit.disabled = !ok;
    if (intro) intro.style.display = ok ? 'block' : 'none';
  }, [nts]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.data?.source !== 'onandon-promo') return;
      if (event.data.type === 'verify') {
        const businessName = String(event.data.businessName ?? '').trim();
        const businessNumber = String(event.data.businessNumber ?? '').replace(/\D/g, '');
        if (businessName.length < 1 || businessNumber.length !== 10) {
          Alert.alert('알림', '상호명과 사업자등록번호 10자리를 입력해주세요.');
          return;
        }
        try {
          const verified = await verifyMerchant({ merchantId, businessNumber, businessName });
          setNts(verified);
          if (!verified.success) Alert.alert('사업자 확인 실패', verified.message);
        } catch (err: any) {
          const data = err?.response?.data;
          if (data) setNts(data);
          Alert.alert('사업자 확인 실패', data?.message ?? '국세청 상태조회에 실패했습니다.');
        }
      }
      if (event.data.type === 'submit') {
        if (!nts?.data?.verified || nts.data.b_stt_cd !== '01') {
          Alert.alert('알림', '국세청 계속사업자 확인 후에 등록할 수 있습니다.');
          return;
        }
        if (!String(event.data.mainMenu ?? '').trim() || !String(event.data.features ?? '').trim()) {
          Alert.alert('알림', '주요 메뉴와 특징을 입력한 뒤 쿠폰을 등록해주세요.');
          return;
        }
        if (!event.data.festivalId) {
          Alert.alert('알림', '연계할 축제를 선택해주세요.');
          return;
        }
        try {
          const res = await axios.post(`${API_BASE_URL}/api/promotions`, {
            merchant_id: merchantId,
            business_name: String(event.data.businessName ?? '').trim(),
            business_number: String(event.data.businessNumber ?? '').replace(/\D/g, ''),
            main_menu: String(event.data.mainMenu ?? '').trim(),
            features: String(event.data.features ?? '').trim(),
            festival_id: event.data.festivalId,
            title: `${festivals.find((item) => item.id === event.data.festivalId)?.title ?? ''} 제휴 할인`,
            merchant_discount_rate: parseFloat(event.data.rate),
            max_discount_amount: parseFloat(event.data.cap),
            total_quantity: parseInt(event.data.qty, 10),
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            request_matching: !!event.data.requestMatching,
            funding_type: event.data.requestMatching ? 'MATCHED' : 'MERCHANT_ONLY',
          });
          Alert.alert('등록 완료', res.data.message);
        } catch (err: any) {
          Alert.alert('등록 실패', err?.response?.data?.message ?? '서버 오류가 발생했습니다.');
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [festivals, merchantId, nts]);

  return <View ref={hostRef} style={styles.host} />;
}

const styles = StyleSheet.create({
  host: { flex: 1, minHeight: 860, backgroundColor: '#F7F8FA' },
});
