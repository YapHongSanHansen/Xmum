"use client";
// Renders message text with each verified quote wrapped in <mark>. A quote is
// located exactly, or with whitespace runs treated as equal (same rule as the
// verbatim gate). Overlapping quotes keep the earlier one.
import { Fragment } from "react";
import { MARK_CLASS, type QuoteTone } from "./fields";
import { cx } from "@/components/ui";

export interface QuoteMark {
  quote: string;
  tone: QuoteTone;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findRange(text: string, quote: string): [number, number] | null {
  const q = quote.trim();
  if (!q) return null;
  const i = text.indexOf(q);
  if (i >= 0) return [i, i + q.length];
  const m = new RegExp(q.split(/\s+/).map(escape).join("\\s+")).exec(text);
  return m ? [m.index, m.index + m[0].length] : null;
}

export function HighlightedText({ text, marks }: { text: string; marks: QuoteMark[] }) {
  const ranges = marks
    .map((m) => {
      const r = findRange(text, m.quote);
      return r ? { start: r[0], end: r[1], tone: m.tone } : null;
    })
    .filter((r): r is { start: number; end: number; tone: QuoteTone } => r !== null)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const parts: { text: string; tone: QuoteTone | null }[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue;
    if (r.start > cursor) parts.push({ text: text.slice(cursor, r.start), tone: null });
    parts.push({ text: text.slice(r.start, r.end), tone: r.tone });
    cursor = r.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), tone: null });

  return (
    <>
      {parts.map((p, i) =>
        p.tone ? (
          <mark key={i} className={cx("rounded px-0.5", MARK_CLASS[p.tone])}>
            {p.text}
          </mark>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}
