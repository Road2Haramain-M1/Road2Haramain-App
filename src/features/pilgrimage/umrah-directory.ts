import directory from "../../../agency_info/motac_umrah_agencies.json";
import localLogos from "../../../agency_info/umrah_logo_assets.json";
import { pjhDirectory } from "./pjh-directory";
import type { Agency } from "@/lib/api/types";

export type UmrahDirectoryAgency = Agency & { logoUrl?: string };
export type UmrahAgencyBrand = UmrahDirectoryAgency & { branches: UmrahDirectoryAgency[] };

/** Match punctuation variants only; never fuzzy-match unrelated agency brands. */
export function normalizeAgencyName(name: string): string {
  return name.normalize("NFKC").toLowerCase().replaceAll("&", "and").replace(/[^a-z0-9]/g, "");
}

const existingLogos = new Map(pjhDirectory.agencies.map(agency => [normalizeAgencyName(agency.name), agency.logoUrl]));
for (const logo of localLogos) existingLogos.set(normalizeAgencyName(logo.name), logo.logoUrl);

/** Public directory metadata, not bookable inventory or a live licence verification.
 * Unreviewed scrape results are excluded: several contain directory-site logos.
 */
export const umrahDirectory: UmrahDirectoryAgency[] = directory.agencies.map(agency => ({
  id: `motac-${agency.record_hash}`, name: agency.company_name, address: agency.address,
  phone: agency.phones.join(" / "), license_no: agency.license_no,
  services: agency.business_scope.join(", "), office_type: agency.office_type,
  expiry_date: agency.license_end_date,
  logoUrl: existingLogos.get(normalizeAgencyName(agency.company_name)),
}));

/**
 * Customer-facing agency brands derived from the licensed office records.
 * Office records remain available in `branches` for verification and package
 * matching, while the primary directory shows one tile per normalized brand.
 */
export const umrahAgencyBrands: UmrahAgencyBrand[] = Array.from(
  umrahDirectory.reduce((groups, office) => {
    const key = normalizeAgencyName(office.name);
    const offices = groups.get(key) ?? [];
    offices.push(office);
    groups.set(key, offices);
    return groups;
  }, new Map<string, UmrahDirectoryAgency[]>()).values(),
).map(branches => {
  const representative = [...branches].sort((a, b) => Number(a.office_type !== "Ibu Pejabat") - Number(b.office_type !== "Ibu Pejabat"))[0];
  return { ...representative, branches };
});

/**
 * Deliberately limited logo-backed subset for the local UI mock.
 *
 * The full MOTAC snapshot remains in `umrahAgencyBrands` for future verified
 * directory integration. Showing hundreds of text-only marks in the mock would
 * misleadingly look like incomplete production data.
 */
export const featuredUmrahAgencyBrands = umrahAgencyBrands
  .filter(agency => Boolean(agency.logoUrl))
  .slice(0, 24);
