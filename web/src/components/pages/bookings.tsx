"use client";
import { PageTitle, MetricRow, stagger } from "@/components/ui";
import BookingForm from "@/components/bookings/booking-form";
import BookingList from "@/components/bookings/booking-list";
import { useKachingg } from "@/lib/store";
import { fmtRM } from "@/engine/model";
export default function BookingsPage() {
  const bookings = useKachingg((s) => s.state.bookings);
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
        <div className="k-rise min-w-0" style={stagger(3)}>
          <BookingList />
        </div>
        <aside className="k-rise" style={stagger(4)}>
          <BookingForm />
        </aside>
      </div>
    </div>
  );
}
