<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Road2Haramain Replacement Engineering Contract

## Objective

### Approved current workspace (2026-09-15)

The current `r2h-platform-next-frontend-scaffold-archive/` directory is the
existing Next.js frontend and the approved workspace for continued platform
development. Add the new FastAPI backend under `backend/` inside this directory.
This supersedes the earlier requirement to build in a sibling `r2h-platform-next/`
repository. Do not create another frontend, move this frontend into `frontend/`,
or rename or relocate the current project unless separately requested.
Preserve the existing layout, icons, generated service images, and UI integration.

Extend this existing frontend with a maintainable backend in the same workspace while preserving the approved R2H user experience and future MiPAY compatibility.

The platform contains the existing Next.js frontend and a new FastAPI modular-monolith demo backend at `./backend/`. The legacy `r2h-miniapp/` frontend and sibling CodeIgniter backend outside this workspace are read-only references and remain authoritative for existing users and transactions. The legacy sibling backend is not the new `./backend/`; verify resolved paths before accessing either. Preserve all working and uncommitted changes in the references. Do not modify the separate `r2h-platform-next/` project unless explicitly requested.

The replacement must be plug-and-play:

- A service can be enabled, disabled, mocked, or connected without changing unrelated services.
- UI components must not depend directly on MiPay response formats.
- Mock and real integrations must implement the same typed interface.
- Switching environments must be configuration-driven, not a manual code rewrite.

## Existing visual contract

Preserve these characteristics unless an approved design specification says otherwise:

- Mobile-first mini-app shell with a maximum width of `430px` on larger screens.
- Existing green palette and CSS tokens in `src/app/globals.css`.
- Page background, spacing rhythm, typography hierarchy, and interaction flow.
- Existing SVG and PNG assets in `public/`; do not redraw or replace icons without approval.
- Header: green background, `px-4 py-5`, 17px labels, current back-arrow asset and behavior.
- Main content padding: generally `p-4`.
- Primary content surfaces: white, usually `rounded-[24px]`.
- Nested/selectable surfaces: usually `rounded-[16px]`.
- Primary action: full width, `53px` high, pill shape, 13px semibold label.
- Quick-service icon container: `63px`; icon artwork: `24px`; service label: `13px` semibold.
- Common body copy: `15px`; common section title: `17px` semibold.

Before changing a shared visual measurement, search for every use and confirm the change is intentional across the application.

## Architecture target

Organize new functionality into four boundaries:

```text
UI page/component
  -> feature use-case or hook
    -> service interface
      -> mock adapter or MiPay HTTP adapter
```

## Target repository structure

Extend the current structure in place. The earlier sibling-project and nested `frontend/` proposals are superseded. The backend and supporting directories below are targets to create only as needed; do not restructure existing frontend files merely to match this outline.

```text
r2h-platform-next-frontend-scaffold-archive/
├── AGENTS.md
├── README.md
├── package.json                 # Existing frontend scripts and dependencies
├── src/
│   ├── app/                     # Routes, layouts, and BFF route handlers
│   ├── features/                # Feature-specific UI and use cases
│   ├── components/ui/           # Generic accessible primitives
│   ├── components/patterns/     # Shared application patterns
│   ├── components/domain/       # Reusable domain presentation
│   ├── host/                    # Demo and future MiPAY host adapters
│   ├── lib/api/                 # Typed backend client and error mapping
│   └── lib/i18n/                # English/BM messages and RTL preparation
├── public/                      # Existing approved visual assets
├── tests/                       # Frontend tests
├── backend/
│   ├── app/main.py
│   ├── app/modules/             # Modular domain/application/API boundaries
│   ├── app/integrations/        # Mock, MiPAY, legacy, and provider adapters
│   ├── app/platform/            # Config, authz, audit, outbox, observability
│   ├── app/shared/              # Money, IDs, time, pagination
│   ├── app/workers/             # Recovery, expiry, notifications
│   ├── migrations/              # Alembic migrations
│   └── tests/
├── contracts/                   # OpenAPI, events, compatibility fixtures
├── infra/                       # Local containers and deployment templates
├── scripts/                     # Setup, seed, reset, and verification
└── docs/
    ├── architecture.md
    ├── assumptions-and-decisions.md
    ├── current-system-audit.md
    ├── current-milestone.md
    ├── integration-contract.md
    ├── local-development.md
    ├── service-status.md
    └── visual-contract.md
```

