# R2H Backend Implementation Specification

Date: 2026-09-15  
Status: Proposed implementation specification; not a claim of implemented or UAT-verified behaviour  
Workspace: `r2h-platform-next-frontend-scaffold-archive/`

## 1. Purpose and scope

Extend the existing Next.js frontend with a persistent FastAPI modular-monolith backend in `./backend/`. Preserve the approved UI, navigation, assets, and future MiPAY host compatibility.

Do not create another frontend, move the existing `src/` tree, or create a sibling replacement project. The legacy frontend and CodeIgniter backend outside this workspace remain read-only references.

The first transactional milestone is a fully synthetic Umrah journey requiring no MiPAY credentials or external provider APIs. Agency directory ingestion is a separate capability that can progress independently. Real imported listings must not imply real transactional integration.

### Deliverables

- Persistent synthetic identity, catalogue, quotes, inventory, bookings, payments, fulfilment, and history.
- PJH and MOTAC/Umrah agency import and review pipeline, starting from reviewed local data.
- Small operations interface for import review, booking exceptions, cancellations, and simulated refunds.
- Typed frontend/backend contracts and isolated provider adapters.
- Database migrations, seed commands, recovery worker, tests, and operating documentation.

### Not included in the first milestone

- Live payments, live provider bookings, or claims of MiPAY/UAT compatibility.
- Deposits, instalments, mixed-provider orders, or multiple currencies per order.
- A full agency self-service portal or unrestricted web crawler.
- Rebuilding the existing UI or implementing all six product modules at once.

Existing frontend routes outside this milestone must remain available with their current behaviour; do not silently route instalment flows into full-payment checkout.

## 2. Evidence and compatibility gate

Observed in this workspace when drafting:

- Existing frontend directories: `src/app/`, `src/features/`, `src/components/`, and `src/lib/`.
- Feature directories include pilgrimage, bookings, operations, certificate, affiliate, and home.
- Existing data files: `agency_info/motac_umrah_agencies.json` and `agency_info/pjh_1448H_2027M.json`.
- Existing extraction tool: `agency_info/scripts/motac_umrah_extractor.py` (colocated with references and selected images).
- README documents an optional agency-logo collector with manual review requirements.

These files have been located, not fully audited. Their schemas, correctness, licensing evidence, and suitability for publication remain unverified.

Before implementing integration contracts:

1. Inspect existing frontend service interfaces, fixtures, session handling, status values, and route handlers.
2. Read the legacy journey and API implementations without changing them.
3. Audit existing agency data and extraction scripts before replacing or reusing them.
4. Record an endpoint/field/status mapping and identify missing owning-team contracts.
5. Establish which system owns real pricing, capacity, payment, fulfilment, and cancellation decisions.

Output: `docs/current-system-audit.md` and `docs/integration-contract.md`. Unverified mappings must be explicitly marked pending. Preserve existing interfaces where possible; introduce compatibility adapters for necessary differences.

## 3. Architecture

```text
Existing Next.js UI
  -> feature use case / typed service
    -> Next.js BFF route handler
      -> FastAPI application use case
        -> domain module / repository
        -> configured provider adapter

FastAPI + worker -> PostgreSQL
Worker -> import adapters / payment recovery / fulfilment / notifications
Operations UI -> authorized FastAPI operations endpoints
```

- Next.js is the browser-facing backend-for-frontend (BFF), not the source of business truth.
- FastAPI owns authorization and authoritative application state; BFF checks do not replace backend checks.
- PostgreSQL persists state and enforces relational and uniqueness constraints.
- A separately runnable worker handles durable background jobs and the transactional outbox.
- Start with one backend codebase and database. No microservices or mandatory message broker.

### Proposed implementation stack

FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL, and pytest. Select and pin compatible supported versions during implementation. Use PostgreSQL in transaction/concurrency tests, not SQLite as a substitute for locking behaviour.

## 4. Repository layout

```text
./
  src/                         existing frontend, retained in place
  public/                      existing approved assets
  tests/                       frontend tests
  agency_info/                 existing source data, preserved
    images/                    selected agency logos
    scripts/                   existing collectors, audit before reuse
  backend/
    pyproject.toml
    .env.example
    app/
      main.py
      modules/
        identity/
        services/
        agencies/
        catalogue/
        imports/
        quotes/
        inventory/
        bookings/
        payments/
        fulfilment/
        notifications/
        operations/
      integrations/            synthetic, MiPAY, source/provider adapters
      platform/                config, authz, database, audit, outbox, errors
      shared/                  money, IDs, time, pagination
      workers/
    migrations/
    tests/
  contracts/                   generated OpenAPI and compatibility fixtures
  infra/                       local containers and deployment configuration
  scripts/                     setup, seed, verification, explicit demo reset
  docs/
```

