"use client";
// Left column: arrived messages only, one row each: name, time, status, preview (FR-E1).
import { Paperclip } from "lucide-react";
import { customerOf, fmtDateTime, type InboundMessage, type State } from "@/engine/model";
import { Badge, Empty, cx } from "@/components/ui";
import { STATUS_LABEL, STATUS_TONE, arrivedMessages, messageStatus } from "./status";

export function MessageList({ state, selectedId, onSelect }: { state: State; selectedId: string | null; onSelect: (id: string) => void }) {
  const messages = arrivedMessages(state);
  if (!messages.length) {
    return <Empty>No replies yet.</Empty>;
  }
  return (
    <ul className="divide-y divide-hairline border border-line bg-surface">
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
      aria-current={active || undefined}
      className={cx(
        "block w-full border-l-[3px] px-4 py-3 text-left transition-colors",
        active ? "border-l-navy bg-navy-soft" : "border-l-transparent hover:bg-canvas",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 truncate text-[13px] font-semibold text-ink">{c.name}</div>
        <span className="num shrink-0 text-[11px] text-ink2">{fmtDateTime(m.receivedAt)}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-ink2">
        {m.image && <Paperclip className="h-3 w-3 shrink-0" aria-label="Slip attached" />}
        <span className="min-w-0 flex-1 truncate">{m.text}</span>
        <Badge tone={STATUS_TONE[status]} className="shrink-0">
          {STATUS_LABEL[status]}
        </Badge>
      </div>
    </button>
  );
}