Structure rules:

- `src/app/` owns routes, layouts, and backend-for-frontend route handlers; pages remain thin and business rules belong in the backend.
- `src/features/` owns feature behavior and feature-specific UI.
- `src/components/ui/` contains generic primitives with no R2H business logic.
- `src/components/patterns/` and `src/components/domain/` contain proven shared behavior.
- `backend/app/modules/` owns domain rules and persistence through public module interfaces.
- `backend/app/integrations/` is the only backend area allowed to understand raw provider response shapes.
- `contracts/` contains generated/shared external contracts, not duplicated handwritten domain models.
- Backend configuration is the source of truth for service and provider availability.
- Tests mirror contracts and behavior; do not mirror every implementation folder mechanically.
- Avoid barrel files at repository level. Feature-level `index.ts` files may expose a deliberate public API.

### UI layer

- UI components receive normalized domain data and callbacks.
- UI components must not know MiPay endpoint paths, wallet parameter names, or raw response envelopes.
- Keep route pages thin; compose feature components rather than placing business logic in `page.tsx`.
- Reuse shared components from `src/components/ui` for buttons, headers, errors, loading states, and dialogs.

### Feature layer

Each service belongs under:

```text
src/features/<service>/
  components/
  hooks/
  types.ts
  constants.ts
  service.ts
```

Only create folders that are needed. A service should expose a small public surface through an `index.ts` when it has multiple internal modules.

### Integration layer

Place external-system concerns behind adapters, for example:

```text
src/lib/integrations/mipay/
src/lib/integrations/mock/
```

Use a typed interface for every capability. Example:

```ts
export interface UmrahService {
  checkEligibility(session: WalletSession): Promise<Eligibility>
  listAgencies(session: WalletSession): Promise<Agency[]>
  listPackages(session: WalletSession, agencyId: string): Promise<UmrahPackage[]>
  listTravelPlans(session: WalletSession, packageId: string): Promise<TravelPlan[]>
  createBooking(session: WalletSession, input: BookingInput): Promise<Booking>
}
```

Both the mock adapter and MiPay adapter must satisfy the same interface. Normalize external response fields inside the MiPay adapter or server route, not inside React components.

### Service registry

Quick Services must be driven by one typed registry rather than scattered route conditions. Each entry should support:

```ts
type ServiceDefinition = {
  id: string
  name: string
  icon: string
  href: string
  status: 'active' | 'preview' | 'coming-soon'
  capabilities?: string[]
}
```

The registry controls visibility and status. Adding a service should normally require adding its feature module, route, adapter implementation, and one registry entry.

## Authentication and host integration

Preserve the current MiPay launch contract until the owning team approves a change:

```text
/?WalletUserSessToken=<valid-token>
```

Rules:

- Never hardcode real wallet IDs, session tokens, credentials, API keys, or UAT customer data.
- Never log session tokens or include them in user-visible errors.
- Keep host authentication separate from feature UI.
- Store access to browser session data behind a small session utility instead of repeating local-storage keys throughout features.
- Real mode must fail safely when the session is missing or expired.
- Redirect URLs must be configuration values, not duplicated literals.

## Mock and real modes

The existing reference frontend's temporary local preview is controlled by:

```env
NEXT_PUBLIC_LOCAL_UI_MOCK=true
```

Development rules:

- Mock mode must never call real payment, booking, consent, or authenticated customer endpoints.
- Mock data must be obviously fictional and contain no personal data.
- Mock flows must cover loading, success, empty, and error states where practical.
- Environment switching must not require editing TypeScript source files.
- Document every new mock endpoint or bypass in `LOCAL_UI_MOCK_GUIDE.md` in the same change.

