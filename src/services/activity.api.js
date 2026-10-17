import apiClient from './apiClient.js';

// docs/10-api-integration.md §1 — raw axios calls only. The activity log: every endpoint here is
// Admin only (the backend answers anyone else with 403), and is only ever called from admin-gated
// screens.

// GET /admin/activity/summary — { inactivityDays, baselineAt, totalActive, activeToday,
// activeThisWeek, inactiveCount }.
export async function getActivitySummary() {
  const response = await apiClient.get('/admin/activity/summary');
  return response.data.data;
}

// GET /admin/activity/users — params: { search?, inactiveOnly?, page?, limit? }.
export async function getActivityUsers(params) {
  const response = await apiClient.get('/admin/activity/users', { params });
  return { items: response.data.data, meta: response.data.meta };
}

// GET /admin/activity/users/:id/events — params: { type?, from?, to? (YYYY-MM-DD), page?, limit? }.
export async function getUserActivityEvents(userId, params) {
  const response = await apiClient.get(`/admin/activity/users/${userId}/events`, { params });
  return { items: response.data.data, meta: response.data.meta };
}

// GET /admin/activity/users/:id/history — the person's task updates from before the log began.
export async function getUserActivityHistory(userId, params) {
  const response = await apiClient.get(`/admin/activity/users/${userId}/history`, { params });
  return { items: response.data.data, meta: response.data.meta };
}

// GET /admin/settings/activity — { inactivityDays, baselineAt, minInactivityDays, maxInactivityDays }.
export async function getActivitySettings() {
  const response = await apiClient.get('/admin/settings/activity');
  return response.data.data;
}

// PATCH /admin/settings/activity — body { inactivityDays } (a whole number, 1–90).
export async function updateActivitySettings(payload) {
  const response = await apiClient.patch('/admin/settings/activity', payload);
  return response.data.data;
}
