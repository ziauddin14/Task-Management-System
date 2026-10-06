import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { BellRing, BellOff } from 'lucide-react';
import { usePushSubscriptionStatus } from '../hooks/usePushSubscriptionStatus.js';
import { useSubscribeToPush } from '../hooks/useSubscribeToPush.js';
import { useUnsubscribeFromPush } from '../hooks/useUnsubscribeFromPush.js';
import { isPushSupported } from '../utils/pushNotifications.js';
import BusyButton from '../components/common/BusyButton.jsx';
import BusyRegion from '../components/common/BusyRegion.jsx';
import { PAGE_BUTTON_GHOST, PAGE_BUTTON_PRIMARY } from '../utils/uiClasses.js';

// New page (Web Push addition — no Settings/Profile page existed before this). Currently holds
// only the push on/off toggle; a natural home for any future personal preference, but nothing
// beyond push is in scope here.
function SettingsPage() {
  const supported = isPushSupported();
  const statusQuery = usePushSubscriptionStatus();
  const subscribeMutation = useSubscribeToPush();
  const unsubscribeMutation = useUnsubscribeFromPush();

  const isSubscribed = Boolean(statusQuery.data?.isSubscribed);
  const isBusy = subscribeMutation.isPending || unsubscribeMutation.isPending;

  function handleToggle() {
    if (isSubscribed) {
      unsubscribeMutation.mutate();
    } else {
      subscribeMutation.mutate();
    }
  }

  return (
    <div className="flex max-w-xl min-w-0 flex-col gap-4">
      <h1 className="text-3xl font-bold text-tk-ink">ترتیبات</h1>

      <div className="rounded-tk-panel bg-tk-card p-5 shadow-tk-card">
        <BusyRegion>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-tk-ink">فون/کمپیوٹر نوٹیفیکیشن</h2>
              <p className="mt-1 text-sm text-tk-muted">
                اس ڈیوائس پر، ایپ بند ہونے کے باوجود، نوٹیفیکیشن ٹرے میں اطلاعات وصول کریں — موجودہ
                ان-ایپ گھنٹی/ڈرا کے علاوہ۔
              </p>
            </div>
            {supported && (
              <BusyButton
                onClick={handleToggle}
                busy={isBusy}
                disabled={statusQuery.isLoading}
                className={
                  // The shared page-button styles (utils/uiClasses.js): ghost to switch it off, primary to switch it on.
                  isSubscribed ? PAGE_BUTTON_GHOST : PAGE_BUTTON_PRIMARY
                }
              >
                {isSubscribed ? (
                  <BellOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                )}
                {isSubscribed ? 'بند کریں' : 'فعال کریں'}
              </BusyButton>
            )}
          </div>
        </BusyRegion>

        {!supported && (
          <p className="mt-3 rounded-tk-chip bg-tk-amber-bg px-3 py-2 text-sm text-tk-amber-text">
            یہ براؤزر/ڈیوائس پش نوٹیفیکیشن سپورٹ نہیں کرتا۔ آئی فون/آئی پیڈ پر سفاری میں یہ فیچر
            تب ہی کام کرتا ہے جب ایپ کو ہوم سکرین پر شامل (&quot;Add to Home Screen&quot;) کیا گیا ہو۔
          </p>
        )}

        {supported && (
          <p className="mt-3 text-xs text-tk-muted">
            نوٹ: یہ ترتیب صرف اسی ڈیوائس/براؤزر کے لیے ہے — ہر ڈیوائس پر الگ سے فعال کرنا ہوگا۔
          </p>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
