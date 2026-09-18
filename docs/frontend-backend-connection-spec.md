# Frontend–backend connection specification

Date: 2026-09-16  
Status: Proposed implementation plan based on a source audit and isolated backend checks. **Not implemented or UAT-approved.**  
Scope: The current Next.js frontend and `backend/` in this repository. No sibling or legacy repository changes.

## 1. Outcome and scope

Connect the existing Umrah UI to a persistent synthetic backend, preserving the
430px shell, agency tiles, icons, typography, navigation, and package-selection flow.
The completed journey must create a durable booking, perform a backend-authoritative
simulated payment, resolve provider fulfilment, and show truthful history and receipts.

This is **not an API-URL-only change**. There are transport mismatches, missing UI
steps, incompatible identities, and backend safety/persistence gaps. A working HTTP
connection alone must not be called a completed transaction integration.

This document is the concrete connection plan accompanying
[the backend specification](backend-spec.md). It does not replace that document's
persistence, audit, recovery, privacy, or six-module milestone requirements.
All paths and contracts under “proposed” below are requirements, not existing APIs.

First connected milestone: Umrah, MYR, full payment, fictional travellers and
providers, quotes lasting 15 minutes, and operator-approved cancellation/refund.
Hajj and Umrah Instalment retain their current separate presentation/preview paths;
this work does not make them connected transactional services. No live MiPAY/ERP
booking or payment is authorized by this specification.

## 2. Evidence: current implementation

### Source inventory

| Source | Observed responsibility |
| --- | --- |
| [Backend routes](../backend/app/main.py) | FastAPI factory, request models, routes, one `DemoService` per app instance |
| [Demo service](../backend/app/modules/demo.py) | Two fictional packages/providers; in-memory quotes, bookings, inventory and simulated outcomes |
| [Backend configuration](../backend/app/platform/config.py) | Environment/provider parsing; required database string; production/UAT reject mock enum values |
| [Backend tests](../backend/tests/test_health.py) | Health and one successful synthetic booking/payment/history test |
| [Frontend client](../src/lib/api/client.ts) | Mock reads or direct browser requests to `NEXT_PUBLIC_API_URL`; no transaction BFF |
| [Frontend types](../src/lib/api/types.ts) | Products/departures, decimal-string amounts, flattened booking and nested payment |
| [Catalogue interface](../src/features/pilgrimage/catalogue-service.ts) | `agencies()`, `products()`, `departures(productId)` |
| [Umrah directory adapter](../src/features/pilgrimage/umrah-directory-catalogue.ts) | Matches provider by exact licence and normalized name, then maps products to the directory office |
| [Journey](../src/features/pilgrimage/components/pilgrimage-journey.tsx) | Selection UI, hardcoded MYR 500 booking fee, browser-only receipt transition |
| [History detail](../src/features/bookings/components/booking-detail.tsx) | Searches the complete booking list for a detail; synthesizes confirmed/paid timeline text when absent |
| [Receipt page](../src/app/booking-status/[bookingId]/receipt/page.tsx) | Searches history; displays `Paid` without checking payment state |
| [Operations](../src/features/operations/components/operations-board.tsx) | Expects endpoints/states that the backend does not currently supply |
| [Agency operations](../agency_info/README.md) | Canonical directory snapshots, logo mapping, selected images, offline collectors |

### What exists, and what does not

- The frontend has a working presentation journey. It does **not** currently collect
  traveller details, request a quote, create a booking, or submit a payment from that journey.
  Its Confirm Payment handler calls `setStep("receipt")` after a terms checkbox.
- `api.quote`, `api.booking`, and payment helpers exist but are not wired into the
  journey. Mock selection only covers some read operations; transaction helpers always
  make HTTP requests. Merely wiring those helpers into preview UI would break mock isolation.
- Directory files contain 1,194 MOTAC office records and 33 seasonal PJH records.
  These are not provider inventory. The frontend's connected-offer lookup cannot match
  the backend's `agency-barakah` / `agency-safwah` providers: they have no matching MOTAC
  licence and are different fictional businesses.
- The homepage also uses the existing incompatible agencies/products client calls.
- Backend `DATABASE_URL` is validated as a required string but is never used for storage.
  No database engine, migrations, repositories, worker or durable outbox is implemented.
  The demo service's “persistent API slice” wording must not be taken as persistence evidence.
