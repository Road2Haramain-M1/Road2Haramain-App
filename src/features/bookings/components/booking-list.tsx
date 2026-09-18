"use client";

import { useEffect, useState } from "react";
import { BookingCard } from "./booking-card";
import { StateMessage } from "@/components/patterns/state-message";
import { api } from "@/lib/api/client";
import type { Booking } from "@/lib/api/types";

export function BookingList() {
  const [items, setItems] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.bookings().then((bookings) => {
      if (active) setItems(bookings);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load bookings");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <StateMessage>Loading booking history…</StateMessage>;
  if (error) return <StateMessage tone="error">{error}</StateMessage>;
  if (!items.length) return <StateMessage>No bookings yet. Complete the Umrah journey first.</StateMessage>;
  return <div>{items.map(booking => <BookingCard key={booking.id} booking={booking} />)}</div>;
}
