import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import NotificationHistoryPanel from './NotificationHistoryPanel.jsx';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch.js';
import { useAdminSendNotification } from '../../hooks/useAdminSendNotification.js';
import { useAdminSendTaskReminder } from '../../hooks/useAdminSendTaskReminder.js';
import { getTasks } from '../../services/tasks.api.js';
import { NOTIFICATION_TEMPLATES } from '../../utils/notificationTemplates.js';

// Locked blueprint §Phase 2/§8-9 — the one manual-notification composer backing all three flows.
// `task` (optional): when supplied (the TaskTable row's "یاددہانی بھیجیں" action), the dialog opens
// directly in Flow C, LOCKED to that specific task — no recipient-type picker, no task search, the
// admin never re-selects what's already known from context. When omitted (the Dashboard header's
// "نئی اطلاع بھیجیں" button), all three recipient types are offered, including a task search for
// Flow C's general entry point.
function SendNotificationDialog({ isOpen, onClose, task }) {
  const [recipientType, setRecipientType] = useState(task ? 'task' : 'all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskSearchInput, setTaskSearchInput, debouncedTaskSearch] = useDebouncedSearch('');
  const [templateKey, setTemplateKey] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { data: users, isLoading: usersLoading } = useAssignableUsers({ enabled: isOpen && recipientType === 'user' });
  // Local, dialog-only task search — deliberately not routed through hooks/useTasks.js (the
  // Dashboard table's own hook has no `enabled` gate, and this picker's needs — a handful of
  // results, gated on a non-empty query — don't belong bolted onto that shared hook).
  const taskSearchQuery = useQuery({
    queryKey: ['tasks', { search: debouncedTaskSearch, limit: 10, page: 1 }],
    queryFn: () => getTasks({ search: debouncedTaskSearch, limit: 10, page: 1 }),
    enabled: isOpen && recipientType === 'task' && !task && debouncedTaskSearch.trim().length > 0,
  });

  const sendNotification = useAdminSendNotification();
  const sendTaskReminder = useAdminSendTaskReminder();
  const isPending = sendNotification.isPending || sendTaskReminder.isPending;

  useEffect(() => {
    if (!isOpen) return;
    setRecipientType(task ? 'task' : 'all');
    setSelectedUserId('');
    setSelectedTask(null);
    setTaskSearchInput('');
    setTemplateKey('');
    setCustomMessage('');
    setShowHistory(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open/task-identity change
  }, [isOpen, task?.id]);

  const effectiveTask = task || selectedTask;
  const hasContent = Boolean(templateKey) || customMessage.trim().length > 0;
  const hasEligibleRecipient =
    recipientType === 'all' ||
    (recipientType === 'user' && Boolean(selectedUserId)) ||
    (recipientType === 'task' && Boolean(effectiveTask));
  const canSubmit = hasContent && hasEligibleRecipient && !isPending;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return; // also guards against double-submit while isPending

    const content = { templateKey: templateKey || undefined, message: customMessage.trim() || undefined };
    try {
      if (recipientType === 'all') {
        await sendNotification.mutateAsync({ recipientType: 'all', ...content });
      } else if (recipientType === 'user') {
        await sendNotification.mutateAsync({ recipientType: 'user', userId: selectedUserId, ...content });
      } else {
        await sendTaskReminder.mutateAsync({ taskId: effectiveTask.id, payload: content });
      }
    } catch {
      return; // global mutations.onError (App.jsx) already toasted the error — keep the dialog
      // open with everything the admin typed still intact, per the locked blueprint's explicit
      // "do not silently reset user input" requirement.
    }
    toast.success('اطلاع بھیج دی گئی');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'یاددہانی بھیجیں' : 'نئی اطلاع بھیجیں'} maxWidthClassName="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {task ? (
          <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
            <span className="font-medium text-gray-700">کام:</span> <span className="font-mono">{task.codeNumber}</span> —{' '}
            <span>{task.title}</span>
          </div>
        ) : (
          <fieldset>
            <legend className="mb-1 block text-sm font-medium text-gray-700">وصول کنندہ</legend>
            <div className="flex flex-col gap-1.5">
              <label className="flex h-10 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'all'}
                  onChange={() => setRecipientType('all')}
                />
                تمام ذمہ داران
              </label>
              <label className="flex h-10 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'user'}
                  onChange={() => setRecipientType('user')}
                />
                مخصوص ذمہ دار
              </label>
              <label className="flex h-10 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'task'}
                  onChange={() => setRecipientType('task')}
                />
                مخصوص Task
              </label>
            </div>
          </fieldset>
        )}

        {!task && recipientType === 'user' && (
          <div>
            <label htmlFor="notification-user-select" className="mb-1 block text-sm font-medium text-gray-700">
              ذمہ دار منتخب کریں
            </label>
            {usersLoading ? (
              <p className="rounded-lg border border-gray-200 px-2 py-3 text-center text-xs text-gray-500">لوڈ ہو رہا ہے…</p>
            ) : (
              <select
                id="notification-user-select"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm"
              >
                <option value="">انتخاب کریں</option>
                {(users?.items || []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {!task && recipientType === 'task' && (
          <div>
            <label htmlFor="notification-task-search" className="mb-1 block text-sm font-medium text-gray-700">
              کام تلاش کریں
            </label>
            {selectedTask ? (
              <div className="flex items-center justify-between rounded-lg border border-brand/30 bg-brand-light/40 px-2 py-2 text-sm">
                <span className="truncate">
                  <span className="font-mono">{selectedTask.codeNumber}</span> — {selectedTask.title}
                </span>
                <button type="button" onClick={() => setSelectedTask(null)} className="shrink-0 text-xs text-brand hover:underline">
                  تبدیل کریں
                </button>
              </div>
            ) : (
              <>
                <input
                  id="notification-task-search"
                  type="text"
                  value={taskSearchInput}
                  onChange={(event) => setTaskSearchInput(event.target.value)}
                  placeholder="کام کا عنوان یا کوڈ نمبر…"
                  className="mb-1 h-10 w-full rounded-lg border border-gray-300 px-2 text-sm"
                />
                {debouncedTaskSearch.trim().length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200">
                    {taskSearchQuery.isLoading ? (
                      <p className="px-2 py-3 text-center text-xs text-gray-500">لوڈ ہو رہا ہے…</p>
                    ) : (taskSearchQuery.data?.items || []).length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-gray-500">کوئی کام نہیں ملا</p>
                    ) : (
                      taskSearchQuery.data.items.map((foundTask) => (
                        <button
                          key={foundTask.id}
                          type="button"
                          onClick={() => setSelectedTask(foundTask)}
                          className="flex h-10 w-full items-center justify-between gap-2 px-2 text-start text-sm hover:bg-gray-50"
                        >
                          <span className="truncate">{foundTask.title}</span>
                          <span className="shrink-0 font-mono text-xs text-gray-500">{foundTask.codeNumber}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {recipientType === 'task' && effectiveTask && (
          <p className="rounded-lg bg-brand-light/40 px-2 py-2 text-xs text-brand">
            یہ اطلاع اس کام کے تمام فعال ذمہ داران کو بھیجی جائے گی۔
          </p>
        )}

        <div>
          <label htmlFor="notification-template" className="mb-1 block text-sm font-medium text-gray-700">
            پیغام کا ٹیمپلیٹ
          </label>
          <select
            id="notification-template"
            value={templateKey}
            onChange={(event) => setTemplateKey(event.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 px-2 text-sm"
          >
            <option value="">کوئی ٹیمپلیٹ منتخب نہیں</option>
            {NOTIFICATION_TEMPLATES.map((template) => (
              <option key={template.key} value={template.key}>
                {template.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="notification-custom-message" className="mb-1 block text-sm font-medium text-gray-700">
            اپنا پیغام لکھیں
          </label>
          <textarea
            id="notification-custom-message"
            value={customMessage}
            onChange={(event) => setCustomMessage(event.target.value)}
            rows={3}
            placeholder="اختیاری — یہاں لکھا پیغام منتخب کردہ ٹیمپلیٹ کی بجائے استعمال ہوگا"
            className="w-full rounded-lg border border-gray-300 p-2 text-sm"
          />
        </div>

        <div className="mt-1 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-lg text-base font-semibold text-gray-700 hover:bg-gray-100"
          >
            منسوخ کریں
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-12 rounded-lg bg-brand text-base font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {isPending ? 'بھیجا جا رہا ہے۔۔۔' : 'اطلاع بھیجیں'}
          </button>
        </div>

        {!task && (
          <>
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="flex h-10 w-fit items-center text-sm text-brand hover:underline"
            >
              {showHistory ? 'بھیجنے کی سرگزشت چھپائیں' : 'بھیجنے کی سرگزشت دیکھیں'}
            </button>
            {showHistory && <NotificationHistoryPanel />}
          </>
        )}
      </form>
    </Modal>
  );
}

export default SendNotificationDialog;
