import apiClient from './apiClient.js';

// docs/10-api-integration.md §1, docs/05-apis.md §8 — GET /dashboard/summary. `filters` are the
// same task filters GET /tasks takes (status, assigneeId, dates, search, ratingSource, ...) and
// nothing else — the endpoint rejects sort/paging params. Scoping to the requesting user's own
// tasks is entirely server-side.
export async function getDashboardSummary(filters = {}) {
  const response = await apiClient.get('/dashboard/summary', { params: filters });
  return response.data.data;
}
