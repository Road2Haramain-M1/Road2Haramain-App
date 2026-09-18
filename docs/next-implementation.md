# Next implementation reminder

Updated: 2026-09-16

## Current completed slice

- FastAPI compatibility endpoints match the frontend catalogue, quote, booking, and payment client.
- Next.js same-origin `/api/r2h/*` proxy forwards requests to the server-only `R2H_BACKEND_URL`.
- Umrah journey collects one traveller and performs quote → booking → simulated payment.
- Umrah directory now shows one tile per normalized agency brand and retains MOTAC offices as branches.
- Duplicate transaction submission is disabled while processing.
- Backend and frontend tests/build currently pass.

## Continue next

1. Replace the in-memory `DemoService` state with PostgreSQL repositories and migrations.
2. Add wallet session authentication and booking ownership to the BFF and backend.
3. Add quote hold expiry and atomic inventory release/recovery.
4. Make payment state transitions immutable and add timeout/retry recovery.
5. Add operator approval for cancellation and simulated refunds.
6. Add booking detail/history polling for pending and action-required states.
7. Remove the hardcoded booking-fee presentation and use the backend quote total.
8. Add contract tests for mock and future MiPAY adapters, then complete UAT configuration.

## Important status

The current connected transaction is a fictional demo flow. It is not production-ready,
does not use real MiPAY credentials, and must not be labelled UAT-verified until the
backend persistence, authentication, provider adapters, and acceptance tests are complete.
