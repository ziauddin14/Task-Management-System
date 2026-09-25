import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Bell, X } from 'lucide-react';
import { isPushSupported, getExistingSubscription } from '../../utils/pushNotifications.js';
import { useSubscribeToPush } from '../../hooks/useSubscribeToPush.js';

const DISMISS_STORAGE_KEY = 'pushPermissionBanner.dismissed.v1';

function readDismissed() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(DISMISS_STORAGE_KEY) === 'true';
}

// Dashboard-mounted, dismissible opt-in banner (locked decision: the native permission prompt is
// only ever triggered from this banner's own button click — a real user gesture — never
// automatically on page load, since modern browsers deprioritize/suppress permission prompts that
// aren't tied to one). Renders nothing at all — not even an empty/disabled state — when push isn't
// supported, permission has already been decided one way or the other
// (Notification.permission is 'default' only pre-decision), a subscription already exists, or the
// user already dismissed this once; none of those are errors, so none of them show anything.
function PushPermissionBanner() {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [shouldOffer, setShouldOffer] = useState(false);
  const subscribeMutation = useSubscribeToPush();

  useEffect(() => {
    let cancelled = false;
    async function checkEligibility() {
      if (!isPushSupported() || Notification.permission !== 'default') {
        return;
      }
      const existing = await getExistingSubscription();
      if (!cancelled && !existing) {
        setShouldOffer(true);
      }
    }
    checkEligibility();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
    }
  }

  function handleAllow() {
    subscribeMutation.mutate(undefined, { onSettled: handleDismiss });
  }

  if (dismissed || !shouldOffer) return null;

  return (
    <div className="no-print flex items-center justify-between gap-3 rounded-lg border border-brand/20 bg-brand-light px-4 py-2.5 text-sm">
      <div className="flex min-w-0 items-center gap-2 text-gray-700">
        <Bell className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        <span className="truncate">فون/کمپیوٹر کی نوٹیفیکیشن ٹرے میں بھی اطلاعات پانا چاہیں؟</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleAllow}
          disabled={subscribeMutation.isPending}
          className="h-8 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
        >
          فعال کریں
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="بند کریں"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-white/60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default PushPermissionBanner;
