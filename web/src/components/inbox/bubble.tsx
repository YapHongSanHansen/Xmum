"use client";
// WhatsApp-style chat pieces: incoming / outgoing bubbles, slip thumbnail and
// an inline lightbox (no browser dialogs).
import Image from "next/image";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "@/components/ui";

const SLIP_W = 810;
const SLIP_H = 1500;

export function ChatBackdrop({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-lg bg-[#efeae2] p-3", className)}>{children}</div>;
}

export function ChatBubble({
  children,
  time,
  outgoing = false,
  className,
}: {
  children: ReactNode;
  time?: string;
  outgoing?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("flex", outgoing ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "relative max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm",
          outgoing ? "rounded-tr-none bg-[#d9fdd3]" : "rounded-tl-none bg-white",
          className,
        )}
      >
        {children}
        {time && <div className="mt-1 text-right text-[10px] text-slate-500">{time}</div>}
      </div>
    </div>
  );
}

export function SlipThumb({ src, onOpen, size = "sm" }: { src: string; onOpen?: () => void; size?: "sm" | "md" }) {
  const w = size === "sm" ? 30 : 120;
  const img = (
    <Image
      src={src}
      alt="Transfer slip (synthetic)"
      width={w}
      height={Math.round((w * SLIP_H) / SLIP_W)}
      className="rounded border border-slate-200 bg-white object-cover"
    />
  );
  if (!onOpen) return img;
  return (
    <button type="button" onClick={onOpen} className="group relative block cursor-zoom-in" aria-label="Enlarge transfer slip">
      {img}
      {size === "md" && (
        <span className="absolute inset-x-0 bottom-0 rounded-b bg-slate-900/60 py-0.5 text-center text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          Click to enlarge
        </span>
      )}
    </button>
  );
}

export function SlipLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Transfer slip"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <Image
          src={src}
          alt="Transfer slip (synthetic demo, not a real receipt)"
          width={SLIP_W}
          height={SLIP_H}
          className="h-auto max-h-[88vh] w-auto rounded-lg shadow-2xl"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 rounded-full bg-white p-1.5 text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
