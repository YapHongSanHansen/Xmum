// Bukti's AI step (PRD FR-E2, FR-E11). Server only: reads one message (and its
// slip image), asks Claude for the structured fields and validates them with
// zod. extractMessage() is the live call alone, shared with web/eval; extract()
// serves the route and falls back to the cached extraction on any failure. It
// never decides whether anything is paid; the engine's rules do that.
import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CACHED_EXTRACTIONS, CACHED_MODEL } from "../engine/cached";
import type { Extraction, InboundMessage } from "../engine/model";
import { seedState } from "../engine/seed";

// KUTIP_AI_MODEL overrides the model, e.g. when a proxy such as Replit's
// managed Anthropic integration offers a different Claude model.
export const LIVE_MODEL = process.env.KUTIP_AI_MODEL || "claude-opus-5-5";
// The SDK reads ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL from the environment.
// Behind a proxy (ANTHROPIC_BASE_URL set), beta features may not pass through.
const VIA_PROXY = Boolean(process.env.ANTHROPIC_BASE_URL);
const TIMEOUT_MS = 9_000;

export type ExtractResult =
  | { extraction: Extraction; model: string; cached: false; ms: number }
  | { extraction: Extraction; model: string; cached: true; reason: string };

/* ---------- output contract ---------- */

const confidence = z.number().min(0).max(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Mirrors the Extraction interface in engine/model.ts field for field. */
export const ExtractionSchema = z
  .object({
    intent: z.enum(["paid_claim", "partial_payment", "promise_to_pay", "dispute_or_deduction", "other"]),
    amount: z.number().nullable(),
    amount_quote: z.string().nullable(),
    amount_source: z.enum(["text", "image"]).nullable(),
    amount_confidence: confidence,
    invoice_ref: z.string().nullable(),
    invoice_ref_quote: z.string().nullable(),
    invoice_ref_confidence: confidence,
    bank_reference: z.string().nullable(),
    bank_reference_confidence: confidence,
    deduction_amount: z.number().nullable(),
    deduction_reason: z.string().nullable(),
    deduction_quote: z.string().nullable(),
    deduction_confidence: confidence,
    promised_date_candidates: z.array(isoDate),
    promised_date_quote: z.string().nullable(),
    promised_date_confidence: confidence,
    has_slip: z.boolean(),
  })
  .strict();

// Compile-time check that the zod schema and the engine's interface agree.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const schemaMatchesInterface: Same<z.infer<typeof ExtractionSchema>, Extraction> = true;
void schemaMatchesInterface;

const num = { type: "number" };
const nullableNum = { type: ["number", "null"] };
const nullableStr = { type: ["string", "null"] };

/** Flat JSON schema sent as output_config.format (every key required). */
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "intent",
    "amount",
    "amount_quote",
    "amount_source",
    "amount_confidence",
    "invoice_ref",
    "invoice_ref_quote",
    "invoice_ref_confidence",
    "bank_reference",
    "bank_reference_confidence",
    "deduction_amount",
    "deduction_reason",
    "deduction_quote",
    "deduction_confidence",
    "promised_date_candidates",
    "promised_date_quote",
    "promised_date_confidence",
    "has_slip",
  ],
  properties: {
    intent: { type: "string", enum: ["paid_claim", "partial_payment", "promise_to_pay", "dispute_or_deduction", "other"] },
    amount: nullableNum,
    amount_quote: nullableStr,
    amount_source: { type: ["string", "null"], enum: ["text", "image", null] },
    amount_confidence: num,
    invoice_ref: nullableStr,
    invoice_ref_quote: nullableStr,
    invoice_ref_confidence: num,
    bank_reference: nullableStr,
    bank_reference_confidence: num,
    deduction_amount: nullableNum,
    deduction_reason: nullableStr,
    deduction_quote: nullableStr,
    deduction_confidence: num,
    promised_date_candidates: { type: "array", items: { type: "string", format: "date" } },
    promised_date_quote: nullableStr,
    promised_date_confidence: num,
    has_slip: { type: "boolean" },
  },
} as const;

