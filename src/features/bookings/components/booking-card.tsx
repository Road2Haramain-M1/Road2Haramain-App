import { StatusBadge } from "@/components/domain/status-badge";
import Link from "next/link";
import type { Booking } from "@/lib/api/types";
import styles from "./booking-card.module.css";

function displayDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Presents a booking without owning fetching or cancellation side effects. */
export function BookingCard({ booking }: { booking: Booking }) {
  const fee = booking.booking_fee == null ? null : Number(booking.booking_fee);
  const feeLabel = fee !== null && Number.isFinite(fee)
    ? `${booking.currency === "MYR" ? "RM" : booking.currency} ${fee.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Not available";

  return <article className={styles.card}>
    <header className={styles.top}>
      <span className={styles.reference}>{booking.reference}</span>
      <StatusBadge status={booking.state} />
    </header>
    <h2 className={styles.title}>{booking.package_name ?? "Booking package"}</h2>
    <p className={styles.agency}>{booking.agency_name ?? "Agency not available"}</p>
    <dl className={styles.dates}>
      <div><dt>Start</dt><dd>{displayDate(booking.start_date)}</dd></div>
      <div><dt>End</dt><dd>{displayDate(booking.end_date)}</dd></div>
    </dl>
    <div className={styles.payment}>
      <div><span className={styles.label}>Booking Fee</span><strong className={styles.amount}>{feeLabel}</strong></div>
      <div className={styles.paymentStatus}><span className={styles.label}>Payment</span><StatusBadge status={booking.payment?.state ?? "NOT STARTED"} /></div>
    </div>
    <Link href={`/booking-status/${booking.id}`} className={styles.detailsLink}>View details</Link>
  </article>;
}
