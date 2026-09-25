import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { subscribeToPush } from '../services/push.api.js';
import { registerServiceWorker, subscribeBrowserToPush } from '../utils/pushNotifications.js';

// The full opt-in flow: register the Service Worker, request the native browser permission (must
// be called from a real user gesture — the caller is always a click handler, never triggered
// automatically), then — only if granted — subscribe and tell the backend. Progressive
// enhancement throughout: this never breaks the existing in-app bell/drawer system, and never
// shows a scary/generic toast-style error banner elsewhere in the app.
//
// Audit fix (production incident — subscribe was silently failing on a real device with zero
// diagnostic trail: no PushSubscription row, no backend log line at all, meaning the failure was
// entirely client-side and, before this fix, entirely invisible). Two outcomes are now both
// distinguishable by the caller instead of collapsing into "nothing happened":
//   - Notification.requestPermission() resolving to anything but 'granted' is a normal, valid
//     RESOLVED outcome ({ granted: false, reason: 'permission-not-granted', permission }), not a
//     thrown error — but PushPermissionBanner.jsx no longer silently dismisses on it either.
//   - Any genuinely thrown error (Service Worker registration, pushManager.subscribe() itself
//     rejecting, or the backend POST failing) is left to propagate as a real mutation error —
//     react-query's own `error`/`isError` on the returned mutation object carry it, for
//     PushPermissionBanner.jsx to render a short on-screen reason from (err.name/err.message).
//     Console logging alone was the old (insufficient) diagnostic path — a phone's console isn't
//     practically reachable, which is exactly why the failure went unnoticed until now.
export function useSubscribeToPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await registerServiceWorker();
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { granted: false, reason: 'permission-not-granted', permission };
      }
      const subscription = await subscribeBrowserToPush(import.meta.env.VITE_VAPID_PUBLIC_KEY);
      await subscribeToPush({ ...subscription.toJSON(), deviceInfo: navigator.userAgent });
      return { granted: true };
    },
    onSuccess: ({ granted }) => {
      queryClient.invalidateQueries({ queryKey: ['pushSubscriptionStatus'] });
      if (granted) {
        toast.success('پش اطلاعات فعال ہو گئیں۔');
      }
      // Not granted: no toast — PushPermissionBanner.jsx renders its own on-screen reason instead.
    },
  });
}
