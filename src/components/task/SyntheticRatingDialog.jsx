import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import BusyButton from '../common/BusyButton.jsx';
import { useEditSyntheticRating, useRemoveSyntheticRating } from '../../hooks/useSyntheticRatingMutations.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { getPerformanceMeta, ratingForPercent, SYNTHETIC_LABEL } from '../../utils/taskDisplay.js';

const NOTE_MAX_LENGTH = 500;

// "0"–"100" as the admin typed it -> a number, or null while it is not a valid percentage.
function parsePercent(text) {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

function RatingBadge({ rating }) {
  const meta = getPerformanceMeta(rating);
  return <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', meta.badgeClass)}>{meta.label}</span>;
}

// Admin-only — "تخمینی درجہ بندی تبدیل کریں". Changes the ASSUMED percentage behind a task's
// synthetic rating (or removes the synthetic rating altogether). It never touches the task's real
// completion percent, status or updates: the backend writes only the rating, the assumed percent
// and a history entry (docs/05-apis.md §5). The band shown while typing is a live preview from the
// same thresholds; what is saved — and shown afterwards — is always the server's own answer.
function SyntheticRatingDialog({ isOpen, onClose, task }) {
  const taskId = task?.id;
  const currentPercent = task?.syntheticRating?.assumedPercent;
  const [percentText, setPercentText] = useState('');
  const [note, setNote] = useState('');
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const editMutation = useEditSyntheticRating(taskId);
  const removeMutation = useRemoveSyntheticRating(taskId);

  useEffect(() => {
    if (!isOpen) return;
    setPercentText(currentPercent === undefined || currentPercent === null ? '' : String(currentPercent));
    setNote('');
    setConfirmingRemove(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when (re)opened for a task
  }, [isOpen, taskId]);

  if (!task) return null;

  const percent = parsePercent(percentText);
  const isValid = percent !== null && note.length <= NOTE_MAX_LENGTH;
  const isBusy = editMutation.isPending || removeMutation.isPending;
  const history = task.syntheticRating?.history || [];

  async function handleSave(event) {
    event.preventDefault();
    if (!isValid || isBusy) return;
    try {
      await editMutation.mutateAsync({ assumedPercent: percent, note: note.trim() || undefined });
    } catch {
      return; // global mutations.onError (App.jsx) already toasted the error; keep the dialog open.
    }
    toast.success('تخمینی درجہ بندی تبدیل کر دی گئی');
    onClose();
  }

  async function handleRemove() {
    try {
      await removeMutation.mutateAsync({ note: note.trim() || undefined });
    } catch {
      setConfirmingRemove(false);
      return;
    }
    toast.success('تخمینی درجہ بندی ہٹا دی گئی');
    setConfirmingRemove(false);
    onClose();
  }

  return (
    <>
      <Modal isOpen={isOpen && !confirmingRemove} onClose={onClose} title={`${SYNTHETIC_LABEL} درجہ بندی تبدیل کریں`}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
            <span className="font-mono">{task.codeNumber}</span> — <span>{task.title}</span>
          </div>

          {/* What is real and what is assumed, side by side — the real figure is shown, never edited. */}
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-gray-200 p-2">
              <dt className="text-xs text-gray-500">اصل تکمیل فیصد</dt>
              <dd className="font-semibold text-gray-900" dir="ltr">
                {task.completionPercent}%
              </dd>
            </div>
            <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-2">
              <dt className="text-xs text-amber-800">موجودہ {SYNTHETIC_LABEL} درجہ بندی</dt>
              <dd className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
                <RatingBadge rating={task.performanceRating} />
                <span dir="ltr">{currentPercent}%</span>
              </dd>
            </div>
          </dl>

          <div>
            <label htmlFor="synthetic-percent" className="mb-1 block text-sm font-medium text-gray-700">
              نیا فرض کردہ فیصد (0 تا 100)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="synthetic-percent"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="1"
                dir="ltr"
                value={percentText}
                onChange={(event) => setPercentText(event.target.value)}
                aria-invalid={percent === null}
                aria-describedby="synthetic-percent-preview"
                className="h-10 w-28 rounded-lg border border-gray-300 px-2 text-center"
              />
              {/* Live preview: the band this percentage gives (no late downgrade — same as the server). */}
              <p id="synthetic-percent-preview" aria-live="polite" className="flex items-center gap-1.5 text-sm text-gray-600">
                {percent === null ? (
                  <span className="text-red-600">0 سے 100 کے درمیان فیصد درج کریں</span>
                ) : (
                  <>
                    <span>نتیجہ:</span>
                    <RatingBadge rating={ratingForPercent(percent)} />
                  </>
                )}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="synthetic-note" className="mb-1 block text-sm font-medium text-gray-700">
              نوٹ (اختیاری)
            </label>
            <textarea
              id="synthetic-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={NOTE_MAX_LENGTH}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
            />
          </div>

          {history.length > 0 && (
            <details className="rounded-lg border border-gray-200 p-2 text-xs text-gray-600">
              <summary className="cursor-pointer text-sm text-gray-700">تبدیلیوں کی سرگزشت ({history.length})</summary>
              <ul className="mt-1.5 flex flex-col gap-1">
                {[...history].reverse().map((entry, index) => (
                  // eslint-disable-next-line react/no-array-index-key -- append-only log, no stable id
                  <li key={index} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-gray-100 pt-1 first:border-t-0 first:pt-0">
                    <span dir="ltr">{formatDateTime(entry.at)}</span>
                    <span dir="ltr">
                      {entry.fromPercent ?? '—'}% → {entry.toPercent ?? '—'}%
                    </span>
                    <span>
                      {getPerformanceMeta(entry.fromRating).label} ← {getPerformanceMeta(entry.toRating).label}
                    </span>
                    {entry.note && <span className="text-gray-500">{entry.note}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-1 grid grid-cols-3 gap-2">
            <button type="button" onClick={onClose} className="h-11 min-w-0 rounded-lg px-1 text-sm font-semibold text-gray-700 hover:bg-gray-100">
              منسوخ کریں
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              disabled={isBusy}
              className="h-11 min-w-0 rounded-lg border border-red-300 px-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              ہٹائیں
            </button>
            <BusyButton
              type="submit"
              busy={editMutation.isPending}
              busyLabel="محفوظ ہو رہا ہے…"
              disabled={!isValid || removeMutation.isPending}
              className="h-11 min-w-0 rounded-lg bg-brand px-1 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
            >
              محفوظ کریں
            </BusyButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isOpen && confirmingRemove}
        title={`${SYNTHETIC_LABEL} درجہ بندی ہٹائیں`}
        message={`کام ${task.codeNumber} کی ${SYNTHETIC_LABEL} درجہ بندی ہٹانے کے بعد یہ کام دوبارہ بغیر درجہ بندی کے ہو جائے گا۔ اصل تکمیل فیصد اور کیفیت میں کوئی تبدیلی نہیں ہوگی۔ کیا واقعی ہٹانا چاہتے ہیں؟`}
        confirmLabel="ہاں، ہٹائیں"
        cancelLabel="منسوخ کریں"
        onConfirm={handleRemove}
        onCancel={() => setConfirmingRemove(false)}
        isLoading={removeMutation.isPending}
      />
    </>
  );
}

export default SyntheticRatingDialog;
