export type Agency = { id: string; name: string; address: string; phone: string; license_no: string; services: string; office_type: string; expiry_date: string };

export type Product = {
  id: string;
  provider_id: string;
  category: string;
  name_en: string;
  name_ms: string;
  description_en: string;
  description_ms: string;
  unit_price: string;
  currency: string;
};

export type Departure = {
  id: string;
  product_id: string;
  start_date: string;
  end_date: string;
  capacity_available: number;
};

export type Quote = {
  id: string;
  product_id: string;
  departure_id: string;
  traveller_count: number;
  unit_price: string;
  total_amount: string;
  currency: string;
  expires_at: string;
};

export type Payment = {
  id: string;
  reference: string;
  state: "CREATED" | "PROCESSING" | "UNKNOWN" | "SUCCEEDED" | "FAILED" | "REFUND_PENDING" | "REFUNDED";
  amount: string;
  currency: string;
};

export type Booking = {
  id: string;
  reference: string;
  state: string;
  product_id: string;
  departure_id: string;
  total_amount: string;
  currency: string;
  hold_expires_at: string;
  payment: Payment | null;
  scenario: string;
  created_at: string;
  demo: true;
  package_name?: string;
  agency_name?: string;
  booking_fee?: string;
  start_date?: string;
  end_date?: string;
  remarks?: string;
  status_updates?: { label: string; date: string; detail: string }[];
};

export type TravellerInput = {
  full_name: string;
  nationality: string;
  date_of_birth: string;
  contact: string;
};
