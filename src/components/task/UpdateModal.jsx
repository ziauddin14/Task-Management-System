import React, { useEffect, useRef, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import Spinner from '../common/Spinner.jsx';
import AttachmentPicker from './AttachmentPicker.jsx';
import PreviousUpdatesContent from './PreviousUpdatesContent.jsx';
import { useTask } from '../../hooks/useTask.js';
import { useCreateTaskUpdate } from '../../hooks/useCreateTaskUpdate.js';
import { useUpdateTask } from '../../hooks/useUpdateTask.js';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="کام اپڈیٹ کریں">
      {isTaskLoading ? (
        <Spinner label="لوڈ ہو رہا ہے…" />
      ) : reassignStep ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
            <span className="font-mono">{task?.codeNumber}</span> — <span>{task?.title}</span>
          </div>

          {reassignStep === 'confirm' && (
            <>
              <p className="text-gray-800">کیا آپ یہ کام کسی دوسرے ذمہ دار کو دینا چاہتے ہیں؟</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReassignNo}
                  className="h-10 min-w-[40px] rounded-lg border border-gray-300 px-4 text-gray-700 hover:bg-gray-50"
                >
                  نہیں
                </button>
                <button
                  type="button"
                  onClick={() => setReassignStep('select')}
                  className="h-10 min-w-[40px] rounded-lg bg-brand px-4 text-white hover:bg-brand/90"
                >
                  ہاں
                </button>
              </div>
            </>
          )}

          {reassignStep === 'select' && (
            <>
              <div>
                <label htmlFor="reassign-select" className="mb-1 block text-sm font-medium text-gray-700">
                  نیا ذمہ دار منتخب کریں
                </label>
                {assignableLoading ? (
                  <p className="rounded-lg border border-gray-200 px-2 py-3 text-center text-xs text-gray-500">
                    لوڈ ہو رہا ہے…
                  </p>
                ) : (
                  <select
                    id="reassign-select"
                    value={newAssigneeId}
                    onChange={(event) => setNewAssigneeId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm"
                  >
                    <option value="">انتخاب کریں</option>
                    {(assignableUsers?.items || []).map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Prompt — read-only, auto-filled from the selected person's own User.responsibility
                  (the same field already stored per-user, e.g. TaskFormModal's own responsibility
                  options) — never a separate input, nothing new to select here. */}
              {!assignableLoading && (
                <div>
                  {/* A plain span, not <label> — this isn't a form control, just read-only display
                      text, so it shouldn't claim form-labeling semantics it doesn't have. */}
                  <span className="mb-1 block text-sm font-medium text-gray-700">ذمہ داری</span>
                  <p
                    aria-label="ذمہ داری"
                    className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-2 text-sm text-gray-600"
                  >
                    {newSelectedAssignee?.responsibility || '—'}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReassignStep(null)}
                  className="h-10 min-w-[40px] rounded-lg px-4 text-gray-700 hover:bg-gray-100"
                >
                  منسوخ کریں
                </button>
                <button
                  type="button"
                  onClick={handleReassignSave}
                  disabled={!newAssigneeId || reassignTask.isPending}
                  className="h-10 min-w-[40px] rounded-lg bg-brand px-4 text-white hover:bg-brand/90 disabled:opacity-50"
                >
                  محفوظ کریں
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
            <span className="font-mono">{task?.codeNumber}</span> — <span>{task?.title}</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div>
              <label htmlFor="update-description" className="mb-1 block text-sm font-medium text-gray-700">
                تفصیل
              </label>
              <textarea
                id="update-description"
                {...register('description')}
                rows={3}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
              {errors.description && (
                <p role="alert" className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="update-percent" className="mb-1 block text-sm font-medium text-gray-700">
                تکمیل فیصد
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={completionPercent}
                  onChange={(event) => setValue('completionPercent', Number(event.target.value), { shouldValidate: true })}
                  aria-label="Completion % slider"
                  className="flex-1"
                />
                <input
                  id="update-percent"
                  type="number"
                  min={0}
                  max={100}
                  {...register('completionPercent', { valueAsNumber: true })}
                  className="h-10 w-20 rounded-lg border border-gray-300 px-2"
                />
              </div>
              {errors.completionPercent && (
                <p role="alert" className="mt-1 text-sm text-red-600">
                  {errors.completionPercent.message}
                </p>
              )}
            </div>

            <AttachmentPicker
              key={attachmentKey}
              onStatusChange={(status, result) => {
                setAttachmentStatus(status);
                setAttachment(result);
              }}
            />

            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="flex h-10 w-fit items-center text-sm text-brand hover:underline"
            >
              {showHistory ? 'پرانی اپڈیٹس چھپائیں' : 'پرانی اپڈیٹس دیکھیں'}
            </button>

            {showHistory && <PreviousUpdatesContent taskId={taskId} />}

            {/* Prompt — all (up to) 4 actions in a single non-wrapping row, at every viewport
                width. CSS Grid, not flexbox: Tailwind's grid-cols-N utilities emit
                `minmax(0, 1fr)` tracks, which have a genuine zero min-width floor — a plain flex
                `flex-1` item's automatic minimum width is its own min-content size (roughly the
                longest unbreakable run of text), which can silently force the row (and the modal
                around it) wider than the viewport despite `min-w-0` on the item itself. Grid
                sidesteps that whole class of overflow bug outright. The label itself is still
                free to wrap to a second line on the narrowest phones; color alone carries the
                primary/secondary/warning/danger hierarchy. */}
            <div className={clsx('mt-2 grid gap-1.5', canManageTask ? 'grid-cols-4' : 'grid-cols-2')}>
              <button
                type="button"
                onClick={onClose}
                className="h-11 min-w-0 rounded-lg px-1 text-center text-xs font-semibold leading-tight text-gray-700 hover:bg-gray-100 sm:text-sm"
              >
                منسوخ کریں
              </button>
              <button
                type="submit"
                disabled={isSubmitting || attachmentStatus === 'uploading'}
                className="h-11 min-w-0 rounded-lg bg-brand px-1 text-center text-xs font-semibold leading-tight text-white hover:bg-brand/90 disabled:opacity-50 sm:text-sm"
              >
                محفوظ کریں
              </button>
              {canManageTask && (
                <>
                  <button
                    type="button"
                    onClick={() => setReassignStep('confirm')}
                    className="h-11 min-w-0 rounded-lg border border-amber-300 px-1 text-center text-[11px] font-medium leading-tight text-amber-700 hover:bg-amber-50 sm:text-xs"
                  >
                    ذمہ دار تبدیل کریں
                  </button>
                  <button
                    type="button"
                    onClick={onCloseTask}
                    className="h-11 min-w-0 rounded-lg border border-red-300 px-1 text-center text-[11px] font-medium leading-tight text-red-600 hover:bg-red-50 sm:text-xs"
                  >
                    کام بند کریں
                  </button>
                </>
              )}
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

export default UpdateModal;