- There are no demo sessions, customer ownership checks, operator authorization,
  trusted BFF authentication, host-token integration, or CORS middleware in the current backend.
  No current frontend host/session implementation was found in the inspected `src` tree.
- Backend provider enum selection is not adapter selection: `create_app()` always
  constructs `DemoService()`. Setting production plus `mipay` values still exposes
  synthetic catalogue/payment behavior. This is a release blocker.
- `ENABLED_SERVICES` is parsed but not enforced by routes. Frontend navigation uses
  its own registry; Umrah's existing `active` label is not evidence of acceptance/UAT.
- Backend traveller validation checks required dictionary keys, not date validity,
  non-empty values, nationality format, phone format, or extra-field policy.
- Bookings decrement capacity without a persisted/expiring hold or concurrency protection.
  Payment outcomes can rewrite previous successful payment state. Cancellation immediately
  reports a successful refund without operator approval or inventory release.
- Imports currently retain only a run summary/count in memory. They do not store,
  review, publish, or expose the supplied agency records.

### Checks performed for this audit

`python -m pytest -q -p no:cacheprovider`, from `backend/`: **2 passed**.
Additional checks used a fresh in-process TestClient/service with synthetic data;
no running backend, provider, external database or user transaction was changed.

| Check | Observed result |
| --- | --- |
| Existing frontend agencies and products URLs | Both 404 |
| Existing frontend quote body | 422 |
| Existing frontend payment and operations-list URLs | Both 404 |
| Booking history | Object with `items`, not the array expected by UI |
| Direct cross-origin POST preflight | 405; no CORS middleware |
| Successful payment followed by failure outcome | Successful payment overwritten as `FAILED` |
| Cancellation of that action-required booking | Refund reported `SUCCEEDED` without an operator |
| Capacity after cancellation of one Nusuk place | 11 rather than original 12 |
| Same idempotency key with a different quote | Previous booking returned, not a payload conflict |
| Fresh service instance | Zero previous bookings |
| Production environment with `mipay` enum selections | Still returns `synthetic-demo` catalogue |

These checks establish incompatibilities and defects, not security or concurrency certification.

## 3. Current endpoint mismatch matrix

Paths below omit the configured `/api/v1` prefix for readability.

| Frontend expectation | Backend today | Required action |
| --- | --- | --- |
| `GET /agencies?category=umrah` → `Agency[]` | `GET /catalogue` → `{agencies, packages}` | Add a published agency query and normalize its response |
| `GET /catalogue/products?category=umrah` → `Product[]` | Same combined catalogue; `GET /packages/{id}` for detail | Add filtered package list; retain product terminology only behind a mapper |
| `GET /catalogue/products/{id}/departures` | No departure resource; package has one `departure_date` | Add stable departure IDs, start/end dates and capacity |
| `POST /quotes` with `product_id`, `departure_id`, `traveller_count` | Requires `package_id`, integer `travellers` | Version/freeze the request and update both sides deliberately |
| Quote decimal strings and `total_amount` | Integer `unit_price_sen`, `total_sen` | Normalize using integer sen; do not cast the response to the old type |
| Booking travellers `full_name`, `contact`; includes `scenario` | Requires traveller keys `name`, `phone`; scenario is not used | Typed traveller form and boundary mapping; remove customer-controlled scenario |
| Booking `state`, `reference`, dates, nested `payment` | Separate status strings; no reference, end date, hold expiry, payment attempt or payment reference | Enrich backend read model; keep independent statuses |
| `POST /payments` | `POST /bookings/{id}/payment`, taking `outcome` | Introduce an idempotent payment-attempt API without customer-selected outcomes |
| `/demo/payments/{id}/confirm`, `/demo/bookings/{id}/provider-outcome` | Neither exists | Do not wire these helpers; replace with authorized demo controls/recovery |
| `GET /bookings` → array | `GET /bookings` → `{items:[...]}` | Ownership, pagination and envelope mapping |
| Detail fetched by searching history | Backend already has `GET /bookings/{id}` | Add a typed detail client and explicit 404 state |
| `POST /bookings/{id}/cancellation` means request | Same URL immediately cancels/refunds | Replace semantics with an audited request/decision workflow |
| `GET /operations/bookings` | `GET /operations/exceptions` → `{items}`; only `ACTION_REQUIRED` | Broaden authorized exception query and map it |
| `POST /operations/bookings/{id}/cancellation` | Missing | Add an operator decision endpoint with concurrency protection |

