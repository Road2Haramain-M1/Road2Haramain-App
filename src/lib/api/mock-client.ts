import data from "./mock-data.json";
import type { Agency, Booking, Departure, Payment, Product, Quote, TravellerInput } from "./types";

const quotes = new Map<string, Quote>();
const presentationBookings: Booking[] = [];
let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

function getProduct(productId: string): Product {
  const product = data.products.find((item) => item.id === productId);
  if (!product) throw new Error("This fictional package is no longer available.");
  return product;
}

function getDeparture(productId: string, departureId: string): Departure {
  const departures = data.departures[productId as keyof typeof data.departures] ?? [];
  const departure = departures.find((item) => item.id === departureId);
  if (!departure) throw new Error("This fictional travel plan is no longer available.");
  return departure;
}

/**
 * Browser-only presentation adapter for the approved public mockup.
 *
 * It creates fictional quotes, bookings, and payment confirmations entirely in
 * memory. It never sends a request or persists traveller details, so a refresh
 * intentionally clears the simulated booking history.
 */
export const mockApi = {
  bookings: async (): Promise<Booking[]> => [...presentationBookings, ...(data.bookings as unknown as Booking[])],
  agencies: async (): Promise<Agency[]> => data.agencies,
  products: async (): Promise<Product[]> => data.products,
  departures: async (productId: string): Promise<Departure[]> => data.departures[productId as keyof typeof data.departures] ?? [],
  quote: async (productId: string, departureId: string, travellerCount: number): Promise<Quote> => {
    const product = getProduct(productId);
    getDeparture(productId, departureId);
    const quote: Quote = {
      id: nextId("mock-quote"),
      product_id: productId,
      departure_id: departureId,
      traveller_count: travellerCount,
      unit_price: product.unit_price,
      total_amount: (Number(product.unit_price) * travellerCount).toFixed(2),
      currency: product.currency,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    quotes.set(quote.id, quote);
    return quote;
  },
  booking: async (quoteId: string, _travellers: TravellerInput[], scenario: string): Promise<Booking> => {
    const quote = quotes.get(quoteId);
    if (!quote) throw new Error("This fictional quote has expired. Please try again.");
    const product = getProduct(quote.product_id);
    const departure = getDeparture(quote.product_id, quote.departure_id);
    const agency = data.agencies.find((item) => item.id === product.provider_id);
    const booking: Booking = {
      id: nextId("mock-booking"),
      reference: `R2H-DEMO-${String(sequence).padStart(4, "0")}`,
      state: "CONFIRMED",
      product_id: quote.product_id,
      departure_id: quote.departure_id,
      total_amount: quote.total_amount,
      currency: quote.currency,
      hold_expires_at: quote.expires_at,
      payment: null,
      scenario,
      created_at: new Date().toISOString(),
      demo: true,
      package_name: product.name_en,
      agency_name: agency?.name,
      start_date: departure.start_date,
      end_date: departure.end_date,
    };
    presentationBookings.unshift(booking);
    return booking;
  },
  payment: async (bookingId: string): Promise<Payment> => {
    const booking = presentationBookings.find((item) => item.id === bookingId);
    if (!booking) throw new Error("This fictional booking was not found.");
    const payment: Payment = {
      id: nextId("mock-payment"),
      reference: `R2H-PAY-DEMO-${String(sequence).padStart(4, "0")}`,
      state: "SUCCEEDED",
      amount: booking.total_amount,
      currency: booking.currency,
    };
    booking.payment = payment;
    return payment;
  },
};
