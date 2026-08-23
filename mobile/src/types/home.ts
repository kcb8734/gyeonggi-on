export type FestivalCategory = '먹거리' | '체험' | '공연' | '문화/예술' | '가족' | '계절축제' | '플리마켓';

export interface HomeFestival {
  id: string;
  title: string;
  location_name?: string | null;
  latitude: number;
  longitude: number;
  start_date?: string;
  end_date?: string;
  municipality_name?: string | null;
  description?: string | null;
  category?: FestivalCategory | string;
  image_url?: string | null;
  is_trending?: boolean;
  contentId?: string;
  contentTypeId?: string;
  source?: 'tour' | 'db' | 'gov';
  summary?: string;
  rewardEnabled?: boolean;
  tel?: string;
  inquiryTel?: string;
  managerEmail?: string;
  managerPhone?: string;
  fee?: string;
}

export interface QrScanRecord {
  at: string;
  amountWon: number;
  title?: string;
  code?: string;
}

export interface HomePromotion {
  id: string;
  title: string;
  festival_id?: string | null;
  festival_title?: string | null;
  festivalStartDate?: string;
  festivalEndDate?: string;
  business_name?: string;
  businessNumber?: string;
  merchant_discount_rate: number;
  gov_matching_rate: number;
  total_discount_rate: number;
  remaining_quantity: number;
  total_quantity?: number;
  funding_type?: 'MERCHANT_ONLY' | 'MATCHED';
  matching_status?: string;
  metro?: string;
  municipality_name?: string | null;
  main_menu?: string;
  features?: string;
  exterior_image_url?: string | null;
  interior_image_url?: string | null;
  address?: string | null;
  latitude?: number;
  longitude?: number;
  gps_confirmed?: boolean;
  tel?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  qrConfirmCount?: number;
  lastQrAt?: string;
  qrScans?: QrScanRecord[];
  settledAt?: string;
  settlementAmount?: number;
  managerEmail?: string;
  maxDiscountAmount?: number;
}

export interface HomeFeed {
  success: boolean;
  available: boolean;
  message?: string;
  metro: string;
  festivals: HomeFestival[];
  promotions: HomePromotion[];
  popular: HomeFestival[];
}