Before handing off a change, test both configurations when the affected code touches environment selection or authentication.

The replacement platform uses explicit server-side environment and adapter configuration, such as `APP_ENV=demo`, `IDENTITY_PROVIDER=mock`, `PAYMENT_PROVIDER=mock`, and `BOOKING_PROVIDER=mock`. Browser-visible flags are presentation hints only and never select authoritative payment or booking behavior.

## Current functional-demo milestone

The current deliverable is a persistent synthetic demonstration that requires no MiPAY credentials or external provider APIs:

```text
Demo identity
  -> Umrah catalogue
  -> package/date selection
  -> traveller details
  -> 15-minute server quote
  -> booking and inventory hold
  -> simulated backend-authoritative payment
  -> simulated provider confirmation
  -> booking history
  -> operations/admin exception handling
```

Required demo rules:

- Currency is MYR.
- First milestone uses full payment only; no deposits or instalments.
- Each order contains one provider and one currency.
- Server calculates fictional per-traveller prices and the complete displayed total.
- Quotes expire after 15 minutes.
- Synthetic inventory is persisted and allocated atomically.
- Reservation holds last no longer than the quote.
- Synthetic traveller fields include name, nationality, date of birth, and relevant contact details.
- Provider confirmation supports success, rejection, and delayed outcomes.
- Pre-service cancellation requires operator approval and produces a simulated full refund when approved.
- Cancellation after service start routes to operator review.
- Paid but unfulfilled bookings become `ACTION_REQUIRED`; payment success remains recorded.
- Payment timeout remains pending until backend recovery resolves it.
- Browser redirects and callbacks never directly mark payment as successful.

After this journey passes its acceptance criteria, add transport or wheelchair rental through the same catalogue, quote, booking, payment, notification, status, and history services. Do not clone checkout or booking orchestration.

The other five product modules remain in scope for later milestones. Completing this milestone does not represent completion of the six-module demo.

## Mandatory guardrails

These rules are non-negotiable unless the user explicitly approves an exception and the reason is documented.

### Environment guardrails

- Validate environment variables at application startup through one typed configuration module.
- Production and UAT must fail closed when required API URLs or integration settings are missing.
- Mock mode must be rejected when `NODE_ENV=production`.
- Never infer mock mode from an unavailable backend or failed request.
- Never silently fall back from real data to mock data.
- Keep `.env.example` free of secrets and document every supported variable.

The mock-mode condition must include a production safeguard equivalent to:

```ts
const mockEnabled =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_LOCAL_UI_MOCK === 'true'
```

### Authentication and privacy guardrails

- Treat wallet IDs, session tokens, consent tokens, mobile numbers, and customer identifiers as sensitive data.
- Do not place sensitive values in source code, fixtures, URLs beyond the required launch contract, analytics, logs, screenshots, or error reports.
- Do not persist sensitive session values longer than required by the host contract.
- Prefer memory or session-scoped storage over long-lived local storage when the integration contract permits it.
- Clear local session data on logout, invalid session, consent rejection, and environment changes.
- Do not expose upstream authentication responses directly to the browser.
- Mask identifiers in support-facing diagnostics.

### Booking and payment guardrails

- Never call a real booking or payment endpoint from mock mode.
- User-approved presentation exception: omit preview labels from the UI and downloaded receipts. This does not change mock isolation, payment verification, or UAT requirements.
- Require explicit user confirmation before creating a real booking or starting payment.
- Prevent duplicate submissions while a booking or payment request is pending.
- Use an idempotency or caller-order identifier for real booking requests when supported.
- Do not display a successful receipt until the backend confirms success.
- Do not implement payment credentials, PIN collection, or wallet authorization inside R2H unless MiPay explicitly requires and approves it.
- Allow only configured and trusted payment redirect origins.

### External navigation guardrails

- Centralize OneCENT/MiPay redirect URLs in validated configuration.
- Do not construct external redirect destinations from untrusted query parameters.
- Use an allowlist for external redirect origins.
- Provide a safe internal fallback when a redirect configuration is invalid.

