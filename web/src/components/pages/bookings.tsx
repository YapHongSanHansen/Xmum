"use client";
// Bookings: record orders and decide R4 credit checks (PRD §7D).
import { PageTitle } from "@/components/ui";
import BookingForm from "@/components/bookings/booking-form";
import BookingList from "@/components/bookings/booking-list";

export default function BookingsPage() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageTitle title="Bookings" />
      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <BookingForm />
        <BookingList />
      </div>
    </div>
  );
}
