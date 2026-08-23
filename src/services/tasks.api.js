import apiClient from './apiClient.js';

// docs/10-api-integration.md §1, docs/05-apis.md §5 — raw axios calls only, no React Query here.
// Components never import this directly — always through hooks/useTasks.js etc.

// GET /tasks — filters is the already-backend-shaped query object (buildTaskFilters in
// hooks/useDashboardFilters.js is responsible for translating URL params into this shape).
// Returns { items, meta } so callers get both the page of tasks and pagination info.
export async function getTasks(filters) {
  const response = await apiClient.get('/tasks', { params: filters });
  return { items: response.data.data, meta: response.data.meta };
}

// GET /tasks/:id
export async function getTask(taskId) {
  const response = await apiClient.get(`/tasks/${taskId}`);
  return response.data.data;
}

// POST /tasks — body: { title, assignees, responsibility, deadline }.
export async function createTask(payload) {
  const response = await apiClient.post('/tasks', payload);
  return response.data.data;
}

// PATCH /tasks/:id — body (all optional): { title, assignees, responsibility, deadline }.
export async function updateTask(taskId, payload) {
  const response = await apiClient.patch(`/tasks/${taskId}`, payload);
  return response.data.data;
}

// PATCH /tasks/:id/close — no body.
export async function closeTask(taskId) {
  const response = await apiClient.patch(`/tasks/${taskId}/close`);
  return response.data.data;
}
