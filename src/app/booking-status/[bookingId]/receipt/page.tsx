"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { PilgrimageShell } from "@/features/pilgrimage/components/pilgrimage-shell";
import { StateMessage } from "@/components/patterns/state-message";
import { api } from "@/lib/api/client";
import type { Booking } from "@/lib/api/types";
import styles from "@/features/bookings/components/booking-detail.module.css";
export default function BookingReceiptPage({ params }: { params: Promise<{ bookingId: string }> }) {
 const { bookingId } = use(params);
 const [booking,setBooking]=useState<Booking|null>(null);
 useEffect(()=>{api.bookings().then(items=>setBooking(items.find(item=>item.id===bookingId)??null));},[bookingId]);
 if(!booking)return <PilgrimageShell title="Receipt"><StateMessage>Loading receipt…</StateMessage></PilgrimageShell>;
 return <PilgrimageShell title="Receipt" icon="/svgs/booking-status.svg"><p className={styles.eyebrow}>Payment receipt</p><section className={styles.card}><h1>{booking.reference}</h1><p className={styles.agency}>{booking.package_name}</p><dl><div><dt>Agency</dt><dd>{booking.agency_name}</dd></div><div><dt>Booking fee paid</dt><dd>RM {Number(booking.booking_fee).toLocaleString("en-MY",{minimumFractionDigits:2})}</dd></div><div><dt>Payment status</dt><dd>Paid</dd></div></dl></section><div className={styles.actions}><Link className={styles.secondary} href={`/booking-status/${booking.id}`}>Back to booking details</Link></div></PilgrimageShell>;
}
