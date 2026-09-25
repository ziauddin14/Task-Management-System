import { useQuery } from '@tanstack/react-query';
import { getExistingSubscription, isPushSupported } from '../utils/pushNotifications.js';

// Reads THIS BROWSER's own current subscription state — not a server call (the backend only knows
// which subscriptions exist, not which one "this" tab currently is). React Query is used purely as
// a cache/invalidation mechanism here (useSubscribeToPush/useUnsubscribeFromPush both invalidate
// this same key on success), not because the data comes from an API.
export function usePushSubscriptionStatus() {
  return useQuery({
    queryKey: ['pushSubscriptionStatus'],
    queryFn: async () => ({ isSubscribed: Boolean(await getExistingSubscription()) }),
    enabled: isPushSupported(),
  });
}
