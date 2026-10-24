// Grafilab path of Bukti's AI step, with fetch stubbed: no network, no key needed.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CACHED_EXTRACTIONS } from "../engine/cached";
import { seedState } from "../engine/seed";
import { extractWithGrafilab, parseModelJson } from "./extract-server";

const megabina = seedState().messages.find((m) => m.id === "m-megabina")!;
const good = CACHED_EXTRACTIONS["m-megabina"];

const reply = (content: string, status = 200, finish = "stop"): typeof fetch =>
  (async () =>
    new Response(JSON.stringify({ model: "ilmu/ilmu-mini-v3.3", choices: [{ message: { content }, finish_reason: finish }] }), {
      status,
    })) as typeof fetch;

describe("parseModelJson", () => {
  it("reads a bare object, a fenced object and one after a <think> block", () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson('<think>hmm {"x":0}</think>\nHere: {"a":1}')).toEqual({ a: 1 });
  });
});

describe("extractWithGrafilab", () => {
  const saved = process.env.GRAFILAB_API_KEY;
  beforeEach(() => {
    process.env.GRAFILAB_API_KEY = "test-key";
  });
  afterEach(() => {
    process.env.GRAFILAB_API_KEY = saved;
  });

  it("returns a live reading when the model replies with a valid object", async () => {
    const r = await extractWithGrafilab(megabina, reply("```json\n" + JSON.stringify(good) + "\n```"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.extraction.amount).toBe(2770);
      expect(r.model).toBe("ilmu/ilmu-mini-v3.3");
    }
  });

  it("sends the bearer key and the slip as an image", async () => {
    let sent: { auth?: string; body?: { messages: { content: unknown }[] } } = {};
    const capture = (async (_url: string, init: RequestInit) => {
      sent = { auth: (init.headers as Record<string, string>).Authorization, body: JSON.parse(String(init.body)) };
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(good) } }] }));
    }) as unknown as typeof fetch;
    await extractWithGrafilab(megabina, capture);
    expect(sent.auth).toBe("Bearer test-key");
    expect(JSON.stringify(sent.body?.messages[1].content)).toContain("data:image/png;base64,");
  });

  it("never invents a reading: bad JSON, schema misses and HTTP errors are failures", async () => {
    expect(await extractWithGrafilab(megabina, reply("not json"))).toEqual({ ok: false, reason: "invalid JSON from model" });
    expect(await extractWithGrafilab(megabina, reply('{"intent":"paid_claim"}'))).toEqual({ ok: false, reason: "output failed validation" });
    expect(await extractWithGrafilab(megabina, reply("", 401))).toEqual({ ok: false, reason: "API key rejected" });
    expect(await extractWithGrafilab(megabina, reply("", 429))).toEqual({ ok: false, reason: "rate limited or no credit" });
    expect(await extractWithGrafilab(megabina, reply("", 500))).toEqual({ ok: false, reason: "API error 500" });
    expect(await extractWithGrafilab(megabina, reply(JSON.stringify(good), 200, "length"))).toEqual({ ok: false, reason: "output cut off" });
  });
});
