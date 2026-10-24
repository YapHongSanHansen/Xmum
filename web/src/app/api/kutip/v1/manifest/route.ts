// GET /api/kutip/v1/manifest: Kutip as a reusable Orbyte module: what it reads
// and writes, permissions per Orbyte role, and the events it emits.
import { SIMULATED_HEADERS, kutipManifest } from "../../../../../orbyte/api";

export async function GET() {
  return Response.json(kutipManifest(), { headers: SIMULATED_HEADERS });
}
