export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface FestivalPin {
  id: string;
  title: string;
  location_name?: string | null;
  latitude: number;
  longitude: number;
  start_date?: string;
  end_date?: string;
  municipality_name?: string | null;
  description?: string | null;
  distance_km?: number | null;
}

export interface MerchantPin {
  id: string;
  business_name: string;
  category: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  total_discount_rate: number;
  promotion_id: string;
  remaining_quantity?: number;
  max_discount_amount?: number | null;
}

export interface FestivalMapResponse {
  success: boolean;
  festival: FestivalPin;
  merchants: MerchantPin[];
}

export interface NearbyFestivalsResponse {
  success: boolean;
  data: FestivalPin[];
}

export interface IssueCouponResponse {
  success: boolean;
  message: string;
  data?: {
    coupon_code: string;
    already_issued?: boolean;
    remaining_quantity?: number;
  };
}
