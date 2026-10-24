// GET /api/kutip/v1/events: the events Kutip emits, from replaying the demo
// script on the synthetic seed with the pure engine. Deterministic. No bank
// balance, payroll or gap amounts; only invoice, receipt and credit-note amounts.
import { SIMULATED_HEADERS, kutipEventsResponse } from "../../../../../orbyte/api";

export async function GET() {
  return Response.json(kutipEventsResponse(), { headers: SIMULATED_HEADERS });
}