Create only needed directories. Modules expose deliberate application interfaces; other modules must not update their tables directly. Cross-module atomic work uses a shared transaction/unit-of-work with explicit orchestration. Do not place domain rules in generic utility folders.

## 5. Module ownership

| Module | Owns |
| --- | --- |
| Identity | Demo sessions, identity adapter, user/operator roles |
| Services | Enabled services, presentation status, supported capabilities |
| Agencies | Agency identity, branches, external references, verification evidence |
| Catalogue | Products, versioned offers, departures, publication and booking capability |
| Imports | Sources, runs, normalization, matching, change review and publication |
| Quotes | Immutable accepted pricing inputs, price lines, totals and expiry |
| Inventory | Synthetic capacity, holds, allocations and release |
| Bookings | Traveller snapshots, orders, lifecycle and cancellation requests |
| Payments | Attempts, verified events, reconciliation and refunds |
| Fulfilment | Provider submission, confirmation and recovery |
| Notifications | Templates, delivery records and retries |
| Operations | Authorized workflows across modules, not duplicate domain rules |

## 6. PJH and Umrah agency ingestion

### Source strategy

Start with explicit imports of the existing PJH and MOTAC JSON files after schema review. Do not fetch websites as a side effect of frontend requests or application startup.

Subsequent source adapters may support approved directory pages, agency package pages, CSV uploads, or official APIs. Exact PJH URLs, source terms, refresh frequency, and extraction schemas must be confirmed before enabling scheduled collection.

### Pipeline

```text
Approved source -> fetch/import -> extract -> normalize -> validate
  -> match agency/branch -> calculate changes -> review -> publish
```

- Store import runs separately from published records.
- Preserve source identifiers, source URL, collection time, extractor version, content fingerprint, and review decisions.
- Track legal company, trading names, and branches separately where supported by source evidence.
- Prefer reliable source IDs and licence references for matching. Name similarity proposes matches; it does not automatically merge uncertain agencies.
- Preserve operator overrides across refreshes. Show conflicts for review.
- A missing source record or failed run must not automatically delete a published agency.
- Use explicit stale/review flags when evidence is old; define thresholds per source.
- Re-importing identical input must not duplicate agencies or publish spurious changes.
- Retain raw material only where necessary and permitted, with a documented retention policy.

### Agency evidence is not inventory

Keep directory membership, licensing evidence, advertised package offers, and booking connectivity distinct. Store time/season context for PJH evidence when present; do not treat a season-specific listing as perpetual authorization.

An offer has a capability such as `INFORMATION_ONLY`, `ENQUIRY`, `DEMO_BOOKING`, or `CONNECTED_BOOKING`. Scraped prices and departure dates are informational until an authoritative quotation/availability process exists.

Do not infer current legal status from a failed scrape or absent listing. Display only reviewed claims with appropriate source/as-of context.

### Collection and asset safety

- Respect applicable permissions, source terms, robots directives, and rate limits.
- No CAPTCHA bypass, login bypass, proxy rotation to evade blocks, or unrestricted recursive crawling.
- Restrict targets to approved HTTP(S) sources; reject private, loopback, link-local and metadata destinations, including after DNS resolution and redirects.
- Apply request timeouts, response-size limits, redirect limits, concurrency limits and backoff.
- Treat extracted text and uploaded files as untrusted input; never execute it or render unsanitized HTML.
- Discovered websites and logos require manual identity and reuse-permission review before publication.
- Preserve existing assets; this specification does not authorize icon/logo replacement.

### Import review states

`PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_CORRECTION`. Record reviewer, time, reason, and source revision. Publishing must operate on the reviewed revision and reject stale review decisions.

## 7. Domain and persistence rules

Core records: users, sessions, roles, agencies, branches, source references, verification evidence, import runs, source records, review decisions, products, offer versions, departures, quotes, quote lines, bookings, booking lines, travellers, capacity, holds, allocations, payment attempts, provider events, fulfilment attempts, cancellation requests, refunds, audit events, idempotency records and outbox events.

