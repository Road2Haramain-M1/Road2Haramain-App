/**
 * Selects fixture-only data for local development or an explicitly approved
 * public mockup build. `NEXT_PUBLIC_STATIC_MOCKUP` is deliberately build-time
 * and contains no real provider, payment, or customer data.
 */
export const isUiMockEnabled =
  process.env.NEXT_PUBLIC_STATIC_MOCKUP === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_LOCAL_UI_MOCK === "true");
