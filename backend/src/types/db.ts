export interface Municipality {
  id: string;
  name: string;
  region_code: string;
  budget_balance: number;
  created_at: string;
}

export interface Festival {
  id: string;
  municipality_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Merchant {
  id: string;
  owner_user_id: string;
  municipality_id: string;
  business_name: string;
  business_number: string;
  category: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  bank_name: string | null;
  bank_account_number: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface DiscountPromotion {
  id: string;
  merchant_id: string;
  festival_id: string | null;
  title: string;
  merchant_discount_rate: number;
  gov_matching_rate: number;
  total_discount_rate: number; // GENERATED 컬럼
  max_discount_amount: number | null;
  total_quantity: number;
  remaining_quantity: number;
  start_time: string;
  end_time: string;
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';
  created_at: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  promotion_id: string;
  coupon_code: string;
  status: 'ISSUED' | 'USED' | 'EXPIRED';
  issued_at: string;
  used_at: string | null;
}

export interface SettlementTransaction {
  id: string;
  user_coupon_id: string;
  merchant_id: string;
  municipality_id: string;
  original_amount: number;
  merchant_discount_amount: number;
  gov_support_amount: number;
  final_paid_amount: number;
  settlement_status: 'PENDING' | 'COMPLETED';
  settled_at: string | null;
  created_at: string;
}
