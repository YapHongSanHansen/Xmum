// Runs one model reading through the engine's own APPLY_EXTRACTION, so the eval
// sees exactly what the product keeps after the FR-E3 verbatim gate. Nothing is
// re-implemented here: the gate lives in engine/reducer.ts and stays there.
import type { Extraction, InboundMessage } from "../src/engine/model";
import { apply } from "../src/engine/reducer";
import { seedState } from "../src/engine/seed";

export interface Gated {
  /** The extraction as the engine stored it, with failed fields dropped. */
  extraction: Extraction;
  /** One entry per field the verbatim gate dropped. */
  dropped: string[];
}

const BASE = seedState();
const EVAL_MESSAGE_ID = "eval-message";

export function gateWithEngine(text: string, extraction: Extraction, model: string): Gated {
  // A throwaway copy of the seed with the eval message added for its first
  // customer; apply() clones the state, so BASE is never changed.
  const msg: InboundMessage = { id: EVAL_MESSAGE_ID, customerId: BASE.customers[0].id, receivedAt: BASE.now, text, image: null };
  const r = apply({ ...BASE, messages: [...BASE.messages, msg] }, { type: "APPLY_EXTRACTION", messageId: msg.id, extraction, model, cached: false });
  const record = r.state.extractions[msg.id];
  if (r.error || !record) throw new Error(`engine did not record the eval message: ${r.error ?? "no extraction record"}`);
  return { extraction: record.extraction, dropped: record.rejectedQuotes };
}
