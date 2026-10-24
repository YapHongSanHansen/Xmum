"use client";
// FR-D1: record a new booking (Owner or Clerk). A credit booking for a customer
// 30+ days late goes ON HOLD and raises an Owner credit check (R4).
import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, Wand2 } from "lucide-react";
import { useKutip } from "@/lib/store";
import { Button, Card, CardHeader, RuleTag } from "@/components/ui";
import type { Booking } from "@/engine/model";

type Terms = Booking["terms"];

const DEMO = {
  customerId: "c-hupseng",
  route: "Klang → Johor Bahru, 1 lorry",
  amount: "2400",
  terms: "credit" as Terms,
  creditDays: "60",
};

const EMPTY = { customerId: "", route: "", amount: "", terms: "credit" as Terms, creditDays: "30" };

const inputCls =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-400";

export default function BookingForm() {
  const customers = useKutip((s) => s.state.customers);
  const dispatch = useKutip((s) => s.dispatch);
  const [form, setForm] = useState(EMPTY);
  const [note, setNote] = useState<{ tone: "good" | "warn" | "bad"; text: string } | null>(null);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const ringgit = Number(form.amount);
  const days = Number(form.creditDays);
  const valid =
    form.customerId !== "" &&
    form.route.trim() !== "" &&
    Number.isFinite(ringgit) &&
    ringgit > 0 &&
    (form.terms !== "credit" || (Number.isInteger(days) && days > 0));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setNote({ tone: "bad", text: "Pick a customer and fill in the route, an amount above zero and the credit days." });
      return;
    }
    const ok = dispatch({
      type: "ENTER_BOOKING",
      customerId: form.customerId,
      route: form.route.trim(),
      amount: Math.round(ringgit * 100),
      terms: form.terms,
      creditDays: form.terms === "credit" ? days : 0,
    });
    if (!ok) return;
    const b = useKutip.getState().state.bookings.at(-1);
    setNote(
      b?.status === "on_hold"
        ? { tone: "warn", text: "Booking saved and put ON HOLD: a credit check was sent to the Owner (R4)." }
        : { tone: "good", text: "Booking saved and accepted." },
    );
    setForm(EMPTY);
  };

  return (
    <Card>
      <CardHeader
        kicker="New booking"
        title="Record an order"
        right={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setForm(DEMO);
              setNote(null);
            }}
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden />
            Fill demo booking
          </Button>
        }
      />
      <form onSubmit={submit} className="space-y-3 p-4">
        <Field label="Customer">
          <select className={inputCls} value={form.customerId} onChange={(e) => set("customerId", e.target.value)}>
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Route">
          <input className={inputCls} value={form.route} placeholder="e.g. Klang → Ipoh, 1 lorry" onChange={(e) => set("route", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (RM)">
            <input
              className={`${inputCls} text-right tabular-nums`}
              inputMode="decimal"
              value={form.amount}
              placeholder="0"
              onChange={(e) => set("amount", e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </Field>
          <Field label="Terms">
            <select className={inputCls} value={form.terms} onChange={(e) => set("terms", e.target.value as Terms)}>
              <option value="credit">Credit</option>
              <option value="cod">Cash on delivery</option>
              <option value="prepaid">Prepaid</option>
            </select>
          </Field>
        </div>
        <Field label="Credit days">
          <input
            className={`${inputCls} text-right tabular-nums`}
            inputMode="numeric"
            disabled={form.terms !== "credit"}
            value={form.terms === "credit" ? form.creditDays : ""}
            placeholder={form.terms === "credit" ? "30" : "n/a"}
            onChange={(e) => set("creditDays", e.target.value.replace(/[^0-9]/g, ""))}
          />
        </Field>
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <RuleTag id="R4" />
            <span>Credit orders for customers 30+ days late go on hold. COD and prepaid are not checked.</span>
          </div>
          <Button type="submit" disabled={!valid} className="whitespace-nowrap">
            <Plus className="h-4 w-4" aria-hidden />
            Save booking
          </Button>
        </div>
        {note && (
          <div
            className={
              note.tone === "warn"
                ? "rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900"
                : note.tone === "good"
                  ? "rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
                  : "rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-900"
            }
          >
            {note.text}
          </div>
        )}
      </form>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
