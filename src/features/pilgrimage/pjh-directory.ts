import directory from "../../../agency_info/pjh_1448H_2027M.json";

export type PjhAgency = {
  id: string;
  name: string;
  logoUrl: string;
};

/** User-supplied seasonal directory, independent of booking-provider catalogue IDs. */
export const pjhDirectory = {
  season: `${directory.season_hijri} / ${directory.season_gregorian}`,
  agencies: directory.pjh.map((agency): PjhAgency => ({
    id: `pjh-${directory.season_hijri}-${agency.record_no}`,
    name: agency.company_name,
    logoUrl: agency.logo_url,
  })),
};
