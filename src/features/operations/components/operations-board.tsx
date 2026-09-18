"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/domain/status-badge";
import { StateMessage } from "@/components/patterns/state-message";
import { api } from "@/lib/api/client";
import type { Booking } from "@/lib/api/types";

export function OperationsBoard() {
  const [items, setItems] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true); setError("");
    try { setItems(await api.operationsBookings()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load operations queue"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    api.operationsBookings().then((bookings) => {
      if (active) setItems(bookings);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load operations queue");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function decide(id: string, approve: boolean) {
    try { await api.decideCancellation(id, approve); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to apply decision"); }
  }

  if (loading) return <StateMessage>Loading operations queue…</StateMessage>;
  if (error) return <StateMessage tone="error">{error}</StateMessage>;
  const actionable = items.filter((item) => ["PENDING_PROVIDER", "ACTION_REQUIRED", "CANCEL_REQUESTED"].includes(item.state));
  if (!actionable.length) return <StateMessage>No pending confirmations, fulfilment failures, cancellations, or refunds.</StateMessage>;
  return <div className="space-y-3">{actionable.map((booking) => <article key={booking.id} className="rounded-[16px] border border-black/10 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Operations case</p><div className="mt-2 flex justify-between gap-3"><strong>{booking.reference}</strong><StatusBadge status={booking.state} /></div><div className="mt-3 flex justify-between text-sm"><span>Payment</span><StatusBadge status={booking.payment?.state ?? "NOT STARTED"} /></div>{booking.state === "CANCEL_REQUESTED" && <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => decide(booking.id, false)} className="min-h-11 rounded-full border font-semibold">Decline</button><button onClick={() => decide(booking.id, true)} className="min-h-11 rounded-full bg-primary font-semibold text-white">Approve refund</button></div>}{booking.state === "ACTION_REQUIRED" && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Payment remains recorded. Operator must resolve fulfilment or approve a refund through a future recovery action.</p>}</article>)}</div>;
}
