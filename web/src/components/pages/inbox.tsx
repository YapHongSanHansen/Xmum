"use client";
// Inbox (PRD §7E, FR-E1–E12): customers' WhatsApp replies, Bukti's AI reading,
// and the deterministic rules' verdict. Every change is an engine action.
import { useCallback, useState } from "react";
import { useKutip } from "@/lib/store";
import { readMessage } from "@/lib/extract-client";
import { PageTitle } from "@/components/ui";
import { BankStatement } from "@/components/inbox/bank-statement";
import { SlipLightbox } from "@/components/inbox/bubble";
import { HandoffQueue } from "@/components/inbox/handoff-queue";
import { MessageDetail, type RunInfo } from "@/components/inbox/message-detail";
import { MessageList } from "@/components/inbox/message-list";
import { arrivedMessages } from "@/components/inbox/status";

export default function InboxPage() {
  const state = useKutip((s) => s.state);
  const dispatch = useKutip((s) => s.dispatch);
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
      <PageTitle title="Inbox" subtitle="Nothing is paid without a bank line." />

      <HandoffQueue state={state} onOpen={setSelectedId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <MessageList state={state} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          <BankStatement state={state} />
        </div>
        <div>
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
            <div className="border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-ink2">Select a message.</div>
          )}
        </div>
      </div>

      {lightbox && <SlipLightbox src={lightbox} onClose={closeLightbox} />}
    </div>
  );
}
