// pnpm eval:bukti — reads every message in the test set with the live model,
// runs each reading through the engine's verbatim gate and 0.85 threshold, and
// prints the score. Live readings only: with no key it reports no score, and a
// message whose call failed is listed as not scored. The cached fixtures are
// never used here.
import type { InboundMessage } from "../src/engine/model";
import { CONFIDENCE_MIN } from "../src/engine/rules";
import { extractMessage, GRAFILAB_MODEL, LIVE_MODEL } from "../src/lib/extract-server";
import { gateWithEngine } from "./gate";
import { EVAL_SET, FIELDS, type EvalItem } from "./messages";
import { accuracy, NFR4_AMOUNT_TARGET, scoreItem, summarize, type NotScored, type ScoredRun } from "./score";

const CONCURRENCY = 4;
const pct = (x: number | null) => (x === null ? "  n/a" : `${(x * 100).toFixed(1).padStart(5)}%`);

type Outcome = { run: ScoredRun; model: string } | { notScored: NotScored };

async function readOne(item: EvalItem): Promise<Outcome> {
  const msg: InboundMessage = { id: item.id, customerId: "eval", receivedAt: item.now, text: item.text, image: item.image };
  const read = await extractMessage(msg);
  if (!read.ok) return { notScored: { id: item.id, reason: read.reason } };
  const gated = gateWithEngine(item.text, read.extraction, read.model);
  return { run: { id: item.id, results: scoreItem(item, gated.extraction), dropped: gated.dropped }, model: read.model };
}

async function readAll(items: EvalItem[]): Promise<Outcome[]> {
  const out: Outcome[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await readOne(items[i]);
      process.stdout.write(".");
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n");
  return out;
}

async function main(): Promise<number> {
  const model = process.env.GRAFILAB_API_KEY ? `${GRAFILAB_MODEL} (Grafilab)` : LIVE_MODEL;
  console.log(`Bukti eval: ${EVAL_SET.length} synthetic messages, model ${model}`);
  if (!process.env.GRAFILAB_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.log("No GRAFILAB_API_KEY or ANTHROPIC_API_KEY set: live eval not run, no score reported.");
    return 0;
  }

  const outcomes = await readAll(EVAL_SET);
  const runs = outcomes.flatMap((o) => ("run" in o ? [o.run] : []));
  const notScored = outcomes.flatMap((o) => ("notScored" in o ? [o.notScored] : []));
  const models = [...new Set(outcomes.flatMap((o) => ("model" in o ? [o.model] : [])))];
  const s = summarize(EVAL_SET.length, runs, notScored);

  console.log(`Answered by: ${models.join(", ") || "none"}`);
  console.log(`Scored ${s.scoredMessages} of ${s.messages} messages; not scored: ${s.notScored.length}`);
  for (const n of s.notScored) console.log(`  not scored  ${n.id}  (${n.reason})`);
  if (!s.scoredMessages) {
    console.log("No live reading came back: no score reported.");
    return 1;
  }
  if (s.notScored.length) console.log(`  The figures below cover only the ${s.scoredMessages} scored messages, not the full set.`);

  console.log("");
  console.log(`Per-field accuracy (after the verbatim gate; below ${CONFIDENCE_MIN} confidence counts as held, not a match)`);
  console.log("  field              match  scored  held  accuracy");
  for (const f of FIELDS) {
    const t = s.perField[f];
    console.log(`  ${f.padEnd(17)} ${String(t.match).padStart(6)} ${String(t.scored).padStart(7)} ${String(t.held).padStart(5)}    ${pct(accuracy(t))}`);
  }

  const amount = accuracy(s.perField.amount);
  const verdict = amount !== null && amount >= NFR4_AMOUNT_TARGET ? "meets" : "below";
  console.log("");
  console.log(`Amount exact match: ${pct(amount).trim()} (${s.perField.amount.match}/${s.perField.amount.scored}); NFR-4 target ${NFR4_AMOUNT_TARGET * 100}%: ${verdict}`);
  console.log(`Fields dropped by the verbatim gate: ${s.gateDrops}`);
  for (const r of runs) for (const d of r.dropped) console.log(`  gate  ${r.id}  ${d}`);

  console.log("");
  console.log(`Mismatches and held fields: ${s.misses.length}`);
  for (const m of s.misses) console.log(`  ${m.outcome.padEnd(8)} ${m.id}  ${m.field.padEnd(17)} expected ${m.expected} | got ${m.got}`);
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e: unknown) => {
    console.error("Bukti eval failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  },
);
