"use client";
// Last-resort recovery for the demo: if a saved state from an older build
// breaks rendering, clear it and start from the seed again.

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
    <div className="mx-auto mt-24 max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Kutip hit a problem</h2>
      <p className="mt-2 text-sm text-slate-600">The saved demo state could not be shown. You can try again, or reset the demo to the starting data.</p>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={() => retry()} className="h-9 rounded-md px-3.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
          Try again
        </button>
        <button type="button" onClick={resetDemo} className="h-9 rounded-md bg-emerald-600 px-3.5 text-sm font-medium text-white hover:bg-emerald-700">
          Reset demo
        </button>
      </div>
    </div>
  );
}