## 4. Connection boundary and authority

```text
Existing page/component
  -> feature hook / typed service
    -> same-origin /api/r2h/... BFF
      -> server-only typed FastAPI client
        -> /api/v1/... application modules
          -> PostgreSQL + durable worker + configured adapters
```

The BFF owns validation at the browser boundary, session transport, safe error
mapping and timeouts. FastAPI owns user authorization, service availability,
pricing, holds, booking state, payment verification, fulfilment, refunds and audit.
Do not place those decisions in a Next.js route, React component, or logo scraper.

Use explicit BFF handlers/allowlisted paths, not an arbitrary upstream URL proxy.
Remove browser use of `NEXT_PUBLIC_API_URL` for connected operations. A server-only
`R2H_BACKEND_URL` names the trusted upstream. Same-origin browser requests avoid the
current CORS failure; widening backend CORS is not the chosen connection strategy.

### Environment profiles (proposed)

| Profile | Frontend behavior | Backend authority |
| --- | --- | --- |
| Local UI preview | Explicit existing mock flag; fixture-only read and simulated UI adapters | Transaction methods must not call HTTP |
| Connected synthetic demo | Mock flag false; BFF calls real local backend API | Explicit demo environment and mock provider adapters; persistent synthetic transactions |
| UAT/production | No local fixture adapter | Only implemented, configured real adapters; otherwise startup fails |

“Connected” here means connected to FastAPI, not connected to MiPAY. A production-built
frontend may be tested against a separately isolated demo backend without enabling
frontend fixtures. Never allow UAT/production backend settings to instantiate `DemoService`.

Validate backend URL, allowed origins, deployment environment and required settings
at startup. Give BFF calls a bounded timeout (proposed default 10 seconds), propagate
request IDs, and use `no-store` for session/transaction reads. Do not log tokens or PII.
Timeout on a mutation means **unknown outcome**, not proof that nothing was created.

## 5. Agency and package identity

Retain `agency_info/` as the single file-based source of reference data, selected
logos and collection tools. Do not duplicate JSON snapshots into `backend/` or make
scraping a dependency of requests/startup. Import/publication is an explicit operator task.
Published database records are the backend read model, not a second editable JSON source.

Backend agencies need internal stable IDs and separate source references:
`id`, `name`, `source`, `directory_ref`, nullable `license_no`, nullable `office_type`,
`logo_ref`, and capabilities. Keep legal company, office and provider identity distinct.
The current MOTAC record hash includes changing snapshot information: retain it as a
source revision, not a permanent transaction identifier. Never strip branch suffixes
from licences to attach headquarters inventory automatically.

**Recommended first demo binding:** keep Barakah and Safwah as fictional providers,
with `source=synthetic-demo`, `directory_ref=null`, and `DEMO_BOOKING` capability.
Expose them through the demo catalogue/directory composition, without assigning them
a real agency's licence or logo. Retain the official records in their existing order
as directory-only entries unless explicitly connected. Their tiles still work, but
do not claim bookable offers that do not exist.

This proposed addition of fictional provider tiles needs product acceptance; it is
not implemented by this spec. If the owner instead wants fictional offers under named
real agencies, require a documented explicit presentation approval and seed mapping.
Do not achieve it by silently renaming backend providers to A&M or another MOTAC entry.

For connected providers, use a reviewed backend `directory_ref -> provider_id` mapping.
Replace the frontend's licence/name join once that mapping is available. Keep missing
or ambiguous mappings as unconnected, not as fuzzy matches.

Packages must expose provider ID, category, localized display fields, MYR price in
sen, and capability. Departures must expose a stable ID, package ID, start/end dates,
and authoritative availability. Never infer an end date from text such as `12D` or
invent departure IDs in React. Backend seeds must supply this missing information.

## 6. Proposed API contract

The BFF uses `/api/r2h`; FastAPI retains `/api/v1`. The following is the minimum
target contract. Generate external TypeScript transport types from the approved
FastAPI OpenAPI schema; validate untrusted responses at runtime before domain mapping.
Do not maintain independently handwritten copies of transport schemas.

