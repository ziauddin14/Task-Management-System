import React, { useEffect, useRef, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Pencil } from 'lucide-react';
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
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { BUTTON_AMBER, BUTTON_DANGER, BUTTON_GHOST, BUTTON_PRIMARY, FIELD, FIELD_ERROR, FIELD_LABEL, FIELD_TEXTAREA } from '../../utils/uiClasses.js';

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
// Prompt — Close Task moved here (out of the table row) as a footer button, next to Save/Cancel;
// still Admin-only and hidden once the task is already closed. onCloseTask is a thin trigger —
// DashboardPage.jsx owns the actual confirmation dialog + close mutation, same as before, so
// nothing about the underlying close flow itself changed.
//
// Prompt — Change Assignee (reassign mid-task, without losing update history) added alongside
// it, same Admin-only/not-closed visibility rule. Its own inline "کیا آپ یہ کام کسی دوسرے ذمہ دار
// کو دینا چاہتے ہیں؟" step reuses onCloseTask DIRECTLY for the "نہیں" answer — same close
// flow as the standalone button, not a second copy of it. "ہاں" reveals a single-select dropdown
// (useAssignableUsers — the same source as the Naya Kaam form's assignee picker) and PATCHes the
// task via useUpdateTask with { assignees: [newId] } — a full replacement of the array (per
// client decision), which the backend's updateTaskFields already treats as an ordinary field
// patch: status/completionPercent/timeStatus and every existing TaskUpdate are left untouched.
function UpdateModal({ isOpen, onClose, taskId, isAdmin, onCloseTask }) {
  const { data: task, isLoading: isTaskLoading } = useTask(taskId);
  const createUpdate = useCreateTaskUpdate(taskId);
  const reassignTask = useUpdateTask(taskId);
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
  }, [isOpen, taskId]);

  // task starts undefined while useTask() is loading — this effect (separate from the one above,
  // which fires immediately on open before the fetch resolves) applies the real completionPercent
  // once the task data actually arrives, exactly once per open session.
  useEffect(() => {
    if (!isOpen || !task || initializedRef.current) return;
    reset({ description: '', completionPercent: task.completionPercent ?? 0 });
    initializedRef.current = true;
  }, [isOpen, task, reset]);

  const completionPercent = watch('completionPercent');
  // Same rule for both admin-only footer actions — neither makes sense once a task is terminal.
  const canManageTask = isAdmin && task && task.status !== 'closed';

  async function onSubmit(values) {
    const payload = { description: values.description, completionPercent: values.completionPercent };
    if (attachment) payload.attachment = attachment;
    try {
      await createUpdate.mutateAsync(payload);
    } catch {
      return; // global mutations.onError (App.jsx) already toasted the error.
    }
    toast.success('اپڈیٹ محفوظ ہو گئی');
    onClose();
  }

  // "نہیں" — reuses onCloseTask directly, the exact same trigger the standalone Close Task
  // button calls; DashboardPage's confirmation dialog + closeTask mutation handle the rest.
  function handleReassignNo() {
    setReassignStep(null);
    onCloseTask();
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

  // Desktop redesign (approved mockup "4 — کام اپڈیٹ کریں") — the look only: the task banner, the
  // تفصیل box, a styled slider kept in step with the number box beside it (they are two views of
  // the one form value, as before), the attachment picker as a dashed drop area (the same hidden
  // file input underneath), "پرانی اپڈیٹس دیکھیں" as a link, and a footer whose buttons wrap on a
  // narrow screen. The reassign and close-task steps behave exactly as they did.
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="کام اپڈیٹ کریں" variant="redesign" icon={Pencil} subtitle="پیش رفت درج کریں" maxWidthClassName="max-w-[720px]">
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
          {taskBanner}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-3 flex flex-col gap-3">
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
                  aria-label="Completion % slider"
                  className="tk-range min-w-0 flex-1"
                  style={{ '--tk-range': `${sliderPercent}%` }}
                />
                <input
                  id="update-percent"
                  type="number"
                  min={0}
                  max={100}
                  {...register('completionPercent', { valueAsNumber: true })}
                  className="h-[44px] w-[76px] shrink-0 rounded-tk-input border-[1.5px] border-transparent bg-tk-surface px-1 text-center text-[16px] font-semibold text-tk-ink focus:border-tk-green-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-tk-green-700/25"
                />
              </div>
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
                  <button type="button" onClick={onCloseTask} className={BUTTON_DANGER}>
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
