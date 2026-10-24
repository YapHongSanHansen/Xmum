"use client";
// Last-resort recovery for the demo: if a saved state from an older build
// breaks rendering, clear it and start from the seed again.
import { Button } from "@/components/ui";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const resetDemo = () => {
    try {
      localStorage.removeItem("kutip-demo-v1");
    } catch {
      // storage may be blocked; a reload still starts from the seed
    }
    location.reload();
  };
  return (
    <div className="mx-4 mt-24 max-w-md border border-line bg-surface p-6 text-center sm:mx-auto">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Kutip hit a problem</h2>
      <p className="mt-2 text-[13px] text-ink2">The saved demo state could not be shown. You can try again, or reset the demo to the starting data.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button type="button" variant="secondary" onClick={() => retry()}>
          Try again
        </Button>
        <Button type="button" onClick={resetDemo}>
          Reset demo
        </Button>
      </div>
    </div>
  );
}