| Browser operation | FastAPI target | Status relative to current backend |
| --- | --- | --- |
| `POST /api/r2h/session/demo` | `POST /api/v1/sessions/demo` | New; fictional identity only |
| `GET/DELETE /api/r2h/session` | `GET/DELETE /api/v1/sessions/current` | New; lookup/logout |
| `GET /api/r2h/services` | `GET /api/v1/services` | New; backend-authoritative capability query |
| `GET /api/r2h/agencies` | `GET /api/v1/agencies` | New; published/filterable directory and synthetic demo providers |
| `GET /api/r2h/packages` | `GET /api/v1/packages` | New list; filter by provider/category |
| `GET /api/r2h/packages/{id}` | `GET /api/v1/packages/{id}` | Existing detail, response must be extended |
| `GET /api/r2h/packages/{id}/departures` | Same suffix under `/api/v1` | New |
| `POST /api/r2h/quotes` | `POST /api/v1/quotes` | Existing URL, validated contract change |
| `GET /api/r2h/quotes/{id}` | Same suffix under `/api/v1` | New; owner-only expiry/recovery read |
| `POST/GET /api/r2h/bookings` | Same suffix under `/api/v1` | Extend with ownership, persistence and normalized envelopes |
| `GET /api/r2h/bookings/{id}` | Same suffix under `/api/v1` | Existing detail, extend and authorize |
| `POST /api/r2h/bookings/{id}/payments` | Same suffix under `/api/v1` | New payment attempt, distinct from current singular simulator |
| `GET /api/r2h/payments/{id}` | Same suffix under `/api/v1` | New owner-only status read |
| `POST /api/r2h/bookings/{id}/cancellation` | Same suffix under `/api/v1` | Request only; must not auto-refund |
| `GET /api/r2h/operations/exceptions` | `GET /api/v1/operations/exceptions` | Extend to pending, rejected, cancellation and refund cases |
| `POST /api/r2h/operations/cancellations/{id}/decision` | Same suffix under `/api/v1` | New audited operator action |
| `POST /api/r2h/operations/demo/bookings/{id}/scenario` | Same suffix under `/api/v1` | New isolated demo control; not a customer checkout API |

Keep the current combined `/catalogue` response as a temporary compatibility endpoint
if required by existing callers. Do not implement its incompatible shape in UI components.
Retire the old singular payment simulator from general/customer access before connection.
The current quote and cancellation contract changes require updated backend tests and
explicit version/release notes; do not silently accept conflicting old/new fields.

### Envelopes and failures

- Lists: `{ "items": [...], "next_cursor": null }`; page size default 50, maximum 100.
  The frontend must follow cursors or deliberately show load-more; never truncate the
  directory/history to the first page without indicating it.
- Single records: a typed object, not an array. Create operations use 201; reads 200;
  asynchronous payment initiation may use 202 and must provide an attempt/status URL.
- Errors: `{ "error": { "code": "QUOTE_EXPIRED", "message": "...", "request_id": "...", "fields": [] } }`.
  Each field issue has `path` and safe `message`; do not echo sensitive rejected values.
- 401 invalid session, 403 forbidden/disabled capability, 404 absent or unowned record,
  409 conflict/expiry/idempotency mismatch, 422 invalid input, 502 invalid upstream response,
  503 unavailable service, 504 upstream timeout. Frontend messages must distinguish these.
- FastAPI's current string/list `detail` errors need centralized normalization. A TypeScript
  assertion in `request<T>` is not validation and must not pass raw objects into React.

### Quote example (proposed, synthetic)

```json
{
  "package_id": "pkg-nusuk",
  "departure_id": "dep-nusuk-feb-2027",
  "traveller_count": 2
}
```

```json
{
  "id": "quote-demo-example",
  "package_id": "pkg-nusuk",
  "departure_id": "dep-nusuk-feb-2027",
  "provider_id": "agency-barakah",
  "traveller_count": 2,
  "currency": "MYR",
  "unit_price_sen": 480000,
  "total_sen": 960000,
  "payment_due_sen": 960000,
  "created_at": "2026-09-16T02:00:00Z",
  "expires_at": "2026-09-16T02:15:00Z",
  "booking_id": null
}
```

Keep arithmetic in integer sen and format at the presentation edge. The example
total is RM 9,600.00. Do not send browser-calculated prices to determine charges.
Use explicit price lines/offer version in the implemented quote schema.
An owned quote's `booking_id` allows recovery after an ambiguous create response;
retrieving it does not extend its expiry.