- Use internal opaque IDs; retain upstream IDs in explicit mappings.
- Store MYR amounts as integer sen. No floating-point monetary calculations.
- Store instants in UTC; preserve date-only semantics for date of birth and relevant service dates.
- Snapshot quote terms and booking/traveller details so catalogue edits cannot rewrite a transaction.
- Define foreign keys, unique external references scoped by source, and non-negative inventory constraints.
- Keep payment, booking, fulfilment and refund states separate.
- Use optimistic version checks for competing operator decisions where appropriate.
- Minimize traveller data and define retention/deletion rules before collecting real customer data.

## 8. Identity and host integration

Preserve `/?WalletUserSessToken=<valid-token>` until the owning team approves a change. Audit current handling before changing storage or token exchange behaviour.

- Demo sessions identify fictional customers only; operator access is separately authorized.
- Backend validates customer ownership on every quote, booking, payment and history operation.
- Never trust browser-supplied roles, prices, payment outcomes or customer IDs as authority.
- Real identity adapter validates the approved host contract and fails safely for missing/expired sessions.
- Do not persist or log launch tokens unnecessarily. Keep sensitive session material server-side where the verified host contract allows it.
- If cookies are used, specify Secure/HttpOnly/SameSite behaviour and CSRF protection compatible with the actual host embedding environment.
- Clear session state on logout, rejection, invalid session, and environment changes.
- Authenticate BFF-to-backend calls using a documented trust mechanism; do not trust arbitrary forwarded identity headers.

## 9. Quotes, inventory and booking

### Quote contract

Input: offer/departure IDs and validated traveller/pricing inputs. The backend derives provider, currency, unit prices and totals; the caller cannot supply authoritative amounts.

Output: quote ID, versioned offer reference, itemized prices, total in sen, MYR currency, creation/expiry timestamps, and relevant terms.

- Demo quotes expire 15 minutes after server creation.
- Quote retrieval does not extend expiry.
- A quote alone does not reserve capacity; disclose this in the domain response/UI flow.
- Validate name, nationality, date of birth and required contact fields through shared schemas. Final field rules come from the compatibility audit; do not invent extra passport requirements.

### Booking creation transaction

1. Validate identity, ownership, quote integrity, unconsumed status and expiry.
2. Validate one provider, MYR and full-payment support.
3. Acquire capacity using locking or an atomic conditional update.
4. Create booking, traveller snapshots and hold in one database transaction.
5. Record the quote consumption and required outbox work atomically.

Hold expiry must be no later than quote expiry. A database constraint/transactional design must prevent overselling. Releasing an expired hold must happen at most once, including worker/API races.

Booking creation requires an idempotency key scoped to actor and operation. Store a request fingerprint and stable result. Reject reuse with a different payload. Concurrent identical requests must resolve to one booking.

## 10. Payments, fulfilment and cancellation

### Proposed states

| Record | States |
| --- | --- |
| Booking | `AWAITING_PAYMENT`, `PROCESSING`, `CONFIRMED`, `EXPIRED`, `CANCELLED`, `ACTION_REQUIRED` |
| Payment | `CREATED`, `PENDING`, `SUCCEEDED`, `FAILED` |
| Fulfilment | `NOT_SUBMITTED`, `PENDING`, `CONFIRMED`, `REJECTED` |
| Refund | `REQUESTED`, `PENDING`, `SUCCEEDED`, `FAILED` |
| Cancellation request | `REQUESTED`, `APPROVED`, `REJECTED` |

These are internal proposals; map them to existing frontend/legacy statuses before implementation. Transition functions enforce allowed predecessors and record reason/time. Successful payment history is immutable; a refund is a separate record.

### Payment rules

- Require explicit confirmation before real payment or booking initiation.
- Validate booking ownership, payable amount and current eligibility server-side.
- Use stable attempt/provider idempotency identifiers. Do not hold database locks across network calls.
- Duplicate browser requests or callbacks must not create duplicate charges or transitions.
- Browser redirects and unverified callbacks never prove success.
- Provider events require the contractually approved authentication, transaction/amount/currency checks and replay protection.
- Timeouts and ambiguous submission failures remain pending until reconciliation resolves them.
- Only configured trusted redirect origins may be returned.
- Never collect wallet PINs or payment credentials inside R2H without explicit approval.

### Fulfilment and exception rules

