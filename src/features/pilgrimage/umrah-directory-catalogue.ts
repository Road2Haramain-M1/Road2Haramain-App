import type { PilgrimageCatalogueService } from "./catalogue-service";
import { normalizeAgencyName, type UmrahDirectoryAgency } from "./umrah-directory";

/** Resolve directory identity to provider inventory without inventing offers.
 * Requires an exact licence and normalized name match. Errors propagate; there is
 * no fixture fallback, and branches never inherit headquarters inventory implicitly.
 */
export function createUmrahDirectoryCatalogue(
  agency: UmrahDirectoryAgency,
  source: PilgrimageCatalogueService,
): PilgrimageCatalogueService {
  return {
    agencies: async () => [agency],
    products: async () => {
      const [providers, products] = await Promise.all([source.agencies(), source.products()]);
      const matchingIds = new Set(providers.filter(provider =>
        provider.license_no === agency.license_no && normalizeAgencyName(provider.name) === normalizeAgencyName(agency.name),
      ).map(provider => provider.id));
      return products.filter(product => matchingIds.has(product.provider_id) && product.category === "umrah")
        .map(product => ({ ...product, provider_id: agency.id }));
    },
    departures: productId => source.departures(productId),
  };
}