### Architecture guardrails

- React components must not call external MiPay URLs directly.
- Browser code calls only this application's route handlers or typed client services.
- Features must not import another feature's internal files.
- Integration adapters must return normalized domain types, not raw Axios responses.
- Route handlers must use shared validation and error-mapping utilities.
- Do not duplicate storage keys, endpoint paths, service status, or redirect URLs.
- Avoid feature-wide rewrites when a focused module migration is sufficient.
- Preserve backward compatibility until UAT approves a contract change.

### Visual guardrails

- Capture reference screenshots before porting each route.
- Compare at widths `320px`, `375px`, `390px`, and `430px`.
- Do not change icons, color tokens, font sizing, spacing, radius, or navigation order during an architecture-only migration.
- Do not introduce a second icon family without approval.
- Interactive controls must have visible focus, disabled, loading, active, and error states.
- Touch targets should be at least `44px` where the design permits.
- Avoid fixed `h-screen`; use dynamic viewport units for new full-height screens unless matching a verified legacy requirement.

### Quality gates

A feature cannot move from `preview` to `active` until:

- Type checking, linting, and production build pass.
- Unit tests cover domain mapping and key decisions.
- Contract tests verify mock and MiPay adapters satisfy the same interface.
- Integration tests cover success, empty, invalid-session, upstream-error, and timeout behavior.
- The complete route works with mock mode disabled in UAT.
- Visual comparison is accepted at the supported mobile widths.
- No real secrets or customer data appear in the diff.
- Product owner or supervisor acceptance is recorded.

### Code quality and documentation rules

- Use clear domain names. Prefer `listTravelPlans` over `getData`, and `selectedAgency` over `value`.
- Keep functions focused on one responsibility. Extract validation, mapping, formatting, and side effects when they form separate concerns.
- Prefer early returns over deeply nested conditionals.
- Avoid boolean parameters whose meaning is unclear at the call site. Prefer an options object or separate named functions.
- Do not use `any`. Use `unknown` at untrusted boundaries, then validate and narrow it.
- Do not suppress TypeScript or ESLint errors without a nearby explanation and a linked follow-up issue when temporary.
- Remove dead code and obsolete commented-out implementations. Git history is the archive.
- Keep domain calculations and decisions out of JSX.
- Keep files cohesive. Split files when they contain unrelated responsibilities, not solely because of line count.
- Prefer pure functions for mappers, validators, formatters, and business calculations.
- Use one shared implementation for repeated storage keys, endpoint paths, status values, currency formatting, and date formatting.

Add TSDoc/JSDoc documentation to:

- Exported service interfaces and non-obvious exported functions.
- Integration adapters and functions that call external systems.
- Booking, payment, consent, authentication, and redirect functions.
- Domain rules whose purpose cannot be understood from the type signature alone.
- Workarounds required because of an upstream MiPay behavior or framework limitation.

Documentation should explain the contract and reasoning, including relevant details such as:

- What the function is responsible for.
- Important input expectations and normalized return behavior.
- Side effects such as storage changes, redirects, bookings, or payments.
- Expected failure behavior.
- Security or idempotency requirements.

Example:

```ts
/**
 * Creates an Umrah booking through the selected integration adapter.
 *
 * The caller order ID must remain stable across retries so the upstream
 * service can prevent duplicate bookings. Throws a normalized
 * `IntegrationError`; it never returns a raw MiPay response.
 */
export async function createUmrahBooking(
  input: BookingInput,
): Promise<Booking> {
  // Implementation
}
```

Comment rules:

- Explain why a decision exists, not what a plainly readable line does.
- Do not add comments such as `// set loading to true` above `setLoading(true)`.
- Keep comments accurate when behavior changes; stale comments are defects.
- Place integration assumptions close to the mapper, validator, or adapter that enforces them.
- Use `TODO(owner-or-issue): reason and required outcome` for temporary work. Do not add anonymous or open-ended TODOs.
- Document mock fixtures and simulated outcomes in developer documentation; do not claim verified UAT results. User-facing `LOCAL PREVIEW` labels are not required (user-approved exception).

