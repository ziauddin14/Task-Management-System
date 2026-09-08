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
// Prompt — Close Task moved here (out of the table row) as a third footer button, next to
// Save/Cancel; still Admin-only and hidden once the task is already closed. onCloseTask is a
// thin trigger — DashboardPage.jsx owns the actual confirmation dialog + close mutation, same as
// before, so nothing about the underlying close flow itself changed.
function UpdateModal({ isOpen, onClose, taskId, isAdmin, onCloseTask }) {
  const { data: task, isLoading: isTaskLoading } = useTask(taskId);
  const createUpdate = useCreateTaskUpdate(taskId);
  const [attachmentStatus, setAttachmentStatus] = useState('idle');
  const [attachment, setAttachment] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  // Bumped on every open so AttachmentPicker remounts fresh (clears its own file/progress state)
  // rather than carrying a previous session's picked file into a new one.
  const [attachmentKey, setAttachmentKey] = useState(0);

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
  const canCloseTask = isAdmin && task && task.status !== 'closed';

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="کام اپڈیٹ کریں">
      {isTaskLoading ? (
        <Spinner label="لوڈ ہو رہا ہے…" />
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

            <div className={clsx('mt-2 flex flex-wrap items-center gap-2', canCloseTask ? 'justify-between' : 'justify-end')}>
              {canCloseTask && (
                <button
                  type="button"
                  onClick={onCloseTask}
                  className="h-10 min-w-[40px] rounded-lg border border-red-300 px-4 text-red-600 hover:bg-red-50"
                >
                  کام بند کریں
                </button>
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="h-10 min-w-[40px] rounded-lg px-4 text-gray-700 hover:bg-gray-100">
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || attachmentStatus === 'uploading'}
                  className="h-10 min-w-[40px] rounded-lg bg-brand px-4 text-white hover:bg-brand/90 disabled:opacity-50"
                >
                  محفوظ کریں
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

export default UpdateModal;
