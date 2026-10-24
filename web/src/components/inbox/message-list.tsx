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
        "w-full border p-2.5 text-left transition-colors",
        active ? "border-navy bg-navy-soft ring-1 ring-inset ring-navy" : "border-line bg-surface hover:bg-canvas",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{c.name}</div>
          <div className="text-[11px] text-ink2">
            {c.contact} · <span className="num">{fmtDateTime(m.receivedAt)}</span>
          </div>
        </div>
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
      </div>
      <div className="mt-2 flex items-start gap-2 rounded-md bg-[#efeae2] p-1.5">
        <div className="min-w-0 flex-1 bg-white px-2 py-1 text-xs text-ink">
          <p className="line-clamp-2">{m.text}</p>
          {m.image && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-ink2">
              <Paperclip className="h-3 w-3" /> slip image
            </div>
          )}
        </div>
        {m.image && <SlipThumb src={m.image} />}
      </div>
    </button>
  );
}