Documentation rules:

- Update `README.md` when setup commands or required environment variables change.
- Update `docs/integration-contract.md` when request, response, authentication, consent, or redirect contracts change.
- Update `docs/service-status.md` when a service changes between `coming-soon`, `preview`, and `active`.
- Update `docs/architecture.md` when a decision affects multiple features or integration boundaries.
- Update `LOCAL_UI_MOCK_GUIDE.md` in this repository whenever mock behavior changes.
- Include a concise change summary and testing evidence in every pull request.

### Change-control guardrails

- Develop the frontend in the current `r2h-platform-next-frontend-scaffold-archive/` workspace and the new FastAPI backend in its `./backend/` directory, as approved on 2026-09-15. Do not duplicate, relocate, or wrap the frontend in a new project.
- Treat the legacy `r2h-miniapp/` and sibling CodeIgniter backend outside this workspace as read-only references; never restructure, clean, or discard their working changes. This restriction does not apply to the new FastAPI `./backend/` inside this workspace.
- Do not create or modify a sibling `r2h-platform-next/` project unless separately requested.
- Use one branch or pull request per vertical slice.
- Keep commits scoped so integration, UI, and fixture changes can be reviewed independently.
- Record architectural decisions that affect multiple services in `docs/architecture.md`.
- Maintain `docs/service-status.md` with owner, UI status, API status, mock status, UAT status, and release status.
- Keep the current application deployable until the replacement is approved.
- Every release must have a rollback target and configuration rollback instructions.

## API route rules

- Treat Next.js route handlers as a backend-for-frontend boundary, not the source of business truth.
- Validate required input before calling upstream systems.
- Use consistent success and error shapes inside this app.
- Map upstream errors to safe messages and appropriate HTTP status codes.
- Add request timeouts to upstream calls.
- Do not expose upstream secrets, stack traces, or raw Axios errors.
- Booking and payment calls must be idempotent where supported by the upstream API.

## State and data rules

- Define domain types once and reuse them across UI and adapters.
- Do not use `any` for integration responses.
- Keep server state out of global client state unless multiple distant routes genuinely require it.
- Show a deliberate loading, empty, error, and success state for data-driven screens.
- Do not silently replace API failures with mock data in real mode.

## Replacement and migration strategy

Build the replacement incrementally, service by service:

1. Capture the current route, UI, and API contracts.
2. Create shared session, configuration, and integration boundaries.
3. Implement the functional synthetic Umrah milestone defined above, including the small operations/admin view.
4. Compare the replacement against the current app at a mobile width of `430px`.
5. Add one second service through the shared architecture to prove extensibility.
6. Validate future real adapters against UAT using credentials and contracts supplied by the owning teams.
7. Move a service from `preview` to `active` only after approval.
8. Keep rollback possible until the replacement passes UAT and stakeholder sign-off.

Do not replace the existing implementation in one unreviewed change.

## Completion checks

For every code change:

- Read the relevant guide under `node_modules/next/dist/docs/` first.
- Run lint and the applicable tests.
- Run a production build when routing, configuration, or integration boundaries change.
- Test at narrow mobile width and at the `430px` desktop container limit.
- Confirm keyboard focus, readable contrast, loading, empty, and error behavior.
- Confirm real mode contains no mock fallback.
- Update `LOCAL_UI_MOCK_GUIDE.md` whenever mock behavior changes.
- Preserve unrelated user changes and do not modify `REPO_STATUS.md` unless requested.

## Definition of plug-and-play

A feature is plug-and-play only when all of the following are true:

- It can be activated through configuration or the service registry.
- It uses shared session and UI primitives.
- It communicates through a typed service interface.
- It has separate mock and real adapters.
- It does not import another feature's internal components.
- It has documented environment requirements.
- It can be disabled without breaking navigation or unrelated services.
