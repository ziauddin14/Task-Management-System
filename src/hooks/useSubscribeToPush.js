import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { subscribeToPush } from '../services/push.api.js';
import { registerServiceWorker, subscribeBrowserToPush } from '../utils/pushNotifications.js';

// The full opt-in flow: register the Service Worker, request the native browser permission (must
// be called from a real user gesture — the caller is always a click handler, never triggered
// automatically), then — only if granted — subscribe and tell the backend. Progressive
// enhancement throughout: permission denied is a normal, valid outcome (not an error), and any
// unexpected failure along the way is swallowed rather than surfaced as a scary error toast — the
// existing in-app bell/drawer system is completely unaffected either way.
export function useSubscribeToPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await registerServiceWorker();
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { granted: false };
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
      // Denied: no toast, no error — silently stays on the existing in-app bell/drawer system.
    },
    onError: (err) => {
      // Never surfaced to the user — push is a progressive enhancement, not core functionality.
      // eslint-disable-next-line no-console -- deliberate: visible to a developer debugging this,
      // never shown to the end user (no toast).
      console.error('Push subscribe failed:', err);
    },
  });
}
