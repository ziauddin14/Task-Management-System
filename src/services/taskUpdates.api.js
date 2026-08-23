import apiClient from './apiClient.js';

// docs/10-api-integration.md §1, docs/05-apis.md §6 — raw axios calls only, no React Query here.

// GET /tasks/:id/updates — Admin, or a User assigned to that task. Sorted newest-first by the
// backend already.
export async function getTaskUpdates(taskId, params) {
  const response = await apiClient.get(`/tasks/${taskId}/updates`, { params });
  return { items: response.data.data, meta: response.data.meta };
}

// POST /tasks/:id/updates — body: { description, completionPercent, attachment? }.
// Returns { update, task } (docs/05-apis.md §6 step 3) so the caller can update both caches.
export async function createTaskUpdate(taskId, payload) {
  const response = await apiClient.post(`/tasks/${taskId}/updates`, payload);
  return response.data.data;
}
