# R2H frontend scaffold

Frontend/backend connection plan and current compatibility audit:
[connection specification](docs/frontend-backend-connection-spec.md).
Next implementation tasks are tracked in [next implementation reminder](docs/next-implementation.md).

Run `npm install`, copy `.env.example` to `.env.local` if needed, then run
`npm run dev`. Open http://localhost:3000/hajj.

`NEXT_PUBLIC_LOCAL_UI_MOCK=true` explicitly enables the local PJH dummy packages
in development. Set it to `false` and restart to see the unconnected catalogue's
empty state. Production never serves these dummy packages, even if the flag is true.
See `LOCAL_UI_MOCK_GUIDE.md` for the fixture details and simulation limitations.

With mock mode disabled, browser API calls use the same-origin `/api/r2h` route
and are proxied to `R2H_BACKEND_URL` (default `http://localhost:8000/api/v1`).
`R2H_BACKEND_URL` is server-only; use `NEXT_PUBLIC_API_URL` only for explicitly
configured local diagnostics.

Checks: `npx tsc --noEmit`, `npm run build`, and (with the development server running
and Microsoft Edge installed) `npx playwright test --config playwright.pjh.config.ts`.
The inherited `npm run lint` script uses removed `next lint` and needs a separate
ESLint configuration migration.

The Umrah and Umrah Instalment mock directories show a curated set of up to 24
logo-backed MOTAC-derived agency brands. The complete MOTAC source remains internal
for future verified integration. See `LOCAL_UI_MOCK_GUIDE.md` for catalogue matching
and empty states. Run `npx playwright test --config playwright.umrah.config.ts`
against the local development server for directory, adapter, and mock-isolation checks.

## Agency data and collection tools

```text
agency_info/                    Hajj/Umrah JSON references and local-logo mapping
  images/                       Selected agency logos displayed by the app
  scripts/                      Collectors, dependencies, tests, optional website CSV
scripts/                        Frontend verification scripts only
```

The app never reads scraper output folders directly. Collection does not update the
app automatically. Temporary scraper results and caches are written outside the
repository, under the system temporary directory's `r2h-agency-data` folder.

See [application data](agency_info/README.md) and
[collection instructions](agency_info/scripts/README.md). Old generated folders in
`tools/agency-data/workspace` are unused leftovers; their deletion was blocked by the
execution environment and must be completed manually.
