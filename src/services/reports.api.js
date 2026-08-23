import apiClient from './apiClient.js';

// docs/10-api-integration.md §5 — plain async functions, no React Query (the response is a
// binary file, not cacheable JSON). Every export is a fresh request by design.

// GET /reports/export — docs/05-apis.md §9. params: the same filters as GET /tasks (minus
// page/limit — reports are unpaginated by design) plus { format, reportType, columns }.
export async function exportReport(params) {
  const response = await apiClient.get('/reports/export', { params, responseType: 'blob' });
  return response.data; // Blob, handed to file-saver
}

// GET /reports/user-summary — docs/05-apis.md §9, Admin only. params: { format, columns }.
export async function exportUserSummary(params) {
  const response = await apiClient.get('/reports/user-summary', { params, responseType: 'blob' });
  return response.data; // Blob, handed to file-saver
}

// POST /admin/trigger-reminders — docs/05-apis.md §10, Admin only.
export async function triggerReminders() {
  const response = await apiClient.post('/admin/trigger-reminders');
  return response.data.data; // { remindersSent }
}
