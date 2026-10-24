"use client";
// Inbox (PRD §7E, FR-E1–E12): customers' WhatsApp replies, Bukti's AI reading,
// and the deterministic rules' verdict. Every change is an engine action.
import { useCallback, useState } from "react";
import { useKachingg } from "@/lib/store";
import { readMessage } from "@/lib/extract-client";
import { Badge, Card, CardHeader, Empty, PageTitle } from "@/components/ui";
import { BankStatement } from "@/components/inbox/bank-statement";
import { SlipLightbox } from "@/components/inbox/bubble";
import { HandoffQueue } from "@/components/inbox/handoff-queue";
import { MessageDetail, type RunInfo } from "@/components/inbox/message-detail";
import { MessageList } from "@/components/inbox/message-list";
import { arrivedMessages } from "@/components/inbox/status";

export default function InboxPage() {
  const state = useKachingg((s) => s.state);
  const dispatch = useKachingg((s) => s.dispatch);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, RunInfo>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const arrived = arrivedMessages(state);
  const selected = arrived.find((m) => m.id === selectedId) ?? arrived[0] ?? null;

  async function read(messageId: string) {
    setRuns((r) => ({ ...r, [messageId]: { loading: true } }));
    let info: RunInfo;
    try {
      const res = await readMessage(messageId);
      const ok = dispatch({ type: "APPLY_EXTRACTION", messageId, extraction: res.extraction, model: res.model, cached: res.cached });
      info = res.cached
        ? { loading: false, cached: true, label: `Cached result · ${res.reason}`, failed: !ok }
        : { loading: false, cached: false, label: `Live · ${res.model} · ${(res.ms / 1000).toFixed(1)}s`, failed: !ok };
    } catch {
      info = { loading: false, cached: true, label: "No reading available", failed: true };
    }
    setRuns((r) => ({ ...r, [messageId]: info }));
  }

  return (
    <div>
      <PageTitle
        title="Bukti inbox"
        subtitle="From “dah bank in” to a payment you can verify."
        right={
          <Badge tone="sky">
            {arrived.length} {arrived.length === 1 ? "reply" : "replies"} received
          </Badge>
        }
      />

      <div className="inbox-layout">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader title="Conversations" right={<Badge>{arrived.length}</Badge>} />
            <MessageList state={state} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          </Card>
          <BankStatement state={state} />
        </div>
        <div id="message-detail" className="min-w-0 scroll-mt-6">
          <HandoffQueue state={state} onOpen={setSelectedId} />
          {selected ? (
            <MessageDetail
              key={selected.id}
              state={state}
              msg={selected}
              run={runs[selected.id]?.loading || state.extractions[selected.id] ? runs[selected.id] : undefined}
              onRead={() => read(selected.id)}
              onEnlarge={setLightbox}
            />
          ) : (
            <Card className="p-7">
              <div className="mb-6 inline-flex rounded-xl bg-sky-100 px-3 py-2 text-xs text-sky-700">Bukti · payment assistant</div>
              <h2 className="text-3xl tracking-tight">Every payment tells a story.</h2>
              <p className="my-4 max-w-lg text-sm leading-relaxed text-ink2">
                Select a customer reply to read the payment details, inspect the slip, and match it against your bank statement.
              </p>
              <Empty>No customer replies yet. Use “Advance to” to move the demo to the next message.</Empty>
              <p className="mt-5 text-xs text-ink2">Nothing is marked paid without a bank check or an explicit Owner override.</p>
            </Card>
          )}
        </div>
      </div>

      {lightbox && <SlipLightbox src={lightbox} onClose={closeLightbox} />}
    </div>
  );
}
