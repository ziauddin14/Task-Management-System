import apiClient from './apiClient.js';

// docs/10-api-integration.md §1 — raw axios calls only. Phase 10.3 needs only getLookupList
// (the Responsibility dropdown); createLookupValue/updateLookupValue are Admin-management
// concerns for a later sub-phase.

// GET /lookup-lists?type=... — any authenticated user (docs/05-apis.md §4). Not paginated.
export async function getLookupList(listType) {
  const response = await apiClient.get('/lookup-lists', { params: { type: listType } });
  return response.data.data;
}
