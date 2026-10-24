"use client";
import { PageTitle, MetricRow } from "@/components/ui";
import BookingForm from "@/components/bookings/booking-form";
import BookingList from "@/components/bookings/booking-list";
import { useKutip } from "@/lib/store";
import { fmtRM } from "@/engine/model";
export default function BookingsPage() {
  const bookings = useKutip((s) => s.state.bookings);
  const held = bookings.filter((b) => b.status === "on_hold");
  return (
    <div>
      <PageTitle title="Bookings" subtitle="Keep business moving, with the right credit decisions." />
      <MetricRow
        items={[
          { label: "Total bookings", value: bookings.length },
          { label: "Awaiting credit review", value: held.length },
          { label: "Booking value", value: fmtRM(bookings.reduce((sum, b) => sum + b.amount, 0)) },
        ]}
      />
      <div className="workspace-split">
        <BookingList />
        <aside>
          <BookingForm />
        </aside>
      </div>
    </div>
  );
}
