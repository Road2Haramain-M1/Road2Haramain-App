"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";

export type PopularPackage = Product & { agencyName: string };

/** Reuses the configured catalogue adapter; failures never substitute mock data. */
export function usePopularPackages() {
  const [items, setItems] = useState<PopularPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    Promise.all([api.products(), api.agencies()])
      .then(([products, agencies]) => {
        if (!active) return;
        // Until popularity metrics exist, this is a catalogue-order preview, not a sales ranking.
        setItems(products.filter(item => item.category === "umrah").slice(0, 4).map(item => ({
          ...item, agencyName: agencies.find(agency => agency.id === item.provider_id)?.name ?? "Agency details unavailable",
        })));
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  return { items, loading, error, retry: () => setAttempt(value => value + 1) };
}
