import apiClient from './apiClient.js';

// docs/10-api-integration.md §1, docs/05-apis.md §8 — GET /dashboard/summary takes no query
// params today (scoping is entirely server-side, by requesting user's role); nothing to pass.
export async function getDashboardSummary() {
  const response = await apiClient.get('/dashboard/summary');
  return response.data.data;
}
