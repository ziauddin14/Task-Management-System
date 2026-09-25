// Web Push browser-API helpers — pure wrappers around navigator.serviceWorker/PushManager, no
// backend calls here (see services/push.api.js) and no React (see the hooks/usePush* files that
// combine both). Kept separate so this browser-API surface is easy to find/reason about, and so
// it degrades gracefully everywhere it's used: isPushSupported() gates every caller, since a
// missing serviceWorker/PushManager/Notification API must never throw, only silently fall back to
// "push isn't available here" — the existing in-app bell/drawer keeps working regardless.

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Standard VAPID-public-key conversion (base64url -> Uint8Array) — the Push API's
// applicationServerKey option requires raw bytes, not the base64url string the env var/backend
// actually store.
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register('/sw.js');
}

// The current browser's own existing subscription, if any — used both by the Settings page's
// on/off status and to decide whether the permission banner should even offer to ask again.
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

// Registers the Service Worker (idempotent — re-registering the same script is a normal no-op)
// and subscribes it with the given VAPID public key. Does NOT request Notification permission
// itself — the caller (useSubscribeToPush) does that first, since permission must be requested
// from a real user gesture, not silently here.
export async function subscribeBrowserToPush(vapidPublicKey) {
  const registration = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker());
  if (!registration) {
    throw new Error('Service worker registration unavailable.');
  }
  await navigator.serviceWorker.ready;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

// Unsubscribes the browser's own current subscription (if any) and returns its endpoint, so the
// caller can also tell the backend to forget it. Returns null (a safe no-op) if there was never a
// subscription to begin with.
export async function unsubscribeBrowserFromPush() {
  const subscription = await getExistingSubscription();
  if (!subscription) return null;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}
