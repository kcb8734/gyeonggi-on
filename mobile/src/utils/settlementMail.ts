import { Linking } from 'react-native';

export { matchingAmountWon, settlementFromScans } from './settlementAmounts';

export function openSettlementMail(input: {
  to: string;
  businessName: string;
  festivalTitle?: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  qrCount: number;
  amountWon: number;
}) {
  const to = input.to.trim();
  if (!to) return Promise.reject(new Error('메일 주소가 없습니다.'));
  const subject = encodeURIComponent(`[온앤온+] ${input.businessName} 지자체 매칭 정산 요청`);
  const body = encodeURIComponent(
    [
      '지자체 담당자님께',
      '',
      `상가명: ${input.businessName}`,
      `연계 축제: ${input.festivalTitle ?? '-'}`,
      `QR 쿠폰 확인 건수: ${input.qrCount.toLocaleString('ko-KR')}건`,
      `매칭 정산 요청액: ${input.amountWon.toLocaleString('ko-KR')}원`,
      '',
      '입금 계좌',
      `은행: ${input.bankName}`,
      `계좌: ${input.bankAccount}`,
      `예금주: ${input.bankHolder}`,
      '',
      '카운터에서 QR 촬영으로 확인한 건수를 기준으로 매칭 금액을 입금해 주세요.',
      '온앤온+(on&on+)',
    ].join('\n'),
  );
  return Linking.openURL(`mailto:${to}?subject=${subject}&body=${body}`);
}
