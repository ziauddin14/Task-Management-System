import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Bell, X } from 'lucide-react';
import { isPushSupported, getExistingSubscription } from '../../utils/pushNotifications.js';
import { useSubscribeToPush } from '../../hooks/useSubscribeToPush.js';

const DISMISS_STORAGE_KEY = 'pushPermissionBanner.dismissed.v1';

function readDismissed() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(DISMISS_STORAGE_KEY) === 'true';
}

// Audit fix (production incident, 2026-09) — a real device's subscribe attempt was failing with
// ZERO diagnostic trail: no PushSubscription row ever saved, no backend log line at all (proving
// the failure was entirely client-side, before the API call). Root cause: this component used to
// call subscribeMutation.mutate(undefined, { onSettled: handleDismiss }) — dismissing (and, via
// localStorage, permanently remembering the dismissal) on EITHER success OR failure, with the
// mutation's error going only to console.error. On a phone, nobody opens the console — so a
// failed attempt looked identical to a successful one, and could never be retried.
//
// Fixed behavior: the banner now dismisses-and-remembers ONLY on a genuine granted:true success.
// Any other outcome — permission not granted, or subscribeMutation itself throwing (Service
// Worker registration, pushManager.subscribe(), or the backend call failing) — instead switches
// to a "retry" state that shows a short, specific, ON-SCREEN reason (never just a generic
// "something went wrong"), since that reason is now the primary diagnostic path.
function reasonFor(subscribeMutation) {
  if (subscribeMutation.isError) {
    const err = subscribeMutation.error;
    const name = err?.name || 'Error';
    const message = err?.message || String(err);
    return `${name}: ${message}`;
  }
  if (subscribeMutation.data && subscribeMutation.data.granted === false) {
    return 'اجازت نہیں دی گئی — براؤزر کے مقامی اشو کی وجہ سے بھی ایسا ہو سکتا ہے۔';
  }
  return null;
}

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
    subscribeMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.granted) {
          handleDismiss(); // only a genuine success permanently dismisses this
        }
        // Not granted: stays visible — the render below switches to the retry state.
      },
      // No onSettled/onError dismiss — a thrown error must also stay visible with its reason.
    });
  }

  if (dismissed || !shouldOffer) return null;

  const reason = reasonFor(subscribeMutation);

  return (
    <div className="no-print flex flex-col gap-1.5 rounded-lg border border-brand/20 bg-brand-light px-4 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-gray-700">
          <Bell className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <span className="truncate">
            {reason
              ? 'فون/کمپیوٹر نوٹیفیکیشن فعال نہیں ہو سکیں۔'
              : 'فون/کمپیوٹر کی نوٹیفیکیشن ٹرے میں بھی اطلاعات پانا چاہیں؟'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleAllow}
            disabled={subscribeMutation.isPending}
            className="h-8 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {reason ? 'دوبارہ کوشش کریں' : 'فعال کریں'}
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
      {/* The diagnostic payoff of this whole fix — a short, specific, copy-pasteable reason,
          since a phone's own devtools console isn't practically reachable. */}
      {reason && <p className="ps-6 text-xs text-gray-500" dir="ltr">{reason}</p>}
    </div>
  );
}

export default PushPermissionBanner;
