import data from "./mock-data.json";
import type { Agency, Booking, Departure, Product } from "./types";

export const mockApi = {
  bookings: async (): Promise<Booking[]> => data.bookings as unknown as Booking[],
  agencies: async (): Promise<Agency[]> => data.agencies,
  products: async (): Promise<Product[]> => data.products,
  departures: async (productId: string): Promise<Departure[]> => data.departures[productId as keyof typeof data.departures] ?? [],
};