### Booking, payment and history models

Booking creation accepts `quote_id`, validated travellers, accepted terms version,
and an `Idempotency-Key`. Traveller fields are `name`, `nationality`, `date_of_birth`,
and `phone` (optional email only if required by the agreed schema). Map legacy
`full_name` explicitly; do not blindly treat arbitrary `contact` text as a phone number.
Validate server-side, reject unknown fields such as customer-supplied `outcome` or `role`.

Booking responses need stable `id` and human-readable `reference`, provider/package/
departure IDs, immutable display snapshots, money in sen, creation time, hold expiry,
booking/payment/fulfilment/refund/cancellation states, and ordered real status events.
List responses should omit full traveller PII; detail access remains owner-authorized.
The BFF can map package to the UI's `Product` type, but cannot invent missing dates,
references, receipts, payment attempts or “confirmed” timeline entries.

Payment initiation accepts no authoritative amount or outcome. Backend determines
the amount from the booking and returns a stable attempt ID/reference, status, MYR
amount, timestamps, and any validated action required. Store payment attempts separately.
Retain the originally successful payment when a separate refund succeeds.

## 7. State mapping and truthful presentation

Extend the frontend domain model to preserve all independent statuses. Do not squeeze
backend payment, fulfilment and refund into a single loose `Booking.state: string`.

| Backend facts | Required UI behavior |
| --- | --- |
| Awaiting payment, no successful attempt | Show amount due and confirm action; no paid receipt |
| Payment pending/unknown, including transport timeout | “Checking payment”; disable a second active payment; poll owned status |
| Payment failed | Safe failure/retry path only when backend permits a new attempt |
| Payment succeeded, fulfilment pending | “Payment received, confirmation pending”; do not claim booking confirmation |
| Payment succeeded, fulfilment rejected | `ACTION_REQUIRED`; preserve successful payment and show support/operations path |
| Payment succeeded, fulfilment confirmed | Confirmed booking and backend-derived receipt |
| Cancellation requested | Show request status separately; do not report cancelled/refunded |
| Cancellation approved, refund pending | Show refund pending; successful payment remains recorded |
| Refund succeeded | Show refunded amount/state separately from original payment |
| Unknown/unrecognized backend state | Safe unavailable/retry state with diagnostics, never assume success |

Introduce explicit `PENDING` in the normalized payment model; the existing `UNKNOWN`
can represent ambiguous transport state, not a substitute for every backend status.
Operations must query independent states rather than filtering only the existing
`PENDING_PROVIDER`, `ACTION_REQUIRED`, and `CANCEL_REQUESTED` UI strings.

Use real backend events for timelines. A missing detail is a 404 view, not an endless
loading spinner. A failed detail/receipt fetch needs a retry state. Unpaid bookings
must not reach a page hardcoded to `Paid` or generate a successful receipt.
Payment acknowledgement for paid-but-unfulfilled cases must be distinct from a
confirmed-booking receipt, with product-approved wording.

## 8. Required journey changes

```text
Demo session -> agency/provider -> package -> departure -> travellers
  -> server quote + expiry -> terms/full-total confirmation
    -> idempotent booking + hold -> payment attempt
      -> backend status/recovery -> fulfilment -> history/detail/receipt
```

1. Keep current visual components; move orchestration into a feature hook/service.
2. Add the missing traveller step using existing form/surface styles. Minimum fields
   are name, nationality, date of birth and phone; do not introduce passport collection.
3. Request a quote after traveller count/details are valid. Invalidate it on relevant
   selection changes. Display server total and remaining validity; server expiry is final.
4. Replace the fixed MYR 500 fee in the connected Umrah summary, cards and receipt with
   the full amount due. **Do not merely relabel a partial payment as full payment.**
   This functional copy/step change follows the full-payment milestone and requires
   product acceptance before shipping; preserve the surrounding measurements/assets.
5. Explicit confirmation creates the booking, then starts payment. Disable duplicate
   submission. Keep stable idempotency keys across retries; retain only non-sensitive
   request identifiers in centralized session-scoped storage if reload recovery needs it.
6. On an ambiguous booking response, recover through the owned quote/booking before
   issuing a fresh request. Never use a new quote/key as an automatic retry shortcut.
7. Poll payment/booking status with bounded backoff; stop on terminal status/unmount.
   A browser timeout must not create another charge, release inventory, or confirm payment.