- Verified payment success queues fulfilment through the outbox.
- Synthetic provider supports success, rejection and delay.
- Payment success plus fulfilment rejection creates `ACTION_REQUIRED`, preserving successful payment.
- Late payment after hold expiry creates an exception unless capacity is safely reacquired under an approved policy; never confirm without capacity.
- Unknown provider submission outcome must be reconciled before a potentially duplicating retry.
- Confirmed fulfilment converts held inventory into allocated inventory exactly once.
- Paid/delayed fulfilment and released capacity require an explicit consistent policy; do not extend the original quote hold indefinitely.

### Cancellation and refunds

- Customer requests cancellation; an authorized operator decides.
- Pre-service approved demo cancellation results in a simulated full refund.
- Post-start cancellation requires operator review and must not automatically refund.
- Record cancellation decision, fulfilment cancellation needs, refund state and inventory release independently.
- Failed/pending refunds remain visible and retryable; prevent refunds exceeding the successful paid amount.
- Record reasons and audit events for every operator decision.

## 11. Provider interfaces

Define typed interfaces for identity, catalogue imports, pricing, inventory/reservations, payments, fulfilment and notifications. Both synthetic and connected adapters return normalized domain results and normalized errors.

- Only `backend/app/integrations/` understands raw external response formats.
- UI components never depend on MiPAY envelopes or endpoint paths.
- A scraper implements catalogue ingestion, not payment or booking.
- Demo pricing/capacity belongs to the backend; real pricing/capacity may belong to the provider. Record the authority per capability.
- Unsupported connected capabilities fail closed. Do not create fake working MiPAY implementations without supplied contracts.
- Unit-test synthetic adapters immediately; add connected contract tests from approved fixtures/contracts when available.

## 12. API contract outline

Proposed prefix: `/api/v1`. Exact paths must be reconciled with current frontend interfaces.

| Group | Operations |
| --- | --- |
| Sessions | Create demo session, current identity, logout |
| Services | List enabled services and capabilities |
| Agencies | List/filter agencies, agency detail |
| Catalogue | List/filter packages, package detail, departures |
| Quotes | Create quote, retrieve owned quote |
| Bookings | Create, list owned bookings, retrieve detail, request cancellation |
| Payments | Start attempt, retrieve owned attempt status |
| Provider events | Authenticated provider callback ingestion |
| Operations | List exceptions, make audited decisions, request safe recovery |
| Imports | Start approved import, inspect run/change set, review, publish |

- Use shared pagination, validation, timeout and error conventions.
- Success returns normalized data; errors contain safe code/message and request ID, never upstream dumps.
- Use meaningful HTTP statuses, including validation, authentication, authorization, conflict and unavailable-provider errors.
- Document idempotency requirements and conflicting-payload behaviour in OpenAPI.
- Generate frontend external contract types from OpenAPI; avoid duplicate handwritten transport models.
- Maintain domain-to-transport mappings where needed rather than leaking database models.

## 13. Durable background processing

Write state changes and outbox records in one transaction. Workers claim jobs with leases, retry with bounded backoff, and tolerate duplicate delivery. Processing is at-least-once; handlers must be idempotent.

Jobs include hold expiry, payment reconciliation, fulfilment recovery, refunds, notifications, and approved imports. Persist attempt count, next attempt time, last safe error and terminal/manual-review status. Recover abandoned leases after worker failure.

Do not rely on FastAPI in-process background tasks for critical transaction work. Do not retry indefinitely without an operations-visible exception. Notifications must not determine booking success.

## 14. Configuration and environment isolation

Proposed backend settings, finalized and documented during implementation:

| Setting | Purpose |
| --- | --- |
| `APP_ENV` | Explicit demo, test, UAT or production environment |
| `DATABASE_URL` | PostgreSQL connection, secret-managed outside source |
| `IDENTITY_PROVIDER` | Explicit identity adapter |
| `PAYMENT_PROVIDER` | Explicit payment adapter |
| `BOOKING_PROVIDER` | Explicit fulfilment/booking adapter |
| `ENABLED_SERVICES` | Backend-authoritative service enablement |
| `TRUSTED_PAYMENT_REDIRECT_ORIGINS` | Validated redirect allowlist |
| `IMPORTS_ENABLED` | Explicit permission to run configured imports |

Validate settings at startup through one typed module. Required connected URLs/credentials must be configured before UAT/production can start. Synthetic providers must be rejected in UAT/production. The existing frontend production mock safeguard remains unchanged.

Browser-visible flags are presentation hints, never payment/booking authority. Network failure must never select synthetic data. Keep real imported records separate from fictional demo offers and synthetic transactions. Demo outcome controls are restricted to authorized demo/test use and unavailable in connected environments.

