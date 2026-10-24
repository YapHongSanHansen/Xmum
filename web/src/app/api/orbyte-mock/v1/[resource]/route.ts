// GET /api/orbyte-mock/v1/{clients|projects|users|wallet}: a simulated Orbyte
// API serving a synthetic workspace. Stands in for Orbyte, which has no public
// API; the shapes are Kachingg's assumptions (docs/orbyte-integration.md).
// Relative import so Vitest (no path aliases) can call GET directly.
import { SIMULATED_HEADERS, orbyteMockResponse } from "../../../../../orbyte/api";

export async function GET(_request: Request, ctx: { params: Promise<{ resource: string }> }) {
  const { resource } = await ctx.params;
  const { status, body } = orbyteMockResponse(resource);
  return Response.json(body, { status, headers: SIMULATED_HEADERS });
}
