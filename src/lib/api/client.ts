import type { Agency, Booking, Departure, Payment, Product, Quote, TravellerInput } from "./types";
import { mockApi } from "./mock-client";
import { isUiMockEnabled } from "./mock-mode";

// Browser requests use the same-origin BFF by default; direct backend access
// remains opt-in for local diagnostics through NEXT_PUBLIC_API_URL.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/r2h";
// Fixture-only mode never reaches the BFF or an external provider.
const USE_MOCK_API = isUiMockEnabled;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? "The demo service could not complete this request.");
  }
  return response.json() as Promise<T>;
}

export const api = {
  agencies: () => USE_MOCK_API ? mockApi.agencies() : request<Agency[]>("/agencies?category=umrah"),
  products: () => USE_MOCK_API ? mockApi.products() : request<Product[]>("/catalogue/products?category=umrah"),
  departures: (productId: string) => USE_MOCK_API ? mockApi.departures(productId) : request<Departure[]>(`/catalogue/products/${productId}/departures`),
  quote: (productId: string, departureId: string, travellerCount: number) => USE_MOCK_API
    ? mockApi.quote(productId, departureId, travellerCount)
    : request<Quote>("/quotes", { method: "POST", body: JSON.stringify({ product_id: productId, departure_id: departureId, traveller_count: travellerCount }) }),
  booking: (quoteId: string, travellers: TravellerInput[], scenario: string, key: string) => USE_MOCK_API
    ? mockApi.booking(quoteId, travellers, scenario, key)
    : request<Booking>("/bookings", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify({ quote_id: quoteId, travellers, scenario }) }),
  payment: async (bookingId: string, scenario: string, key: string) => {
    const response = USE_MOCK_API
      ? await mockApi.payment(bookingId, scenario, key)
      : await request<Payment | Booking>("/payments", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify({ booking_id: bookingId, scenario }) });
    if ("payment" in response && response.payment) return response.payment;
    return response as Payment;
  },
  confirmPayment: (paymentId: string) => USE_MOCK_API ? mockApi.confirmPayment(paymentId) : request<Booking>(`/demo/payments/${paymentId}/confirm`, { method: "POST" }),
  providerOutcome: (bookingId: string, outcome: string) => USE_MOCK_API ? mockApi.providerOutcome(bookingId, outcome) : request<Booking>(`/demo/bookings/${bookingId}/provider-outcome`, { method: "POST", body: JSON.stringify({ outcome }) }),
  bookings: async () => {
    if (USE_MOCK_API) return mockApi.bookings();
    const response = await request<{ items: Booking[] } | Booking[]>("/bookings");
    return Array.isArray(response) ? response : response.items;
  },
  operationsBookings: () => USE_MOCK_API ? mockApi.operationsBookings() : request<Booking[]>("/operations/bookings"),
  requestCancellation: (bookingId: string) => USE_MOCK_API ? mockApi.requestCancellation(bookingId) : request<Booking>(`/bookings/${bookingId}/cancellation`, { method: "POST" }),
  decideCancellation: (bookingId: string, approve: boolean) => USE_MOCK_API ? mockApi.decideCancellation(bookingId, approve) : request<Booking>(`/operations/bookings/${bookingId}/cancellation`, { method: "POST", body: JSON.stringify({ approve, reason: approve ? "Approved in app" : "Declined in app" }) }),
};
