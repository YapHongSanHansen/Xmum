"use client";
// Shared CSV input for the Connect imports: paste box (optional), file picker
// and "Load sample". It only holds text; parsing and checks live in the engine.
import { useState, type ChangeEvent, type ReactNode } from "react";
import { FileUp } from "lucide-react";
import { Button, cx } from "@/components/ui";

export function CsvSource({
  label,
  text,
  onText,
  sample,
  showText,
  placeholder,
}: {
  label: string;
  text: string;
  onText: (t: string) => void;
  sample: string;
  /** False hides the raw text (the Clerk never sees a bank file's debits or balance). */
  showText: boolean;
  placeholder: string;
}) {
  const [source, setSource] = useState<string | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    onText(await f.text());
    setSource(f.name);
  };

  return (
    <div className="space-y-2">
      {showText && (
        <textarea
          aria-label={label}
          value={text}
          onChange={(e) => {
            onText(e.target.value);
            setSource(null);
          }}
          rows={5}
          spellCheck={false}
          placeholder={placeholder}
          className="w-full resize-y rounded-[2px] border border-line bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-ink placeholder:text-ink3 focus:border-navy focus:outline-none"
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cx(
            "inline-flex h-7 cursor-pointer items-center gap-2 rounded-[2px] border border-line-strong bg-white px-2.5 text-xs font-medium text-ink hover:bg-canvas",
            "focus-within:outline focus-within:outline-2 focus-within:outline-navy",
          )}
        >
          <FileUp className="h-3.5 w-3.5" aria-hidden />
          Choose CSV file
          <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={onFile} />
        </label>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            onText(sample);
            setSource("synthetic sample");
          }}
        >
          Load sample
        </Button>
        {text && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onText("");
              setSource(null);
            }}
          >
            Clear
          </Button>
        )}
        {text && <span className="text-[11px] text-ink2">{source ?? (showText ? "pasted text" : "file loaded")}</span>}
      </div>
    </div>
  );
}

/** Ledger table: 30px header row, 38px rows, hairline dividers. */
export function LedgerTable({ head, children }: { head: { label: string; right?: boolean }[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="h-[30px] border-b border-line text-xs text-ink2">
            {head.map((h) => (
              <th key={h.label} className={cx("whitespace-nowrap px-2.5 font-normal", h.right && "text-right")}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const rowCls = "h-[38px] border-b border-hairline last:border-0 align-middle";
export const cellCls = "px-2.5";
export const numCls = "px-2.5 text-right font-mono tabular-nums whitespace-nowrap";

/** Invalid rows: line number and a plain reason; nothing is imported from them. */
export function InvalidRows({ rows, extra }: { rows: { line: number; reason: string; label?: string }[]; extra?: ReactNode }) {
  if (!rows.length && !extra) return null;
  return (
    <div className="space-y-1.5">
      <div className="font-mono text-[11px] font-medium text-rose-700">
        Not imported · {rows.length} row{rows.length === 1 ? "" : "s"}
      </div>
      {rows.length > 0 && (
        <ul className="divide-y divide-hairline border border-rose-200 bg-rose-50/40 text-xs">
          {rows.map((r) => (
            <li key={r.line} className="flex gap-3 px-2.5 py-2">
              <span className="w-12 shrink-0 font-mono text-ink2">line {r.line}</span>
              {r.label && <span className="w-24 shrink-0 truncate font-mono text-ink2">{r.label}</span>}
              <span className="text-rose-700">{r.reason}</span>
            </li>
          ))}
        </ul>
      )}
      {extra}
    </div>
  );
}
