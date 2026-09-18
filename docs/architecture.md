# Frontend directory presentation

## PJH and Umrah agency tiles

PJH and Umrah share `AgencyLogoTile` and the existing PJH grid CSS. Headers,
spacing, three-column layout, square tiles, and navigation remain within the
existing pilgrimage shell. Company-name fallbacks are limited to three visible
lines to fit narrow tiles; full names remain in accessible labels and tooltips.

The Umrah directory is normalized from the supplied MOTAC snapshot independently
of bookable inventory. Each office retains its snapshot record hash as an ID.
It loads on demand when the Umrah list opens, avoiding the large snapshot in the
initial Hajj/instalment bundles and showing an explicit loading state.
Existing PJH logos are matched by normalized company name only for presentation.
Locally collected copies are used only when their source URLs exactly match the
existing PJH assets; their mapping lives in `agency_info/umrah_logo_assets.json`.
Unreviewed scraper manifests are not application data sources.
The collection tools live under `agency_info/scripts/`, selected PNGs under
`agency_info/images/`, and references/mappings at `agency_info/`. Generated collection
results go to the system temporary directory under `r2h-agency-data`, not the repo.
The read-only `/images/agency-logos/[filename]` handler retains existing image URLs,
serves only names in the selected logo mapping, and never exposes scripts or arbitrary
files. These PNGs are explicitly included in deployment file tracing. `scripts/` at
the root holds app checks only. Collectors never automatically replace canonical data.

`createUmrahDirectoryCatalogue` adapts a selected directory office to the typed
`PilgrimageCatalogueService`. It resolves provider IDs using exact licence plus
normalized company name, filters Umrah products, and preserves product/departure
identities. It does not attach headquarters offers to unmatched branches, create
offers, suppress backend failures, or modify booking/payment orchestration.

The existing configured API client remains the inventory source. Local fixtures
require explicit non-production mock configuration; production cannot select them.
The static directory remains visible without a backend, but package retrieval
errors stay errors. There is no real-to-mock fallback.
