import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useActivitySettings } from '../../hooks/useActivitySettings.js';
import { useUpdateActivitySettings } from '../../hooks/useUpdateActivitySettings.js';
import BusyButton from '../common/BusyButton.jsx';
import BusyRegion from '../common/BusyRegion.jsx';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import { FIELD, FIELD_ERROR, FIELD_LABEL, PAGE_BUTTON_PRIMARY } from '../../utils/uiClasses.js';
import { MAX_INACTIVITY_DAYS, MIN_INACTIVITY_DAYS, isValidInactivityDays } from '../../utils/activityLog.js';

const ERROR_TEXT = '1 سے 90 کے درمیان پورا عدد درج کریں';

// The Settings page's Admin-only card: after how many days without activity an account is shown
// as inactive (N, a whole number 1–90; 7 until an Admin saves another). Rendered by SettingsPage
// only for an Admin. If the setting cannot be read (an older backend, a failure) the card is
// simply left out — the page then looks as it did before.
function ActivitySettingsCard() {
  const settingsQuery = useActivitySettings();
  const updateMutation = useUpdateActivitySettings();
  const saved = settingsQuery.data?.inactivityDays;
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);

  // The field follows the stored value whenever that value changes (first load, after a save).
  useEffect(() => {
    if (saved !== undefined) setValue(String(saved));
  }, [saved]);

  if (settingsQuery.isError) return null;

  const isDirty = saved !== undefined && value.trim() !== String(saved);

  function handleSubmit(event) {
    event.preventDefault();
    if (!isValidInactivityDays(value)) {
      setShowError(true);
      return;
    }
    setShowError(false);
    updateMutation.mutate({ inactivityDays: Number(value.trim()) });
  }

  return (
    <div className="rounded-tk-panel bg-tk-card p-5 shadow-tk-card" data-activity-settings>
      <h2 className="text-base font-semibold text-tk-ink">ایکٹیویٹی لاگ</h2>
      {settingsQuery.isLoading ? (
        <LoadingPhrase size="compact" />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-3">
          <BusyRegion>
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-0 flex-1">
                <span className={FIELD_LABEL}>غیر متحرک ہونے کی حد (دن)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_INACTIVITY_DAYS}
                  max={MAX_INACTIVITY_DAYS}
                  step={1}
                  dir="ltr"
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    setShowError(false);
                  }}
                  aria-invalid={showError || undefined}
                  aria-describedby={showError ? 'activity-days-error' : undefined}
                  className={`${FIELD} text-end`}
                />
              </label>
              <BusyButton
                type="submit"
                busy={updateMutation.isPending}
                busyLabel="محفوظ ہو رہا ہے…"
                disabled={!isDirty}
                className={`${PAGE_BUTTON_PRIMARY} h-[48px]`}
              >
                محفوظ کریں
              </BusyButton>
            </div>
          </BusyRegion>
          {showError && (
            <p id="activity-days-error" role="alert" className={FIELD_ERROR}>
              {ERROR_TEXT}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export default ActivitySettingsCard;
