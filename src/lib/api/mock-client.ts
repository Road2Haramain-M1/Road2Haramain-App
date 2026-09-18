import data from "./mock-data.json";
import type { Agency, Booking, Departure, Payment, Product, Quote, TravellerInput } from "./types";

const quotes = new Map<string, Quote>();
const bookings = new Map<string, Booking>();
let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

function productFor(productId: string): Product {
  const product = data.products.find(item => item.id === productId);
  if (!product) throw new Error("Mock package not found.");
  return product;
}

function createPayment(booking: Booking): Payment {
  return {
    id: nextId("mock-payment"),
    reference: `PAY-${booking.id.slice(-8)}`,
    state: "SUCCEEDED",
    amount: booking.total_amount,
    currency: booking.currency,
  };
}

/** In-browser fixture adapter used only for local development and the public UI mockup. */
const fixtureApi = {
  quote: async (productId: string, departureId: string, travellerCount: number): Promise<Quote> => {
    const product = productFor(productId);
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
  booking: async (quoteId: string, _travellers: TravellerInput[], scenario: string, _key: string): Promise<Booking> => {
    const quote = quotes.get(quoteId);
    if (!quote) throw new Error("Mock quote not found.");
    const product = productFor(quote.product_id);
    const booking: Booking = {
      id: nextId("mock-booking"),
      reference: `R2H-${Date.now().toString().slice(-8)}`,
      state: "AWAITING_PAYMENT",
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
    };
    bookings.set(booking.id, booking);
    return booking;
  },
  payment: async (bookingId: string, _scenario: string, _key: string): Promise<Payment> => {
    const booking = bookings.get(bookingId);
    if (!booking) throw new Error("Mock booking not found.");
    const payment = createPayment(booking);
    bookings.set(bookingId, { ...booking, state: "CONFIRMED", payment });
    return payment;
  },
  confirmPayment: async (_paymentId: string): Promise<Booking> => {
    throw new Error("Payment confirmation is not available in the UI mockup.");
  },
  providerOutcome: async (bookingId: string, _outcome: string): Promise<Booking> => {
    const booking = bookings.get(bookingId);
    if (!booking) throw new Error("Mock booking not found.");
    return booking;
  },
  operationsBookings: async (): Promise<Booking[]> => [],
  requestCancellation: async (bookingId: string): Promise<Booking> => {
    const booking = bookings.get(bookingId);
    if (!booking) throw new Error("Mock booking not found.");
    const cancelled = { ...booking, state: "CANCELLED" };
    bookings.set(bookingId, cancelled);
    return cancelled;
  },
  decideCancellation: async (bookingId: string, approve: boolean): Promise<Booking> => {
    const booking = bookings.get(bookingId);
    if (!booking) throw new Error("Mock booking not found.");
    const updated = { ...booking, state: approve ? "CANCELLED" : booking.state };
    bookings.set(bookingId, updated);
    return updated;
  },
};

export const mockApi = {
  bookings: async (): Promise<Booking[]> => [...(data.bookings as unknown as Booking[]), ...bookings.values()],
  agencies: async (): Promise<Agency[]> => data.agencies,
  products: async (): Promise<Product[]> => data.products,
  departures: async (productId: string): Promise<Departure[]> => data.departures[productId as keyof typeof data.departures] ?? [],
  ...fixtureApi,
};
