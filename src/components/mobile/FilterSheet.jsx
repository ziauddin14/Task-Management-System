import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import BottomSheet from './BottomSheet.jsx';
import { PERFORMANCE_BAND_KEYS, getPerformanceMeta, getStatusMeta } from '../../utils/taskDisplay.js';
import { STATUS_TILE_ORDER } from '../../utils/mobileTheme.js';
import {
  DATE_TYPE_LABELS,
  QUICK_RANGES,
  RATING_SOURCE_LABELS,
  SHEET_FILTER_KEYS,
  UNRATED_LABEL,
  matchQuickRange,
  quickRange,
} from '../../utils/taskFilters.js';

const STATUS_OPTIONS = STATUS_TILE_ORDER.map((key) => ({ value: key, label: getStatusMeta(key).label }));
const RATING_OPTIONS = [
  ...PERFORMANCE_BAND_KEYS.map((key) => ({ value: key, label: getPerformanceMeta(key).label })),
  { value: '-', label: UNRATED_LABEL },
];
const RATING_SOURCE_OPTIONS = Object.entries(RATING_SOURCE_LABELS).map(([value, label]) => ({ value, label }));

const FIELD_CLASS =
  'h-[48px] w-full rounded-tk-input border border-tk-line-strong bg-tk-card px-[12px] text-[14px] text-tk-ink focus:border-tk-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-tk-green-700';
const GROUP_LABEL_CLASS = 'mb-[2px] block text-[13px] font-semibold leading-tk-label text-tk-ink-soft';

function draftFromParams(params) {
  const draft = {};
  SHEET_FILTER_KEYS.forEach((key) => {
    draft[key] = params[key] || '';
  });
  if (!draft.dateType) draft.dateType = 'deadline';
  return draft;
}

// One filter with a few fixed choices, as a row of chips: tapping a choice picks it, tapping the
// picked one again clears it (the same toggle a KPI card does on desktop).
function ChoiceChips({ legend, options, value, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className={GROUP_LABEL_CLASS}>{legend}</legend>
      <div className="flex flex-wrap gap-x-tk-gap-sm">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? '' : option.value)}
              className="group flex h-tk-touch min-w-tk-touch items-center justify-center focus-visible:outline-none"
            >
              <span
                className={clsx(
                  'flex h-[36px] min-w-tk-touch items-center justify-center whitespace-nowrap rounded-tk-pill px-[14px] text-[14px] leading-tk-label group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-tk-green-700',
                  selected ? 'bg-tk-green-900 font-semibold text-white' : 'border border-tk-line-strong bg-tk-card text-tk-ink-soft'
                )}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Every dashboard filter, in a bottom sheet: status, rating, rating source (تخمینی / اصل), zimmedar
// (Admin only — `users` is the same assignable-users list the desktop filter bar uses), and the
// date field with its range. Nothing is applied until "لاگو کریں": the sheet edits a draft, then
// hands the whole of it to `onApply` as ONE patch (useDashboardFilters' setFilters — several
// params have to change atomically). "صاف کریں" clears every filter the sheet holds; the search
// text is not one of them.
//
// The two date inputs are the browser's own: they show the date in the device's locale format
// (mm/dd/yyyy on an English-locale phone), which a page cannot change.
function FilterSheet({ isOpen, onClose, params, onApply, isAdmin = false, users = [] }) {
  const [draft, setDraft] = useState(() => draftFromParams(params));

  // A fresh draft every time the sheet opens — never last time's abandoned edits.
  useEffect(() => {
    if (isOpen) setDraft(draftFromParams(params));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function set(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleApply() {
    const patch = {};
    SHEET_FILTER_KEYS.forEach((key) => {
      patch[key] = draft[key] || undefined;
    });
    // The date field on its own filters nothing; it only goes into the URL alongside a range.
    if (!draft.from && !draft.to) patch.dateType = undefined;
    onApply(patch);
    onClose();
  }

  function handleClear() {
    const patch = {};
    SHEET_FILTER_KEYS.forEach((key) => {
      patch[key] = undefined;
    });
    // Has no control of its own any more, but can still arrive in a link — and shows as a chip.
    patch.responsibility = undefined;
    onApply(patch);
    onClose();
  }

  const activeQuickRange = matchQuickRange(draft.from, draft.to);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="فلٹر"
      footer={
        <div className="flex gap-tk-gap">
          <button
            type="button"
            onClick={handleClear}
            className="h-[48px] flex-1 rounded-tk-input border border-tk-line-strong bg-tk-card text-[15px] font-semibold leading-tk-label text-tk-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
          >
            صاف کریں
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-[48px] flex-[2] rounded-tk-input bg-tk-green-700 text-[15px] font-semibold leading-tk-label text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700"
          >
            لاگو کریں
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-tk-gap">
        <ChoiceChips legend="کام کی کیفیت" options={STATUS_OPTIONS} value={draft.status} onChange={(value) => set('status', value)} />
        <ChoiceChips legend="کارکردگی" options={RATING_OPTIONS} value={draft.performanceRating} onChange={(value) => set('performanceRating', value)} />
        <ChoiceChips legend="درجہ بندی کی قسم" options={RATING_SOURCE_OPTIONS} value={draft.ratingSource} onChange={(value) => set('ratingSource', value)} />

        {isAdmin && (
          <label className="block">
            <span className={GROUP_LABEL_CLASS}>ذمہ دار</span>
            <select value={draft.assigneeId} onChange={(event) => set('assigneeId', event.target.value)} className={FIELD_CLASS}>
              <option value="">تمام ذمہ داران</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <fieldset className="min-w-0">
          <legend className={GROUP_LABEL_CLASS}>تاریخ</legend>
          <div className="flex flex-col gap-tk-gap-sm">
            <select value={draft.dateType} onChange={(event) => set('dateType', event.target.value)} aria-label="تاریخ کی قسم" className={FIELD_CLASS}>
              {Object.entries(DATE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-x-tk-gap-sm">
              {QUICK_RANGES.map((range) => {
                const selected = activeQuickRange === range.key;
                return (
                  <button
                    key={range.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDraft((prev) => ({ ...prev, ...(selected ? { from: '', to: '' } : quickRange(range.key)) }))}
                    className="group flex h-tk-touch min-w-tk-touch items-center justify-center focus-visible:outline-none"
                  >
                    <span
                      className={clsx(
                        'flex h-[36px] min-w-tk-touch items-center justify-center whitespace-nowrap rounded-tk-pill px-[14px] text-[14px] leading-tk-label group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-tk-green-700',
                        selected ? 'bg-tk-green-900 font-semibold text-white' : 'border border-tk-line-strong bg-tk-card text-tk-ink-soft'
                      )}
                    >
                      {range.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-tk-gap-sm">
              <label className="block min-w-0">
                <span className="block text-[12px] leading-tk-label text-tk-muted">از تاریخ</span>
                <input type="date" value={draft.from} onChange={(event) => set('from', event.target.value)} className={FIELD_CLASS} />
              </label>
              <label className="block min-w-0">
                <span className="block text-[12px] leading-tk-label text-tk-muted">تا تاریخ</span>
                <input type="date" value={draft.to} onChange={(event) => set('to', event.target.value)} className={FIELD_CLASS} />
              </label>
            </div>
          </div>
        </fieldset>
      </div>
    </BottomSheet>
  );
}

export default FilterSheet;
