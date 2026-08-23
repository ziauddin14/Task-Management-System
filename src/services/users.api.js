import apiClient from './apiClient.js';

// docs/10-api-integration.md §1 — raw axios calls only. Phase 10.3 needs only getUsers (the
// assignee multi-select / assignee filter, both Admin-only surfaces); createUser/updateUser are
// the Users Page's job, a later sub-phase.

// GET /users — Admin only (docs/05-apis.md §3). filters: { role?, isActive?, search?, page?, limit? }.
export async function getUsers(filters) {
  const response = await apiClient.get('/users', { params: filters });
  return { items: response.data.data, meta: response.data.meta };
}