8. Backend recovery continues after the browser closes. Reload resumes by booking ID.
9. History/detail/receipt fetch the persisted record; downloads use confirmed server
   data and approved issuer configuration, not the current hardcoded issuer/fee assumptions.
10. Remove the browser-only receipt transition from connected mode. Retain an isolated
    local preview only through a deliberate mock service, never as an error fallback.

## 9. Backend gates before enabling transactional connection

### Configuration and authorization

- Gate all demo routes and services to `APP_ENV=demo/test` and implemented mock adapters.
  Unsupported `mipay` selection must fail startup, not instantiate the demo service.
- Add demo sessions and backend ownership checks to quotes, bookings, payment, history
  and cancellation. Operations/imports require a separate authorized role.
- Proposed browser session transport: an opaque HttpOnly cookie owned by the BFF;
  Secure on HTTPS, SameSite policy and CSRF/origin validation explicitly specified.
  Local HTTP development needs a documented exception. Embedded MiPAY cookie behavior
  remains pending owning-team confirmation, not an assumption of compatibility.
- BFF calls pass an authenticated session reference using a documented server trust
  mechanism. Reject browser-supplied identity/role headers and do not trust a shared
  BFF credential as sufficient customer authorization.
- Preserve the future `/?WalletUserSessToken=...` launch contract; no real exchange
  exists today. Never put tokens in logs, screenshots, error messages or fixtures.

### Persistence and state transitions

- Implement PostgreSQL repositories/migrations for users/sessions, catalogue/departures,
  quotes, holds, bookings/travellers, idempotency, payment attempts/events, fulfilment,
  cancellation/refunds, audit and outbox. Use an in-memory implementation only in tests.
- Persist booking creation, quote consumption and capacity hold atomically. Enforce
  non-negative capacity under concurrent requests. Holds expire no later than the quote.
- Idempotency keys are required for booking/payment mutations, scoped by actor and
  operation, with payload fingerprints and durable results. Conflicting reuse is 409.
- Guard allowed state transitions. Successful payment cannot be overwritten by a later
  failure, and duplicate/out-of-order events cannot create duplicate fulfilment or refunds.
- Recovery workers resolve pending payments, expired holds, delayed fulfilment and refunds.
  Convert held capacity to allocated capacity exactly once after confirmation.
- Customer cancellation only creates a request. Operator decisions check service start
  and payment facts. An approved pre-service demo cancellation requests a full simulated
  refund; post-start cases remain operator review, not automatic refunds.
- If payment arrives after a hold expired, create an exception unless capacity is safely
  reacquired under an approved policy. Never extend the original hold indefinitely for
  delayed fulfilment; define allocated-capacity/rejection/release behavior transactionally.
- Readiness checks database/required dependencies, not merely successful environment parsing.

Demo scenario controls must separately exercise payment and fulfilment outcomes. They
configure authorized test behavior, not arbitrary customer-supplied final states.
They are unavailable in UAT/production and must not appear in the normal payment body.

## 10. File-level implementation plan

Create only files needed for each slice; do not scaffold another app or duplicate checkout.

| Area | Planned change |
| --- | --- |
| `backend/app/main.py` | Register thin routers/dependencies; stop unconditionally selecting DemoService |
| `backend/app/platform/config.py` | Validate implemented adapters, trusted configuration and service gates |
| `backend/app/modules/` | Extract catalogue, quotes, inventory, booking, payment and cancellation use cases with typed schemas |
| `backend/app/platform/` and `backend/app/workers/` | Sessions/authz, database, audit, outbox and recovery |
| `backend/migrations/` | Persistent schema, constraints and deterministic synthetic seed data |
| `contracts/` | Generated approved OpenAPI and compatibility fixtures, not handwritten duplicate domain models |
| `src/app/api/r2h/` | Explicit thin BFF routes and standardized errors |
| `src/lib/api/` | Server-only FastAPI client, response validation, mappers; browser client calls only BFF |
| `src/host/` | Demo session adapter now; real host exchange only after owning-team contract approval |
| `src/features/pilgrimage/` | Typed catalogue/checkout services, traveller form, quote/recovery hook; preserve existing presentation |
| `umrah-directory-catalogue.ts` | Replace name/licence provider discovery with explicit backend binding |
| `src/features/home/hooks/use-popular-packages.ts` | Consume normalized connected catalogue; preserve empty/error behavior |
| `src/features/bookings/` and receipt route | Owned detail lookup, split statuses, truthful events and downloadable receipt |
| `src/features/operations/` | Authorized exceptions, cancellation decisions, pending-payment/refund visibility |
| Service registry | Keep local names/order/icons; merge backend availability/capabilities without claiming active release |
| `agency_info/` | Remains the source location; no scraper output added to application/runtime folders |

