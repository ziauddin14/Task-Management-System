import apiClient from './apiClient.js';

// docs/10-api-integration.md §1 — raw axios calls only.

// GET /lookup-lists?type=... — any authenticated user (docs/05-apis.md §4). Not paginated. Note:
// the backend only ever returns ACTIVE entries for this list type (lookupList.service.js's
// listActive hardcodes isActive:true) — there is no query param to fetch inactive ones (see
// Phase 10.5 report §I).
export async function getLookupList(listType) {
  const response = await apiClient.get('/lookup-lists', { params: { type: listType } });
  return response.data.data;
}

// POST /lookup-lists — Admin only. Body: { listType, value, sortOrder? }.
export async function createLookupValue(payload) {
  const response = await apiClient.post('/lookup-lists', payload);
  return response.data.data;
}

// PATCH /lookup-lists/:id — Admin only. Body (all optional): { value, sortOrder, isActive }.
export async function updateLookupValue(id, payload) {
  const response = await apiClient.patch(`/lookup-lists/${id}`, payload);
  return response.data.data;
}
