// GET /api/kachingg/v1/events: the events Kachingg emits, from replaying the demo
// script on the synthetic seed with the pure engine. Deterministic. No bank
// balance, payroll or gap amounts; only invoice, receipt and credit-note amounts.
import { SIMULATED_HEADERS, kachinggEventsResponse } from "../../../../../orbyte/api";

export async function GET() {
  return Response.json(kachinggEventsResponse(), { headers: SIMULATED_HEADERS });
}
