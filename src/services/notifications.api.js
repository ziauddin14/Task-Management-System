import apiClient from './apiClient.js';

// docs alignment: locked blueprint §Frontend Architecture — raw axios calls only, no React Query
// here (matches tasks.api.js's own convention). Components never import this directly — always
// through hooks/useNotifications.js etc.

// GET /notifications — params: { page, limit, unreadOnly }.
export async function getNotifications(params) {
  const response = await apiClient.get('/notifications', { params });
  return { items: response.data.data, meta: response.data.meta };
}

// GET /notifications/unread-count
export async function getUnreadNotificationCount() {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data.data; // { count }
}

// PATCH /notifications/:id/read
export async function markNotificationRead(notificationId) {
  const response = await apiClient.patch(`/notifications/${notificationId}/read`);
  return response.data.data;
}

// PATCH /notifications/read-all
export async function markAllNotificationsRead() {
  const response = await apiClient.patch('/notifications/read-all');
  return response.data.data; // { updatedCount }
}

// POST /admin/notifications — Flow A ({recipientType:'all', ...}) and Flow B
// ({recipientType:'user', userId, ...}) share this one endpoint, per the locked blueprint.
export async function sendAdminNotification(payload) {
  const response = await apiClient.post('/admin/notifications', payload);
  return response.data.data; // { batchId, recipientsResolved, createdCount, failures }
}

// POST /admin/tasks/:taskId/reminder — Flow C. payload is only ever {templateKey?, message?} —
// the server resolves recipients from the task's own assignees, never from anything sent here.
export async function sendTaskReminder(taskId, payload) {
  const response = await apiClient.post(`/admin/tasks/${taskId}/reminder`, payload);
  return response.data.data;
}

// GET /admin/notifications/history — params: { page, limit }.
export async function getAdminNotificationHistory(params) {
  const response = await apiClient.get('/admin/notifications/history', { params });
  return { items: response.data.data, meta: response.data.meta };
}
