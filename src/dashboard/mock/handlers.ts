/**
 * OWNER: UI
 * WHAT: MSW handlers. This is what makes the frontend un-blockable on day 0.
 *       Enable with USE_MOCKS=1, disable per-endpoint as the real API lands.
 */
import { metricsSummary } from "@/dashboard/mock/fixtures";

export const handlers = [
  // TODO: http.get(API.metrics, () => HttpResponse.json(metricsSummary)), ...
];

export { metricsSummary };

