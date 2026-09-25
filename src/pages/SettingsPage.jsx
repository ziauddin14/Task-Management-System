import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { BellRing, BellOff } from 'lucide-react';
import { usePushSubscriptionStatus } from '../hooks/usePushSubscriptionStatus.js';
import { useSubscribeToPush } from '../hooks/useSubscribeToPush.js';
import { useUnsubscribeFromPush } from '../hooks/useUnsubscribeFromPush.js';
import { isPushSupported } from '../utils/pushNotifications.js';

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
      <h1 className="text-3xl font-bold text-gray-900">ترتیبات</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">فون/کمپیوٹر نوٹیفیکیشن</h2>
            <p className="mt-1 text-sm text-gray-600">
              اس ڈیوائس پر، ایپ بند ہونے کے باوجود، نوٹیفیکیشن ٹرے میں اطلاعات وصول کریں — موجودہ
              ان-ایپ گھنٹی/ڈرا کے علاوہ۔
            </p>
          </div>
          {supported && (
            <button
              type="button"
              onClick={handleToggle}
              disabled={isBusy || statusQuery.isLoading}
              className={
                'flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-50 ' +
                (isSubscribed
                  ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'bg-brand text-white hover:bg-brand/90')
              }
            >
              {isSubscribed ? (
                <BellOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <BellRing className="h-4 w-4" aria-hidden="true" />
              )}
              {isSubscribed ? 'بند کریں' : 'فعال کریں'}
            </button>
          )}
        </div>

        {!supported && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            یہ براؤزر/ڈیوائس پش نوٹیفیکیشن سپورٹ نہیں کرتا۔ آئی فون/آئی پیڈ پر سفاری میں یہ فیچر
            تب ہی کام کرتا ہے جب ایپ کو ہوم سکرین پر شامل ("Add to Home Screen") کیا گیا ہو۔
          </p>
        )}

        {supported && (
          <p className="mt-3 text-xs text-gray-400">
            نوٹ: یہ ترتیب صرف اسی ڈیوائس/براؤزر کے لیے ہے — ہر ڈیوائس پر الگ سے فعال کرنا ہوگا۔
          </p>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
