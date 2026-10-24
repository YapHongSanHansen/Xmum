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
    <div className="panel mx-4 mt-24 max-w-md p-8 text-center sm:mx-auto">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">The saved demo could not load.</h2>
      <div className="mt-5 flex justify-center gap-2">
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