## 15. Operations, observability and privacy

Operations screens must support import review, booking exception inspection, pending-payment recovery visibility, cancellation decisions and refund tracking. Use existing frontend patterns without changing the visual contract.

- Separate customer, operator and administrative capabilities; enforce them in FastAPI.
- Audit actor, action, target, safe change summary, reason, time and correlation ID.
- Redact tokens, contact details and sensitive provider payloads from logs/errors.
- Track import failures, outbox lag, expired holds, pending payment age, fulfilment failures and refund backlog.
- Expose minimal liveness/readiness endpoints without secrets; database availability affects readiness.
- Define backups, restore verification, retention and credential management before non-demo deployment.

## 16. Testing and acceptance

### Automated coverage

- Schema validation, money calculations, expiry and allowed transitions.
- Import normalization, duplicates, branch handling, stale evidence and preserved overrides.
- Unauthorized and cross-customer access rejection.
- Last-place contention: concurrent bookings cannot oversell.
- Duplicate booking/payment requests and conflicting idempotency payloads.
- Payment timeout, duplicate/out-of-order events, late success and fulfilment rejection after payment.
- Worker restart, duplicate jobs and hold-release races.
- Refund retries, duplicate operator actions and refund amount limits.
- Missing configuration, production mock rejection and absence of real-to-mock fallback.
- Import request safety, malformed files, blocked sources and partial-run failures.

### First milestone acceptance

1. A fresh setup can migrate, seed fictional data, start API/worker and complete the full Umrah journey without external credentials.
2. State survives API and worker restarts.
3. Server totals are authoritative, quotes last 15 minutes and holds never exceed quote expiry.
4. Payment and fulfilment outcomes can be exercised independently with authorized demo controls.
5. Paid/unfulfilled bookings appear as exceptions, not false confirmations.
6. History and receipts reflect backend-confirmed state.
7. An operator can approve pre-service cancellation and observe a simulated full refund.
8. Existing agency files can be imported idempotently after schema approval; publication requires review.
9. Existing frontend layout is preserved at 320, 375, 390 and 430 pixels, including keyboard/loading/empty/error states.
10. No real secrets or customer data enter fixtures, screenshots or logs.

Demo completion does not make any service `active`. Connected contract tests, UAT, visual acceptance and stakeholder approval remain required by AGENTS.md.

## 17. Delivery plan

| Phase | Deliverable / exit condition |
| --- | --- |
| 0 | Compatibility/source audit and confirmed authority mapping |
| 1 | Backend bootstrap, validated config, PostgreSQL migrations, demo identity, health checks |
| 2 | Seeded catalogue and reviewed local agency import with provenance |
| 3 | Quotes, travellers, atomic inventory and idempotent bookings |
| 4 | Synthetic payments/fulfilment, durable recovery, history |
| 5 | Operations exceptions, cancellations, refunds and audit |
| 6 | Frontend integration and complete acceptance suite |
| 7 | One second service through shared commerce orchestration |
| 8 | Approved connected adapters, contract verification and UAT |

Approved website collection can follow the local-import phase without blocking the synthetic booking journey. Other product modules remain later scope.

## 18. Documentation and release requirements

Update README when runnable setup commands exist; this draft does not claim any backend command is available yet. Maintain architecture, integration contract, local development, service status, and assumptions/decisions documents as implementation proceeds. Update `LOCAL_UI_MOCK_GUIDE.md` whenever mock behaviour changes. Do not modify `REPO_STATUS.md` without request.

Every release needs a known previous application version, configuration rollback instructions and a database migration compatibility plan. Prefer additive migrations; test restores and never assume application rollback can reverse destructive data changes. Demo reset commands must validate the environment and exact database target and require explicit destructive-action confirmation.

## 19. Open decisions

- Exact PJH/agency sources, source permissions, refresh frequency and stale thresholds.
- Existing dataset schemas and distinctions between company, branch and seasonal evidence.
- Original frontend/API/status contracts and actual MiPAY ownership boundaries.
- Approved session exchange, provider authentication, callback and redirect contracts.
- Whether imported offers initially support information only or a defined enquiry workflow.
- Paid-but-delayed fulfilment capacity policy and operator recovery permissions.
- Deployment target, retention periods and notification channels.

Resolve each decision before its dependent implementation. Missing real integration details must not block a clearly isolated synthetic demo, but they must block claims of live compatibility.
