import apiClient from './apiClient.js';

// docs/10-api-integration.md §1 — raw axios calls only.

// GET /users — Admin only (docs/05-apis.md §3). filters: { role?, isActive?, search?, page?, limit? }.
export async function getUsers(filters) {
  const response = await apiClient.get('/users', { params: filters });
  return { items: response.data.data, meta: response.data.meta };
}

// GET /users/:id — Admin or self (docs/05-apis.md §3).
export async function getUser(userId) {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data.data;
}

// POST /users — Admin only. Body: { name, email, responsibility, role }.
export async function createUser(payload) {
  const response = await apiClient.post('/users', payload);
  return response.data.data;
}

// PATCH /users/:id — Admin only. Body (all optional): { name, responsibility, role, isActive }.
// Never send email — the backend's .strict() validator rejects it outright (immutable after
// creation, docs/05-apis.md §3).
export async function updateUser(userId, payload) {
  const response = await apiClient.patch(`/users/${userId}`, payload);
  return response.data.data;
}
