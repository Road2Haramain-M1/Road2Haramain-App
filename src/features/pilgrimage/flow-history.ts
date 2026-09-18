export type PilgrimageService = "umrah" | "hajj" | "umrah-instalment";
export type PilgrimageHistoryLayer = "directory" | "journey";

export type PilgrimageHistoryEntry = {
  layer: PilgrimageHistoryLayer;
  service: PilgrimageService;
  step?: string;
  installmentStage?: number;
};

type BrowserHistoryState = Record<string, unknown> & { r2hPilgrimage?: PilgrimageHistoryEntry };

/**
 * Adds one in-page pilgrimage state to browser history without replacing Next.js'
 * router state. This lets native Android/iOS back gestures restore a local flow
 * step before leaving the current route.
 */
export function pushPilgrimageHistory(entry: PilgrimageHistoryEntry) {
  const current = window.history.state;
  const state = current && typeof current === "object" ? current as BrowserHistoryState : {};
  window.history.pushState({ ...state, r2hPilgrimage: entry }, "", window.location.href);
}

/** Returns the normalized R2H flow marker from a browser history state, if present. */
export function getPilgrimageHistory(state: unknown): PilgrimageHistoryEntry | undefined {
  if (!state || typeof state !== "object") return undefined;
  const entry = (state as BrowserHistoryState).r2hPilgrimage;
  if (!entry || typeof entry !== "object") return undefined;
  if ((entry.service !== "umrah" && entry.service !== "hajj" && entry.service !== "umrah-instalment") || (entry.layer !== "directory" && entry.layer !== "journey")) return undefined;
  return entry;
}