## 11. Delivery sequence and acceptance

| Slice | Deliverable | Exit condition |
| --- | --- | --- |
| 0: Freeze decisions | Agree fictional-provider presentation, full-payment copy, receipt issuer, session policy | Written choices; no accidental live claims |
| 1: Safe backend foundation | Fail-closed adapter selection, persistent store, demo identity/ownership and readiness | Restart persistence and access-control tests pass |
| 2: Read connection | Published providers/packages/departures, BFF, generated types/mappers, homepage/directory binding | Backend's fictional packages actually reachable through UI; unconnected offices stay empty |
| 3: Checkout | Traveller step, quote, atomic hold, idempotent booking | Correct full server total; expiry/concurrency/retry tests pass |
| 4: Payment and fulfilment | Durable attempts/events/outbox/recovery; remove UI-only success | Success/failure/timeout/rejection/delay work without false receipts |
| 5: History and operations | Owned detail/receipt, cancellation decisions/refund recovery | Browser/API restarts preserve state; operator cases resolve correctly |
| 6: Acceptance and rollout | Contract/E2E/visual checks, documented environment rollback | Product acceptance; still no automatic active/UAT designation |

A read-only localhost proof of wiring can precede persistence, but it must keep
transaction controls disabled and must not be exposed as a finished or shared demo.
Do not turn off the frontend mock flag and expect the current direct client to work.

Required tests include:

- Both explicit preview and connected-demo profiles; production with mock settings
  rejected at the backend, unsupported real adapters rejected, and no error fallback.
- All response mappings/envelopes and field validation; invalid backend responses
  produce safe errors rather than `NaN`, missing references or invented values.
- Invalid session, missing CSRF/origin evidence, unauthorized operator requests,
  cross-customer access and disabled services.
- Quote expired, price/count changed, last-place contention, double submission,
  same-key same-payload retry, same-key changed-payload conflict, lost responses.
- Payment timeout and reload, callback/event duplicates, out-of-order events,
  immutable successful payment, rejection/delay after payment, late success after expiry.
- Cancellation request versus approval, post-start review, refund retry, and no double
  inventory release or refund exceeding paid amount.
- Backend restart during pending payment/fulfilment; worker restart/repeated jobs.
- Empty catalogue/history, missing booking, upstream error and timeout views.
- Complete Umrah journey at 320/375/390/430px, keyboard/back navigation and existing
  Hajj/instalment regressions. Preserve icons and geometry; approve the new traveller
  step/full-payment wording separately.
- Type checking, lint, production build and secret/PII checks. The current `next lint`
  script is broken and needs a dedicated configuration fix before the release gate.

The two existing backend tests are not enough to satisfy these gates.

## 12. Rollout and unresolved choices

Use additive schema changes and a pinned deployment/configuration rollback target.
Pilot the connected profile with synthetic data only. Keep current preview as a
separately configured local development mode, not an automatic production fallback.
If transactions are paused, keep durable history/status available and stop new
submissions. Do not delete the database or “reset demo” to perform rollback.

Decisions required before their dependent implementation:

1. Approve fictional provider tiles in the demo directory, or provide an explicitly
   approved alternative mapping. No silent real-agency substitution.
2. Confirm full-payment summary/receipt wording and legal receipt issuer. Current
   MYR 500/issuer hardcoding cannot silently become the authoritative contract.
3. Confirm desktop-demo session trust/CSRF policy and later embedded-host behavior.
4. Confirm deployment/database/worker hosting, backups, data retention and transaction
   recovery limits. Do not treat directory-scrape output as a transactional datastore.
5. Obtain actual MiPAY/ERP authentication, booking, payment, callback and cancellation
   contracts before building real adapters. These are not supplied by the current backend.

This audit/specification changes documentation only. It does not wire the frontend,
change runtime flags, mutate a running database, approve scraped logos, or certify a release.
