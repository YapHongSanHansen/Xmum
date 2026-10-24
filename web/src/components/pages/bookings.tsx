"use client";
// Bookings: record orders and decide R4 credit checks (PRD §7D).
import { useKutip } from "@/lib/store";
import { PageTitle } from "@/components/ui";
import { fmtDateTime, userOf } from "@/engine/model";
import BookingForm from "@/components/bookings/booking-form";
import BookingList from "@/components/bookings/booking-list";

export default function BookingsPage() {
  const state = useKutip((s) => s.state);
  const me = userOf(state, state.role);
  return (
    <div className="mx-auto max-w-7xl">
      <PageTitle
        title="Bookings"
        subtitle={`${fmtDateTime(state.now)} · signed in as ${me.name} (${state.role === "owner" ? "Owner" : "Clerk"}). Credit checks are decided by the Owner.`}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[380px_1fr]">
        <BookingForm />
        <BookingList />
      </div>
    </div>
  );
}
