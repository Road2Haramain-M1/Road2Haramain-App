"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PilgrimageShell, StickyContentHeader } from "@/features/pilgrimage/components/pilgrimage-shell";
import { StatusBadge } from "@/components/domain/status-badge";
import { StateMessage } from "@/components/patterns/state-message";
import { api } from "@/lib/api/client";
import type { Booking } from "@/lib/api/types";
import styles from "./booking-detail.module.css";

function date(value?: string) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Not available"; }

export function BookingDetail({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.bookings().then(items => setBooking(items.find(item => item.id === bookingId) ?? null)).catch(() => setError("Unable to load booking details")); }, [bookingId]);
  if (error) return <PilgrimageShell title="Booking Details"><StateMessage tone="error">{error}</StateMessage></PilgrimageShell>;
  if (!booking) return <PilgrimageShell title="Booking Details"><StateMessage>Loading booking details…</StateMessage></PilgrimageShell>;
  const updates = booking.status_updates ?? [{ label: "Booking confirmed", date: date(booking.created_at.slice(0, 10)), detail: "Your Umrah booking has been confirmed." }, { label: "Booking fee received", date: date(booking.created_at.slice(0, 10)), detail: "Your booking fee payment was received." }];
  return <PilgrimageShell title="Booking Details" icon="/svgs/booking-status.svg">
    <StickyContentHeader><p className={styles.eyebrow}>Booking details</p><div className={styles.headingRow}><h1>{booking.package_name}</h1><StatusBadge status={booking.state} /></div><p className={styles.agency}>{booking.agency_name}</p></StickyContentHeader>
    <section className={styles.card}><h2>Umrah information</h2><dl><div><dt>Booking reference</dt><dd>{booking.reference}</dd></div><div><dt>Travel dates</dt><dd>{date(booking.start_date)} – {date(booking.end_date)}</dd></div><div><dt>Package amount</dt><dd>RM {Number(booking.total_amount).toLocaleString("en-MY", { minimumFractionDigits: 2 })}</dd></div><div><dt>Booking fee</dt><dd>RM {Number(booking.booking_fee).toLocaleString("en-MY", { minimumFractionDigits: 2 })}</dd></div></dl></section>
    <section className={styles.card}><h2>Status updates</h2><div className={styles.timeline}>{updates.map(update => <div className={styles.update} key={update.label}><span className={styles.dot} /><div><strong>{update.label}</strong><small>{update.date}</small><p>{update.detail}</p></div></div>)}</div></section>
    <section className={styles.remark}><h2>Remark</h2><p>{booking.remarks ?? "The agency will share your travel documents and next steps when ready."}</p></section>
    <div className={styles.actions}><Link className={styles.primary} href={`/booking-status/${booking.id}/receipt`}>View receipt</Link><Link className={styles.secondary} href="/booking-status">Back to booking status</Link></div>
  </PilgrimageShell>;
}
