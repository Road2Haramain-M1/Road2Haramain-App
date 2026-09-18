import type { Agency, Product } from "@/lib/api/types";
import type { PilgrimageCatalogueService } from "./catalogue-service";
import { pjhDirectory } from "./pjh-directory";
import { presentationDemoEnabled } from "@/lib/config/presentation-demo";

const agencies: Agency[] = pjhDirectory.agencies.map(agency => ({
  id: agency.id, name: agency.name, address: "", phone: "", license_no: "",
  services: "Hajj", office_type: "", expiry_date: "",
}));

const packageOptions = [
  { id: "standard", name: "Hajj Standard Package", price: "28900.00", days: "25 days / 24 nights", end: "2027-05-29" },
  { id: "comfort", name: "Hajj Comfort Package", price: "35900.00", days: "22 days / 21 nights", end: "2027-05-26" },
  { id: "premium", name: "Hajj Premium Package", price: "45900.00", days: "18 days / 17 nights", end: "2027-05-22" },
];

const products: Product[] = agencies.flatMap(agency => packageOptions.map(option => ({
  id: `mock-${agency.id}-${option.id}`, provider_id: agency.id, category: "hajj",
  name_en: option.name, name_ms: option.name, description_en: option.days,
  description_ms: option.days, unit_price: option.price, currency: "MYR",
})));

/** Synthetic offers only: never calls providers, creates bookings, or processes payments. */
const mockPjhCatalogue: PilgrimageCatalogueService = {
  agencies: async () => agencies,
  products: async () => products,
  departures: async productId => {
    if (!products.some(product => product.id === productId)) return [];
    const option = packageOptions.find(option => productId.endsWith(`-${option.id}`));
    if (!option) return [];
    return [{ id: `${productId}-may-2027`, product_id: productId,
      start_date: "2027-05-05", end_date: option.end, capacity_available: 20 }];
  },
};

/** No real PJH catalogue is connected yet. Never substitute synthetic offers in real mode. */
const unavailablePjhCatalogue: PilgrimageCatalogueService = {
  agencies: async () => agencies,
  products: async () => [],
  departures: async () => [],
};

export const pjhCatalogueService: PilgrimageCatalogueService =
  presentationDemoEnabled
    ? mockPjhCatalogue : unavailablePjhCatalogue;
