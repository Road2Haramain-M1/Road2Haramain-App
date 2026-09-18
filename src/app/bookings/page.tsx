import { BookingList } from "@/features/bookings/components/booking-list";
import { PageHeader } from "@/components/patterns/page-header";

export default function BookingsPage() {
  return <main className="min-h-[100dvh]"><PageHeader title="Booking History" /><section className="m-4 rounded-[24px] bg-white p-4"><BookingList /></section></main>;
}