/* ---------- prompt ---------- */

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Tuesday 20 October 2026 (2026-10-20)" from a local "2026-10-20T11:02" timestamp. */
export function describeDay(ts: string): string {
  const [y, m, d] = [+ts.slice(0, 4), +ts.slice(5, 7), +ts.slice(8, 10)];
  const weekday = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${MONTH[m - 1]} ${y} (${ts.slice(0, 10)})`;
}

export function systemPrompt(msg: InboundMessage): string {
  return [
    "You read one WhatsApp reply from a B2B customer of Lori Laju Logistics, a Malaysian haulage firm. The reply may be in Manglish, Malay or Chinese, often mixed. It may come with a bank transfer-slip image.",
    `Today is ${describeDay(msg.receivedAt)}; the message arrived at ${msg.receivedAt.slice(11, 16)} Malaysia time.`,
    "",
    "Extract the fields only. Do not decide whether anything is paid; deterministic rules and a bank statement check do that later.",
    "",
    "Rules:",
    "- Every *_quote field must be copied character for character from the MESSAGE TEXT: same characters, same spacing, same punctuation. Never quote the image, never paraphrase, never translate. If the words are not in the message text, the quote is null.",
    '- amount: the amount the customer says they paid or transferred (not a deduction, not the invoice total). amount_source is "text" when the amount appears in the message text (then amount_quote is those exact words, e.g. "RM2,770"), or "image" when it appears only on the slip (then amount_quote is null). Null when there is no amount.',
    '- Amounts are plain numbers in ringgit: 2770, not "2,770" or "RM2,770".',
    '- invoice_ref: the invoice number exactly as written (e.g. "INV-2304"), with invoice_ref_quote copied from the message text.',
    '- bank_reference: the payment reference the payer typed for the transfer (the "recipient reference" on the slip, or one stated in the text), as written. It is not the bank\'s own transaction or reference number. Null if none.',
    "- deduction_amount / deduction_reason / deduction_quote: when the customer says they deducted or short-paid an amount. deduction_reason is the reason in the customer's own words, keeping place names and item names (a short span of the message). deduction_quote is the full clause that states the deduction.",
    '- promised_date_candidates: when the customer promises to pay later, resolve relative expressions to ISO dates (YYYY-MM-DD) relative to today. List EVERY plausible calendar date. In Malaysia "next Friday", "下礼拜五" or "Jumaat depan" can mean this coming Friday or the Friday after it, so list both. When more than one date is listed, promised_date_confidence must be below 0.85. Empty list when there is no promise.',
    "- has_slip: true when a transfer-slip image is attached.",
    "- Each *_confidence is 0 to 1 for that field; use 0 when the field is null or empty.",
    "",
    "Intent (pick one):",
    "- paid_claim: says the invoice is paid or settled in full.",
    "- partial_payment: says they paid part of it, with the rest to follow, and no deduction or dispute.",
    "- promise_to_pay: says they will pay later or on a date.",
    "- dispute_or_deduction: disputes the invoice, or states a deduction or short payment for a reason (damage, shortage), even if they also say they paid.",
    "- other: anything else.",
  ].join("\n");
}

/* ---------- extract ---------- */

const cachedFor = (messageId: string, reason: string): ExtractResult | null => {
  const extraction = CACHED_EXTRACTIONS[messageId];
  return extraction ? { extraction, model: CACHED_MODEL, cached: true, reason } : null;
};

async function slipBase64(image: string): Promise<string> {
  const rel = image.replace(/^\/+/, "");
  const file = path.join(process.cwd(), "public", rel);
  if (!file.startsWith(path.join(process.cwd(), "public") + path.sep)) throw new Error("bad image path");
  return (await readFile(file)).toString("base64");
}

/** One live reading, or why there is none. Never a cached or invented value. */
export type LiveRead =
  | { ok: true; extraction: Extraction; model: string; ms: number }
  | { ok: false; reason: string };

/**
 * Reads any message with Claude, live only. Missing key, API error, timeout,
 * refusal or invalid output return { ok: false, reason }; the caller decides
 * what to do (the route falls back to the cached extraction, the eval does
 * not score it). Used by extract() below and by web/eval.
 */
export async function extractMessage(msg: InboundMessage): Promise<LiveRead> {
  const fail = (reason: string): LiveRead => ({ ok: false, reason });
  if (!process.env.ANTHROPIC_API_KEY) return fail("no API key");

  const started = Date.now();
  try {
    const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = [];
    if (msg.image) {
      content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: await slipBase64(msg.image) } });
    }
    content.push({
      type: "text",
      text: `${msg.image ? "A transfer-slip image is attached above.\n" : "No image is attached.\n"}Message text (between the markers):\n<<<\n${msg.text}\n>>>`,
    });

    const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
    const response = await client.beta.messages.create({
      model: LIVE_MODEL,
      max_tokens: 4096,
      ...(VIA_PROXY ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
      system: systemPrompt(msg),
      messages: [{ role: "user", content }],
      output_config: { effort: "low", format: { type: "json_schema", schema: EXTRACTION_JSON_SCHEMA } },
    });

    if (response.stop_reason === "refusal") return fail("model declined");
    if (response.stop_reason === "max_tokens") return fail("output cut off");
    const text = response.content
      .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return fail("invalid JSON from model");
    }
    const parsed = ExtractionSchema.safeParse(json);
    if (!parsed.success) return fail("output failed validation");
    return { ok: true, extraction: parsed.data, model: response.model || LIVE_MODEL, ms: Date.now() - started };
  } catch (e) {
    if (e instanceof Anthropic.APIConnectionTimeoutError) return fail("timed out");
    if (e instanceof Anthropic.AuthenticationError) return fail("API key rejected");
    if (e instanceof Anthropic.RateLimitError) return fail("rate limited");
    if (e instanceof Anthropic.APIError) return fail(`API error ${e.status ?? ""}`.trim());
    return fail("AI call failed");
  }
}

/**
 * Reads one seeded message with Claude. Returns null only for an unknown
 * message id. Missing key, API error, timeout, refusal or invalid output all
 * return the cached extraction with a reason.
 */
const liveCache = new Map<string, ExtractResult>();

export async function extract(messageId: string): Promise<ExtractResult | null> {
  const hit = liveCache.get(messageId);
  if (hit) return hit;
  const msg = seedState().messages.find((m) => m.id === messageId);
  if (!msg) return null;

  const read = await extractMessage(msg);
  if (!read.ok) return cachedFor(messageId, read.reason) ?? null;
  const result: ExtractResult = { extraction: read.extraction, model: read.model, cached: false, ms: read.ms };
  liveCache.set(messageId, result);
  return result;
}
