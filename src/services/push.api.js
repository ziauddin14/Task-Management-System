import apiClient from './apiClient.js';

// docs alignment: locked blueprint §Frontend Architecture — raw axios calls only, no React Query
// here (matches notifications.api.js's own convention). Components never import this directly —
// always through hooks/useSubscribeToPush.js / useUnsubscribeFromPush.js.

// POST /push/subscribe — payload is the browser's raw PushSubscription.toJSON() shape
// ({ endpoint, keys: { p256dh, auth } }), optionally + deviceInfo.
export async function subscribeToPush(payload) {
  const response = await apiClient.post('/push/subscribe', payload);
  return response.data.data;
}

// POST /push/unsubscribe
export async function unsubscribeFromPush(endpoint) {
  const response = await apiClient.post('/push/unsubscribe', { endpoint });
  return response.data.data;
}
