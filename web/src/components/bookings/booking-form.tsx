"use client";
// FR-D1: record a new booking (Owner or Clerk). A credit booking for a customer
// 30+ days late goes ON HOLD and raises an Owner credit check (R4).
import { useState, type FormEvent, type ReactNode } from "react";
import { Wand2 } from "lucide-react";
import { useKachingg } from "@/lib/store";
import { Button, Card, CardHeader, RuleTag, cx } from "@/components/ui";
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
  "h-[34px] w-full rounded-xl border border-line-strong bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink3 disabled:bg-canvas disabled:text-ink2";

const NOTE_TONE = { good: "text-emerald-700", warn: "text-amber-800", bad: "text-rose-700" } as const;

export default function BookingForm() {
  const customers = useKachingg((s) => s.state.customers);
  const dispatch = useKachingg((s) => s.dispatch);
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
      setNote({ tone: "bad", text: "Fill in customer, route, amount and credit days." });
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
    const b = useKachingg.getState().state.bookings.at(-1);
    setNote(
      b?.status === "on_hold"
        ? { tone: "warn", text: "Saved · on hold for an Owner credit check." }
        : { tone: "good", text: "Saved · accepted." },
    );
    setForm(EMPTY);
  };

  return (
    <Card>
      <CardHeader
        title="New booking"
        right={
          <Button
            type="button"
            size="sm"
            variant="ghost"
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
      <form onSubmit={submit} className="grid grid-cols-2 gap-x-3 gap-y-3.5 p-5">
        <Field label="Customer" className="col-span-2">
          <select className={inputCls} value={form.customerId} onChange={(e) => set("customerId", e.target.value)}>
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Route" className="col-span-2">
          <input className={inputCls} value={form.route} placeholder="Klang → Ipoh" onChange={(e) => set("route", e.target.value)} />
        </Field>
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
        <div className="flex items-end">
          <Button type="submit" disabled={!valid} className="w-full">
            Save booking
          </Button>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-xs text-ink2">
          <RuleTag id="R4" />
          <span>Credit, 30+ days late: on hold</span>
        </div>
        {note && (
          <div role="status" className={cx("col-span-2 text-xs font-medium", NOTE_TONE[note.tone])}>
            {note.text}
          </div>
        )}
      </form>
    </Card>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={cx("block min-w-0", className)}>
      <span className="mb-1 block text-xs text-ink2">{label}</span>
      {children}
    </label>
  );
}
