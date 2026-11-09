import React, { useEffect, useRef, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { CircleCheck, Paperclip, Pencil, TriangleAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal, { ModalFooter } from '../common/Modal.jsx';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import BusyButton from '../common/BusyButton.jsx';
import AttachmentPicker from './AttachmentPicker.jsx';
import PreviousUpdatesContent from './PreviousUpdatesContent.jsx';
import { useTask } from '../../hooks/useTask.js';
import { useCreateTaskUpdate } from '../../hooks/useCreateTaskUpdate.js';
import { useUpdateTask } from '../../hooks/useUpdateTask.js';
import { useCloseTask } from '../../hooks/useCloseTask.js';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { BUTTON_AMBER, BUTTON_DANGER, BUTTON_GHOST, BUTTON_PRIMARY, FIELD, FIELD_ERROR, FIELD_LABEL, FIELD_TEXTAREA } from '../../utils/uiClasses.js';
import { REOPEN_ADMIN_ONLY_NOTE, REOPEN_WARNING } from '../../utils/taskDisplay.js';

// docs/09-frontend-features.md §3 — description required min 3 chars; completionPercent required
// 0-100 (mirrors backend/src/validators/taskUpdate.validator.js's createTaskUpdateSchema).
const updateSchema = z.object({
  description: z.string().trim().min(3, 'تفصیل کم از کم 3 حروف کی ہونی چاہیے'),
  completionPercent: z.coerce.number({ invalid_type_error: 'تکمیل فیصد درج کرنا ضروری ہے' }).min(0).max(100),
});

// docs/08-ui-ux.md §7 — opened by the row's "Update" button. Read-only task summary header,
// description, completion % (number + slider kept in sync), optional attachment, Save/Cancel,
// and a "Purani Updates dekhein" link that expands the shared PreviousUpdatesContent inline.
//
// Close Task — a footer button next to Save/Cancel, Admin-only and hidden once the task is closed.
// This dialog is where a task is closed (nothing else in the app offers it), so it owns the whole
// flow: an inline step (like the reassign step below) asks the existing confirmation question —
// no second dialog on top of this one — and closes through useCloseTask.
// - An ADMIN's save does not close the dialog: the reply is saved, the form is emptied for the next
//   one and "اپڈیٹ محفوظ ہو گئی" stays in view — so he can close the task right here without
//   finding it again in a list it may have left. A normal user's save closes the dialog as always.
// - A reply typed and not saved goes WITH the close, in the same request: the backend saves it and
//   closes the task in one transaction (PATCH /tasks/:id/close with a body — the reply never
//   reopens the task, never sends a notice and never makes it later). The step shows it. A percent
//   (or file) without a description is not sent silently: the form's own message shows and nothing
//   is closed. Nothing typed: the plain close, without a body.
// - Escape, the backdrop or × while the step is open only leave the step, back to the form with
//   the draft as it was. A failed close leaves the step and the draft in place (the error is the
//   global toast) so it can simply be tried again.
//
// Prompt — Change Assignee (reassign mid-task, without losing update history) added alongside
// it, same Admin-only/not-closed visibility rule. Its own inline "کیا آپ یہ کام کسی دوسرے ذمہ دار
// کو دینا چاہتے ہیں؟" step leads to the close step for the "نہیں" answer — the same close
// flow as the standalone button, not a second copy of it. "ہاں" reveals a single-select dropdown
// (useAssignableUsers — the same source as the Naya Kaam form's assignee picker) and PATCHes the
// task via useUpdateTask with { assignees: [newId] } — a full replacement of the array (per
// client decision), which the backend's updateTaskFields already treats as an ordinary field
// patch: status/completionPercent/timeStatus and every existing TaskUpdate are left untouched.
function UpdateModal({ isOpen, onClose, taskId, isAdmin }) {
  const { data: task, isLoading: isTaskLoading } = useTask(taskId);
  const createUpdate = useCreateTaskUpdate(taskId);
  const reassignTask = useUpdateTask(taskId);
  const closeTask = useCloseTask(taskId);
  // null, or the close step in view: { reply } — the final reply going with the close, or null.
  const [closeStep, setCloseStep] = useState(null);
  // An admin's save succeeded and the dialog stayed open (see onSubmit).
  const [justSaved, setJustSaved] = useState(false);
  const closeButtonRef = useRef(null);
  const stepCancelRef = useRef(null);
  const closeStepWasOpen = useRef(false);
  const [attachmentStatus, setAttachmentStatus] = useState('idle');
  const [attachment, setAttachment] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  // Bumped on every open so AttachmentPicker remounts fresh (clears its own file/progress state)
  // rather than carrying a previous session's picked file into a new one.
  const [attachmentKey, setAttachmentKey] = useState(0);
  // null | 'confirm' | 'select' — the Change Assignee mini-flow's own step, independent of the
  // regular update form above it (they're mutually exclusive views, not merged into one submit).
  const [reassignStep, setReassignStep] = useState(null);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const { data: assignableUsers, isLoading: assignableLoading } = useAssignableUsers({
    enabled: reassignStep === 'select',
  });
  const newSelectedAssignee = (assignableUsers?.items || []).find((person) => person.id === newAssigneeId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(updateSchema),
    defaultValues: { description: '', completionPercent: 0 },
  });

  // Tracks whether the form has already been pre-filled for the CURRENT open session, so the
  // one-time initial reset (below) doesn't refire and clobber in-progress typing every time a
  // background refetch of ['task', taskId] happens to produce a new object reference.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    initializedRef.current = false;
    setAttachment(null);
    setAttachmentStatus('idle');
    setShowHistory(false);
    setAttachmentKey((prev) => prev + 1);
    setReassignStep(null);
    setNewAssigneeId('');
    setCloseStep(null);
    setJustSaved(false);
  }, [isOpen, taskId]);

  // Into the close step: focus its "منسوخ کریں" (the safe choice). Back out of it: focus "کام بند
  // کریں" again, where the admin left off.
  useEffect(() => {
    if (closeStep) stepCancelRef.current?.focus();
    else if (closeStepWasOpen.current) closeButtonRef.current?.focus();
    closeStepWasOpen.current = Boolean(closeStep);
  }, [closeStep]);

  // task starts undefined while useTask() is loading — this effect (separate from the one above,
  // which fires immediately on open before the fetch resolves) applies the real completionPercent
  // once the task data actually arrives, exactly once per open session.
  // Only an admin may reopen a complete task (an update below 100%). For anyone else the percent is
  // fixed at 100 — they can still post an update at 100% — and a note says why. The backend refuses
  // below 100% anyway (403 REOPEN_ADMIN_ONLY): it stays the authority.
  const percentFixedAt100 = !isAdmin && task?.status === 'complete';

  useEffect(() => {
    if (!isOpen || !task || initializedRef.current) return;
    reset({ description: '', completionPercent: percentFixedAt100 ? 100 : task.completionPercent ?? 0 });
    initializedRef.current = true;
  }, [isOpen, task, reset, percentFixedAt100]);

  // The task can become complete while the form is open (someone else completed it): the percent
  // then moves to 100, in view, with the note beside it.
  useEffect(() => {
    if (isOpen && percentFixedAt100) setValue('completionPercent', 100, { shouldValidate: true });
  }, [isOpen, percentFixedAt100, setValue]);

  const completionPercent = watch('completionPercent');
  const description = watch('description');
  // Same rule for both admin-only footer actions — neither makes sense once a task is terminal.
  const canManageTask = isAdmin && task && task.status !== 'closed';
  // The saved line stays until a new reply is started (text, percent or file).
  const showSaved =
    justSaved && !String(description ?? '').trim() && Number(completionPercent) === (task?.completionPercent ?? 0) && !attachment && attachmentStatus !== 'uploading';

  async function onSubmit(values) {
    const payload = { description: values.description, completionPercent: percentFixedAt100 ? 100 : values.completionPercent };
    if (attachment) payload.attachment = attachment;
    let saved;
    try {
      saved = await createUpdate.mutateAsync(payload);
    } catch {
      return; // global mutations.onError (App.jsx) already toasted the error.
    }
    toast.success('اپڈیٹ محفوظ ہو گئی');
    if (!isAdmin) {
      onClose();
      return;
    }
    // An admin stays: an empty form for the next reply (so the same one is never posted twice), the
    // percent as saved, a fresh attachment picker.
    reset({ description: '', completionPercent: saved?.task?.completionPercent ?? payload.completionPercent });
    setAttachment(null);
    setAttachmentStatus('idle');
    setAttachmentKey((prev) => prev + 1);
    setJustSaved(true);
  }

  // "کام بند کریں": what is typed decides what the close carries (see the comment above).
  async function startClose() {
    const values = getValues();
    const typed = String(values.description ?? '').trim();
    if (typed) {
      if (!(await trigger())) return;
      setCloseStep({ reply: { description: typed, completionPercent: Number(values.completionPercent), ...(attachment ? { attachment } : {}) } });
      return;
    }
    if (Number(values.completionPercent) !== (task?.completionPercent ?? 0) || attachment) {
      await trigger(); // the form's own messages; nothing is closed
      return;
    }
    setCloseStep({ reply: null });
  }

  async function handleCloseConfirm() {
    try {
      await closeTask.mutateAsync(closeStep.reply ?? undefined);
    } catch {
      return; // the global toast shows the error; the step and the draft stay for another try
    }
    onClose();
  }

  // The dialog's own dismissals (Escape, backdrop, ×): inside the close step they only leave the
  // step — never the dialog, so the draft is never lost — and not while the close is under way.
  function handleDismiss() {
    if (closeStep) {
      if (!closeTask.isPending) setCloseStep(null);
      return;
    }
    onClose();
  }

  // "نہیں" — leads to the close step, the exact same flow as the standalone Close Task button.
  function handleReassignNo() {
    setReassignStep(null);
    startClose();
  }

  async function handleReassignSave() {
    try {
      await reassignTask.mutateAsync({ assignees: [newAssigneeId] });
    } catch {
      return; // global mutations.onError (App.jsx) already toasted the error.
    }
    toast.success('ذمہ دار تبدیل کر دیا گیا');
    setReassignStep(null);
    setNewAssigneeId('');
    onClose();
  }

  // The task this dialog is about: its code as a pill, then its title.
  const taskBanner = (
    <div className="flex items-center gap-[10px] rounded-tk-tile bg-tk-hover px-[14px] py-[6px] text-[14px] leading-tk-label">
      <span className="shrink-0 rounded-tk-pill bg-tk-green-700 px-3 font-mono text-[13px] leading-[2.3] text-white">{task?.codeNumber}</span>
      <span aria-hidden="true">—</span>
      <span className="min-w-0 flex-1">{task?.title}</span>
    </div>
  );
  const sliderPercent = Number.isFinite(Number(completionPercent)) ? Math.min(Math.max(Number(completionPercent), 0), 100) : 0;

  const savedLine = (
    <p role="status" className="mt-3 flex items-center gap-2 rounded-tk-tile border border-tk-green-100 bg-tk-green-50 px-[14px] py-[8px] text-[13px] leading-tk-label text-tk-green-700">
      <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
      اپڈیٹ محفوظ ہو گئی
    </p>
  );

  // The close step: the existing confirmation, with the final reply it will carry (if any) shown
  // above it — labelled with the form's own field names.
  const reply = closeStep?.reply;
  const closeStepView = closeStep && (
    <div data-close-step className="flex flex-col gap-[14px]">
      {taskBanner}
      <p className="flex items-center gap-2 text-[15px] font-semibold leading-tk-label text-tk-danger">
        <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
        کام بند کریں
      </p>
      {reply && (
        <div data-final-reply className="flex flex-col gap-2 rounded-tk-tile border border-tk-line px-[14px] py-[10px] text-[14px] leading-tk-label text-tk-ink">
          <div>
            <span className={FIELD_LABEL}>تفصیل</span>
            <p className="whitespace-pre-wrap break-words">{reply.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-tk-ink-soft">تکمیل فیصد</span>
            <span className="font-semibold" dir="ltr">
              {reply.completionPercent}%
            </span>
          </div>
          {reply.attachment && (
            <div className="flex min-w-0 items-center gap-2 text-tk-ink-soft">
              <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{reply.attachment.fileName}</span>
            </div>
          )}
        </div>
      )}
      <p className="text-[15px] leading-tk-label text-tk-ink-soft">اس کام کو بند کرنے کے بعد کوئی نئی اپڈیٹ درج نہیں کی جا سکے گی۔ کیا واقعی بند کرنا چاہتے ہیں؟</p>
      <ModalFooter>
        <BusyButton onClick={handleCloseConfirm} busy={closeTask.isPending} className={`${BUTTON_DANGER} flex-1 font-semibold`}>
          ہاں، بند کریں
        </BusyButton>
        <button ref={stepCancelRef} type="button" onClick={() => setCloseStep(null)} disabled={closeTask.isPending} className={BUTTON_GHOST}>
          منسوخ کریں
        </button>
      </ModalFooter>
    </div>
  );

  // Desktop redesign (approved mockup "4 — کام اپڈیٹ کریں") — the look only: the task banner, the
  // تفصیل box, a styled slider kept in step with the number box beside it (they are two views of
  // the one form value, as before), the attachment picker as a dashed drop area (the same hidden
  // file input underneath), "پرانی اپڈیٹس دیکھیں" as a link, and a footer whose buttons wrap on a
  // narrow screen. The reassign and close-task steps behave exactly as they did.
  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} title="کام اپڈیٹ کریں" variant="redesign" icon={Pencil} subtitle="پیش رفت درج کریں" maxWidthClassName="max-w-[720px]">
      {isTaskLoading ? (
        <LoadingPhrase label="لوڈ ہو رہا ہے…" />
      ) : reassignStep ? (
        <div className="flex flex-col gap-[14px]">
          {taskBanner}

          {reassignStep === 'confirm' && (
            <>
              <p className="text-[15px] leading-tk-label text-tk-ink">کیا آپ یہ کام کسی دوسرے ذمہ دار کو دینا چاہتے ہیں؟</p>
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={handleReassignNo} className={BUTTON_GHOST}>
                  نہیں
                </button>
                <button type="button" onClick={() => setReassignStep('select')} className={BUTTON_PRIMARY}>
                  ہاں
                </button>
              </div>
            </>
          )}

          {reassignStep === 'select' && (
            <>
              <div>
                <label htmlFor="reassign-select" className={FIELD_LABEL}>
                  نیا ذمہ دار منتخب کریں
                </label>
                {assignableLoading ? (
                  <div className="rounded-tk-input border border-tk-line px-1 py-1">
                    <LoadingPhrase size="compact" />
                  </div>
                ) : (
                  <select id="reassign-select" value={newAssigneeId} onChange={(event) => setNewAssigneeId(event.target.value)} className={FIELD}>
                    <option value="">انتخاب کریں</option>
                    {(assignableUsers?.items || []).map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Read-only: shows the chosen person's own responsibility; the task's is not changed. */}
              {!assignableLoading && (
                <div>
                  <span className={FIELD_LABEL}>ذمہ داری</span>
                  <p aria-label="ذمہ داری" className="flex h-[48px] items-center rounded-tk-input border border-tk-line bg-tk-surface px-[14px] text-[14px] text-tk-ink-soft">
                    {newSelectedAssignee?.responsibility || '—'}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={() => setReassignStep(null)} className={BUTTON_GHOST}>
                  منسوخ کریں
                </button>
                <BusyButton onClick={handleReassignSave} busy={reassignTask.isPending} busyLabel="محفوظ ہو رہا ہے…" disabled={!newAssigneeId} className={BUTTON_PRIMARY}>
                  محفوظ کریں
                </BusyButton>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {closeStep ? closeStepView : taskBanner}
          {!closeStep && showSaved && savedLine}

          {/* Kept mounted (only hidden) while the close step is open, so the draft — text, percent
              and the attachment picker's own state — is exactly as it was when the admin returns. */}
          <form onSubmit={handleSubmit(onSubmit)} hidden={Boolean(closeStep)} className={clsx('mt-3 flex flex-col gap-3', closeStep && 'hidden')}>
            <div>
              <label htmlFor="update-description" className={FIELD_LABEL}>
                تفصیل
              </label>
              <textarea id="update-description" {...register('description')} rows={3} className={`${FIELD_TEXTAREA} resize-none`} />
              {errors.description && (
                <p role="alert" className={FIELD_ERROR}>
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="update-percent" className={FIELD_LABEL}>
                تکمیل فیصد
              </label>
              <div className="flex items-center gap-[14px]">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={completionPercent}
                  onChange={(event) => setValue('completionPercent', Number(event.target.value), { shouldValidate: true })}
                  disabled={percentFixedAt100}
                  aria-label="Completion % slider"
                  className="tk-range min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ '--tk-range': `${sliderPercent}%` }}
                />
                {/* readOnly, not disabled: a disabled field would be left out of the submitted values.
                    Both controls look inactive while the percent is fixed (dimmed, not-allowed cursor),
                    like a disabled button. */}
                <input
                  id="update-percent"
                  type="number"
                  min={0}
                  max={100}
                  readOnly={percentFixedAt100}
                  {...register('completionPercent', { valueAsNumber: true })}
                  className="h-[44px] w-[76px] shrink-0 rounded-tk-input border-[1.5px] border-transparent bg-tk-surface px-1 text-center text-[16px] font-semibold text-tk-ink focus:border-tk-green-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-tk-green-700/25 read-only:cursor-not-allowed read-only:opacity-45"
                />
              </div>
              {task?.status === 'complete' && (
                <p role="note" className="mt-2 rounded-tk-tile border border-tk-amber-line bg-tk-amber-bg px-[14px] py-[8px] text-[13px] leading-tk-label text-tk-amber-text">
                  {isAdmin ? REOPEN_WARNING : REOPEN_ADMIN_ONLY_NOTE}
                </p>
              )}
              {errors.completionPercent && (
                <p role="alert" className={FIELD_ERROR}>
                  {errors.completionPercent.message}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="min-w-[220px] flex-1">
                <AttachmentPicker
                  key={attachmentKey}
                  onStatusChange={(status, result) => {
                    setAttachmentStatus(status);
                    setAttachment(result);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className="flex h-[44px] w-fit shrink-0 items-center whitespace-nowrap text-[13px] font-semibold text-tk-green-700 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
              >
                {showHistory ? 'پرانی اپڈیٹس چھپائیں' : 'پرانی اپڈیٹس دیکھیں'}
              </button>
            </div>

            {showHistory && <PreviousUpdatesContent taskId={taskId} />}

            {/* Save grows to fill the row; the others keep their own width and the row wraps when
                there is no room. Reassign and close-task: Admin only, and never on a closed task. */}
            <ModalFooter>
              <BusyButton
                type="submit"
                busy={isSubmitting}
                busyLabel="محفوظ ہو رہا ہے…"
                disabled={attachmentStatus === 'uploading'}
                className={`${BUTTON_PRIMARY} min-w-[140px] flex-1`}
              >
                محفوظ کریں
              </BusyButton>
              <button type="button" onClick={onClose} className={BUTTON_GHOST}>
                منسوخ کریں
              </button>
              {canManageTask && (
                <>
                  <button type="button" onClick={() => setReassignStep('confirm')} className={BUTTON_AMBER}>
                    ذمہ دار تبدیل کریں
                  </button>
                  <button ref={closeButtonRef} type="button" onClick={startClose} disabled={attachmentStatus === 'uploading'} className={BUTTON_DANGER}>
                    کام بند کریں
                  </button>
                </>
              )}
            </ModalFooter>
          </form>
        </>
      )}
    </Modal>
  );
}

export default UpdateModal;
