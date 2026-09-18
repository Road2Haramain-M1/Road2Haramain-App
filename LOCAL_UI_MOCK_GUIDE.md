# Local UI mock guide

## Hajj PJH directory

The Hajj introduction's PJH List now displays all 33 entries from
`agency_info/pjh_1448H_2027M.json` in source order, three logos per row.
The existing content sheet scrolls vertically. Logos load lazily from the supplied
public Tabung Haji asset URLs; failed images display the company name instead.
Each logo is a keyboard-accessible button opening the existing shared package,
travel-plan and overview journey, with back navigation returning to that logo.
With `NEXT_PUBLIC_LOCAL_UI_MOCK=true` during development, or the explicitly
approved frontend-only Vercel mockup flag `NEXT_PUBLIC_STATIC_MOCKUP=true`, all PJHs have three fictional
offers: Standard (MYR 28,900), Comfort (MYR 35,900), and Premium (MYR 45,900).
Each has one synthetic May 2027 departure with 20 places. These are UI fixtures,
not actual offers, prices, dates or availability from the named agencies.
The typed PJH catalogue adapter makes no HTTP requests. Missing/false mock flags
return an empty package list, never synthetic offers.
The existing local receipt remains a non-persistent UI simulation, not a verified
payment or booking. No real booking/payment endpoints are invoked.
Umrah Instalment retains its existing catalogue journey.

## Umrah agency logo directory

The Umrah and Umrah Instalment introductions open a curated three-column featured
agency presentation. It shows up to 24 MOTAC-derived agency brands with an available
logo asset, and search applies only to this mockup subset. This is not a complete
directory, live licence validation, or proof that every agency has connected offers.
Back navigation restores the selected tile.

218 records reuse exact normalized-name matches from the existing PJH logo source.
28 downloaded logo files whose source URLs exactly match the existing PJH assets
are stored in `agency_info/images`, with mappings in
`agency_info/umrah_logo_assets.json`. Remaining PJH matches use the existing URL.
The read-only image handler preserves the `/images/agency-logos/` URL prefix while
serving these selected files from the centralized agency folder.
The full 1,194-office MOTAC snapshot and its deduplicated brand directory remain in
`agency_info` and the internal directory module for future verified integration. They
are intentionally not presented in this local mockup because text-only agency marks
would imply incomplete production data. Scraped candidates are not auto-published:
the latest run includes unrelated CTOS branding. No existing public asset or source
JSON was overwritten.

The typed directory catalogue maps offers only by matching licence number AND
normalized company name. In local mock mode, A&M Berkat, Andalusia Travel & Tours,
and C.S Holidays have fictional packages and one synthetic departure per package;
these are UI fixtures, not actual offers, prices, dates, or availability from the
named agencies. Other agencies show the empty-package state. Backend failures remain
retryable errors.
The frontend-only mockup uses in-browser simulated quotes, bookings and payments
solely to reach the existing receipt screen; they are lost on refresh and never call
an API. Its `NEXT_PUBLIC_STATIC_MOCKUP=true` production exception was approved only
for publicly sharing this UI mockup. It contains no credentials, customer data, real
booking capability, provider calls, or payment calls, and must not be used for UAT
or a real release. Missing/false flags use the backend with no fixture fallback.

## Journey receipt actions

LOCAL PREVIEW: The Hajj, Umrah and Umrah Instalment journey receipt offers
Download Receipt and Back to Home. Downloads are standalone HTML files containing
the displayed agency, package, travel dates, package price and simulated booking
fee. Per user approval, the UI and downloads omit preview labels. Downloads contain no remote assets and can be
printed or saved as PDF using the browser. No new API or payment bypass is added.
The existing journey does not persist a booking or verify a backend payment.
Home replaces the current route, and the receipt header back action also goes
home rather than returning to agency selection. Download before leaving if you
want to keep the preview; it is not added to booking history.

## Homepage Popular Packages

LOCAL PREVIEW: Popular Packages uses the existing configured `api.products()`
and `api.agencies()` adapters. No new endpoint or backend bypass is introduced.
It displays up to four Umrah products in catalogue order, not measured popularity.
Prices, descriptions and agency names come from the catalogue (the existing JSON
fixture in mock mode). Real-mode errors are shown, never replaced with fixtures.
Loading, empty and retryable error states are supported. See all opens the
existing Umrah journey; the preview cards do not create bookings or payments.
