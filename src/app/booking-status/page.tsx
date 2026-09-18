import { BookingList } from "@/features/bookings/components/booking-list";
import { PilgrimageShell, StickyContentHeader } from "@/features/pilgrimage/components/pilgrimage-shell";
import styles from "@/features/pilgrimage/components/pilgrimage.module.css";

export default function BookingStatusPage() {
  return <main><PilgrimageShell title="Booking Status" icon="/svgs/booking-status.svg"><StickyContentHeader watermark="booking"><h1 className={styles.heading}>Booking Status</h1><p className={styles.description}>View the latest status of your bookings.</p></StickyContentHeader><div className={styles.bookingList}><BookingList /></div></PilgrimageShell></main>;
}
