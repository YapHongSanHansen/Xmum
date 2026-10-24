"use client";
// Left column: arrived messages only, WhatsApp-style previews (FR-E1).
import { Paperclip } from "lucide-react";
import { customerOf, fmtDateTime, type InboundMessage, type State } from "@/engine/model";
import { Badge, Empty, cx } from "@/components/ui";
import { SlipThumb } from "./bubble";
import { STATUS_LABEL, STATUS_TONE, arrivedMessages, messageStatus } from "./status";

export function MessageList({ state, selectedId, onSelect }: { state: State; selectedId: string | null; onSelect: (id: string) => void }) {
  const messages = arrivedMessages(state);
  if (!messages.length) {
    return <Empty>No replies yet. Messages appear here when the demo clock passes their arrival time.</Empty>;
  }
  return (
    <ul className="space-y-2">
      {messages.map((m) => (
        <li key={m.id}>
          <MessageRow state={state} m={m} active={m.id === selectedId} onSelect={() => onSelect(m.id)} />
        </li>
      ))}
    </ul>
  );
}

function MessageRow({ state, m, active, onSelect }: { state: State; m: InboundMessage; active: boolean; onSelect: () => void }) {
  const c = customerOf(state, m.customerId);
  const status = messageStatus(state, m);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "w-full rounded-lg border p-2.5 text-left transition-colors",
        active ? "border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-300" : "border-slate-200 bg-white hover:bg-slate-50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{c.name}</div>
          <div className="text-[11px] text-slate-500">
            {c.contact} · {fmtDateTime(m.receivedAt)}
          </div>
        </div>
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
      </div>
      <div className="mt-2 flex items-start gap-2 rounded-md bg-[#efeae2] p-1.5">
        <div className="min-w-0 flex-1 rounded-md rounded-tl-none bg-white px-2 py-1 text-xs text-slate-800 shadow-sm">
          <p className="line-clamp-2">{m.text}</p>
          {m.image && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
              <Paperclip className="h-3 w-3" /> slip image
            </div>
          )}
        </div>
        {m.image && <SlipThumb src={m.image} />}
      </div>
    </button>
  );
}
