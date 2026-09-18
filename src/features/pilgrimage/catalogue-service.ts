import type { Agency, Departure, Product } from "@/lib/api/types";

/** Normalized catalogue contract shared by the existing journey and local PJH adapter. */
export interface PilgrimageCatalogueService {
  agencies(): Promise<Agency[]>;
  products(): Promise<Product[]>;
  departures(productId: string): Promise<Departure[]>;
}
