/**
 * Determines whether the browser may use the fictional presentation catalogue.
 *
 * `NEXT_PUBLIC_LOCAL_UI_MOCK` remains development-only. The deployed flag is a
 * user-approved, presentation-only exception for this public mockup: it never
 * selects payment, booking, identity, or provider integrations and only exposes
 * the existing fictional client fixtures. It must not be used for UAT or a real
 * customer journey.
 */
export const presentationDemoEnabled =
  (process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_LOCAL_UI_MOCK === "true") ||
  process.env.NEXT_PUBLIC_DEPLOYED_DEMO_MOCK === "true";
