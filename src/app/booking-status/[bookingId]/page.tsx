import { BookingDetail } from "@/features/bookings/components/booking-detail";
export default async function BookingDetailPage({params}:{params:Promise<{bookingId:string}>}) { const {bookingId}=await params; return <main><BookingDetail bookingId={bookingId}/></main>; }
