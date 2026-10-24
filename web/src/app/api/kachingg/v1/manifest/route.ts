// GET /api/kachingg/v1/manifest: Kachingg as a reusable Orbyte module: what it reads
// and writes, permissions per Orbyte role, and the events it emits.
import { SIMULATED_HEADERS, kachinggManifest } from "../../../../../orbyte/api";

export async function GET() {
  return Response.json(kachinggManifest(), { headers: SIMULATED_HEADERS });
}
