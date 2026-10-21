import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Gauge } from 'lucide-react';
import Modal, { ModalFooter } from '../common/Modal.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import BusyButton from '../common/BusyButton.jsx';
import { useEditSyntheticRating, useRemoveSyntheticRating } from '../../hooks/useSyntheticRatingMutations.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { FINALIZE_CONFIRM_LABEL, FINAL_RATING_SAVED, getPerformanceMeta, ratingForPercent, SYNTHETIC_LABEL } from '../../utils/taskDisplay.js';
import { getRatingTone } from '../../utils/mobileTheme.js';
import { BUTTON_DANGER, BUTTON_GHOST, BUTTON_PRIMARY, FIELD_LABEL, FIELD_TEXTAREA } from '../../utils/uiClasses.js';

const NOTE_MAX_LENGTH = 500;

// "0"–"100" as the admin typed it -> a number, or null while it is not a valid percentage.
function parsePercent(text) {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

function RatingBadge({ rating }) {
  const meta = getPerformanceMeta(rating);
  return (
    <span className={clsx('inline-block whitespace-nowrap rounded-tk-pill px-[10px] text-[12px] font-normal leading-[2.3]', getRatingTone(rating)?.chip || 'bg-tk-surface text-tk-muted')}>
      {meta.label}
    </span>
  );
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
  // Saving makes the rating FINAL (no longer an estimate; it cannot be changed or removed again),
  // so "محفوظ کریں" first asks for that to be confirmed.
  const [confirmingFinal, setConfirmingFinal] = useState(false);
  const editMutation = useEditSyntheticRating(taskId);
  const removeMutation = useRemoveSyntheticRating(taskId);

  useEffect(() => {
    if (!isOpen) return;
    setPercentText(currentPercent === undefined || currentPercent === null ? '' : String(currentPercent));
    setNote('');
    setConfirmingRemove(false);
    setConfirmingFinal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when (re)opened for a task
  }, [isOpen, taskId]);

  if (!task) return null;

  const percent = parsePercent(percentText);
  const isValid = percent !== null && note.length <= NOTE_MAX_LENGTH;
  const isBusy = editMutation.isPending || removeMutation.isPending;
  const history = task.syntheticRating?.history || [];

  function handleSave(event) {
    event.preventDefault();
    if (!isValid || isBusy) return;
    setConfirmingFinal(true);
  }

  async function handleConfirmFinal() {
    try {
      await editMutation.mutateAsync({ assumedPercent: percent, note: note.trim() || undefined });
    } catch (err) {
      // The hook already toasted the error. Back to the dialog with what was typed — unless the
      // rating turned out to be final already, when there is nothing left to edit here.
      setConfirmingFinal(false);
      if (err?.code === 'SYNTHETIC_RATING_FINAL') onClose();
      return;
    }
    toast.success(FINAL_RATING_SAVED);
    setConfirmingFinal(false);
    onClose();
  }

  async function handleRemove() {
    try {
      await removeMutation.mutateAsync({ note: note.trim() || undefined });
    } catch (err) {
      setConfirmingRemove(false);
      if (err?.code === 'SYNTHETIC_RATING_FINAL') onClose();
      return;
    }
    toast.success('تخمینی درجہ بندی ہٹا دی گئی');
    setConfirmingRemove(false);
    onClose();
  }

  return (
    <>
      {/* The redesigned look (the approved dialog style): an amber icon chip — amber is how an
          estimate is marked everywhere in the app — the task as a banner, tinted tiles and fields,
          and the buttons in a footer that stays in reach. Fields, labels and handlers unchanged. */}
      <Modal
        isOpen={isOpen && !confirmingRemove && !confirmingFinal}
        onClose={onClose}
        title={`${SYNTHETIC_LABEL} درجہ بندی تبدیل کریں`}
        variant="redesign"
        icon={Gauge}
        iconTone="amber"
        maxWidthClassName="max-w-[560px]"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="rounded-tk-tile bg-tk-hover px-[14px] py-[6px] text-[14px] leading-tk-label text-tk-ink">
            <span className="font-mono font-semibold text-tk-green-900">{task.codeNumber}</span> — <span>{task.title}</span>
          </div>

          {/* What is real and what is assumed, side by side — the real figure is shown, never edited. */}
          <dl className="grid grid-cols-2 gap-3 text-[14px] leading-tk-label">
            <div className="rounded-tk-tile border border-transparent bg-tk-surface px-[14px] py-[8px]">
              <dt className="text-[12px] text-tk-muted">اصل تکمیل فیصد</dt>
              <dd className="text-[16px] font-semibold text-tk-ink" dir="ltr">
                {task.completionPercent}%
              </dd>
            </div>
            <div className="rounded-tk-tile border border-dashed border-tk-amber-line bg-tk-amber-bg px-[14px] py-[8px]">
              <dt className="text-[12px] text-tk-amber-text">موجودہ {SYNTHETIC_LABEL} درجہ بندی</dt>
              <dd className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-tk-ink">
                <RatingBadge rating={task.performanceRating} />
                <span dir="ltr">{currentPercent}%</span>
              </dd>
            </div>
          </dl>

          <div>
            <label htmlFor="synthetic-percent" className={FIELD_LABEL}>
              نیا فرض کردہ فیصد (0 تا 100)
            </label>
            <div className="flex flex-wrap items-center gap-3">
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
                className="h-[48px] w-[112px] shrink-0 rounded-tk-input border-[1.5px] border-transparent bg-tk-surface px-2 text-center text-[16px] font-semibold text-tk-ink transition-colors focus:border-tk-green-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-tk-green-700/25 aria-[invalid=true]:border-tk-danger-line"
              />
              {/* Live preview: the band this percentage gives (no late downgrade — same as the server). */}
              <p id="synthetic-percent-preview" aria-live="polite" className="flex min-w-0 items-center gap-2 text-[14px] leading-tk-label text-tk-ink-soft">
                {percent === null ? (
                  <span className="text-[13px] text-tk-danger">0 سے 100 کے درمیان فیصد درج کریں</span>
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
            <label htmlFor="synthetic-note" className={FIELD_LABEL}>
              نوٹ (اختیاری)
            </label>
            <textarea
              id="synthetic-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={NOTE_MAX_LENGTH}
              className={FIELD_TEXTAREA}
            />
          </div>

          {history.length > 0 && (
            <details className="rounded-tk-input border border-tk-line px-[14px] py-[6px] text-[12px] leading-tk-label text-tk-ink-soft">
              <summary className="cursor-pointer text-[13px] text-tk-ink">تبدیلیوں کی سرگزشت ({history.length})</summary>
              <ul className="mt-1 flex flex-col gap-1">
                {[...history].reverse().map((entry, index) => (
                  // eslint-disable-next-line react/no-array-index-key -- append-only log, no stable id
                  <li key={index} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-tk-line-soft pt-1 first:border-t-0 first:pt-0">
                    <span dir="ltr">{formatDateTime(entry.at)}</span>
                    <span dir="ltr">
                      {entry.fromPercent ?? '—'}% → {entry.toPercent ?? '—'}%
                    </span>
                    <span>
                      {getPerformanceMeta(entry.fromRating).label} ← {getPerformanceMeta(entry.toRating).label}
                    </span>
                    {entry.note && <span className="text-tk-muted">{entry.note}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <ModalFooter>
            <BusyButton
              type="submit"
              busy={editMutation.isPending}
              busyLabel="محفوظ ہو رہا ہے…"
              disabled={!isValid || removeMutation.isPending}
              className={`${BUTTON_PRIMARY} min-w-[120px] flex-1`}
            >
              محفوظ کریں
            </BusyButton>
            <button type="button" onClick={onClose} className={BUTTON_GHOST}>
              منسوخ کریں
            </button>
            <button type="button" onClick={() => setConfirmingRemove(true)} disabled={isBusy} className={BUTTON_DANGER}>
              ہٹائیں
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* The new value is final: confirmed first, in the amber tone of an estimate. Cancelling
          returns to the dialog with what was typed. */}
      <ConfirmDialog
        isOpen={isOpen && confirmingFinal}
        title={`${SYNTHETIC_LABEL} درجہ بندی تبدیل کریں`}
        message={
          percent === null ? null : (
            // The approved sentence. The code and the percentage are kept left-to-right so the
            // bidi rules never draw "95%" as "%95" next to Urdu words.
            <>
              کام <span dir="ltr">{task.codeNumber}</span> کی درجہ بندی {getPerformanceMeta(ratingForPercent(percent)).label} (<span dir="ltr">{percent}%</span>) حتمی ہو
              جائے گی۔ اس کے بعد یہ تخمینی نہیں رہے گی اور اسے دوبارہ تبدیل یا ہٹایا نہیں جا سکے گا۔ کیا جاری رکھیں؟
            </>
          )
        }
        confirmLabel={FINALIZE_CONFIRM_LABEL}
        cancelLabel="منسوخ کریں"
        tone="amber"
        onConfirm={handleConfirmFinal}
        onCancel={() => setConfirmingFinal(false)}
        isLoading={editMutation.isPending}
      />

      <ConfirmDialog
        isOpen={isOpen && confirmingRemove}
        title={`${SYNTHETIC_LABEL} درجہ بندی ہٹائیں`}
        message={`کام ${task.codeNumber} کی ${SYNTHETIC_LABEL} درجہ بندی ہٹانے کے بعد یہ کام دوبارہ بغیر درجہ بندی کے ہو جائے گا۔ اصل تکمیل فیصد اور کیفیت میں کوئی تبدیلی نہیں ہوگی۔ کیا واقعی ہٹانا چاہتے ہیں؟`}
        confirmLabel="ہاں، ہٹائیں"
        cancelLabel="منسوخ کریں"
        tone="danger"
        onConfirm={handleRemove}
        onCancel={() => setConfirmingRemove(false)}
        isLoading={removeMutation.isPending}
      />
    </>
  );
}

export default SyntheticRatingDialog;
