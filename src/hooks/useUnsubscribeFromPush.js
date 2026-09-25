import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { unsubscribeFromPush } from '../services/push.api.js';
import { unsubscribeBrowserFromPush } from '../utils/pushNotifications.js';

// Settings page's "off" action — unsubscribes the browser first (so the OS/browser genuinely stops
// delivering), then tells the backend to forget this device's row. Same progressive-enhancement
// stance as useSubscribeToPush: any failure here is swallowed, never a scary error toast — the
// worst case is a stale PushSubscription row, which push.service.js's own 410/404 cleanup will
// prune the next time a send is actually attempted against it.
export function useUnsubscribeFromPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeBrowserFromPush();
      if (endpoint) {
        await unsubscribeFromPush(endpoint);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushSubscriptionStatus'] });
      toast.success('پش اطلاعات بند کر دی گئیں۔');
    },
    onError: (err) => {
      // eslint-disable-next-line no-console -- deliberate: never shown to the end user (no toast).
      console.error('Push unsubscribe failed:', err);
    },
  });
}
