import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Bell, SquareCheckBig, UserRound, Users } from 'lucide-react';
import Modal, { ModalFooter } from '../common/Modal.jsx';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import BusyButton from '../common/BusyButton.jsx';
import NotificationHistoryPanel from './NotificationHistoryPanel.jsx';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch.js';
import { useAdminSendNotification } from '../../hooks/useAdminSendNotification.js';
import { useAdminSendTaskReminder } from '../../hooks/useAdminSendTaskReminder.js';
import { getTasks } from '../../services/tasks.api.js';
import { NOTIFICATION_TEMPLATES } from '../../utils/notificationTemplates.js';
import { BUTTON_GHOST, BUTTON_PRIMARY, FIELD, FIELD_LABEL, FIELD_TEXTAREA } from '../../utils/uiClasses.js';

// The three recipient choices, as they have always been (value + label); the icon and the one-line
// hint are what the card adds.
const RECIPIENT_OPTIONS = [
  { value: 'all', label: 'تمام ذمہ داران', hint: 'تمام فعال ذمہ داران کو', icon: Users },
  { value: 'user', label: 'مخصوص ذمہ دار', hint: 'ایک منتخب ذمہ دار کو', icon: UserRound },
  { value: 'task', label: 'مخصوص Task', hint: 'ایک کام کے ذمہ داران کو', icon: SquareCheckBig },
];

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

  // Desktop redesign (approved mockup "2 — نئی اطلاع بھیجیں") — the look only. The three recipient
  // choices are selectable cards, and each is still a real radio input: the input is visually
  // hidden, the card is its <label>, so the keyboard (arrow keys within the group), the form and a
  // screen reader see exactly the three radios they always did. The chosen card has a green
  // border, a tint and a filled dot. The card's one-line hint sits outside the label (tied to the
  // radio by aria-describedby), so each radio keeps its exact name.
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'یاددہانی بھیجیں' : 'نئی اطلاع بھیجیں'}
      variant="redesign"
      icon={Bell}
      subtitle={task ? 'اس کام کے ذمہ داران کو یاددہانی بھیجیں' : 'ذمہ داران کو یاددہانی یا پیغام بھیجیں'}
      maxWidthClassName="max-w-[720px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
        {task ? (
          <div className="flex items-center gap-[10px] rounded-tk-tile bg-tk-hover px-[14px] py-[6px] text-[14px] leading-tk-label">
            <span className="font-medium text-tk-ink-soft">کام:</span>
            <span className="shrink-0 rounded-tk-pill bg-tk-green-700 px-3 font-mono text-[13px] leading-[2.3] text-white">{task.codeNumber}</span>
            <span aria-hidden="true">—</span>
            <span className="min-w-0 flex-1">{task.title}</span>
          </div>
        ) : (
          <fieldset className="min-w-0">
            <legend className={FIELD_LABEL}>وصول کنندہ</legend>
            <div className="flex gap-3 max-md:flex-col">
              {RECIPIENT_OPTIONS.map((option) => {
                const selected = recipientType === option.value;
                return (
                  <div key={option.value} className="relative min-w-0 flex-1">
                    <input
                      type="radio"
                      id={`recipient-${option.value}`}
                      name="recipientType"
                      checked={selected}
                      onChange={() => setRecipientType(option.value)}
                      aria-describedby={`recipient-${option.value}-hint`}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor={`recipient-${option.value}`}
                      data-recipient-card={option.value}
                      data-selected={selected || undefined}
                      className={clsx(
                        'flex h-full min-h-[104px] cursor-pointer flex-col gap-[2px] rounded-[18px] border-2 px-[14px] pb-[34px] pt-3 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tk-green-700',
                        selected ? 'border-tk-green-700 bg-tk-hover' : 'border-tk-line bg-white hover:bg-tk-surface'
                      )}
                    >
                      <span aria-hidden="true" className="flex items-center justify-between">
                        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-tk-chip bg-tk-closed-tint text-tk-green-700">
                          <option.icon className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <span className={clsx('flex h-[22px] w-[22px] items-center justify-center rounded-full border-2', selected ? 'border-tk-green-700' : 'border-tk-line-btn')}>
                          {selected && <span data-recipient-dot className="h-[10px] w-[10px] rounded-full bg-tk-green-700" />}
                        </span>
                      </span>
                      <span className="text-[15px] font-semibold leading-tk-title">{option.label}</span>
                    </label>
                    <p id={`recipient-${option.value}-hint`} className="pointer-events-none absolute inset-x-4 bottom-[10px] truncate text-[12px] leading-[1.9] text-tk-muted">
                      {option.hint}
                    </p>
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}

        {!task && recipientType === 'user' && (
          <div>
            <label htmlFor="notification-user-select" className={FIELD_LABEL}>
              ذمہ دار منتخب کریں
            </label>
            {usersLoading ? (
              <div className="rounded-tk-input border border-tk-line px-1 py-1">
                <LoadingPhrase size="compact" />
              </div>
            ) : (
              <select id="notification-user-select" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className={FIELD}>
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
            <label htmlFor="notification-task-search" className={FIELD_LABEL}>
              کام تلاش کریں
            </label>
            {selectedTask ? (
              <div className="flex min-h-[48px] items-center justify-between gap-2 rounded-tk-input border-[1.5px] border-tk-green-700/30 bg-tk-hover px-[14px] py-1 text-[14px] leading-tk-label">
                <span className="truncate">
                  <span className="font-mono">{selectedTask.codeNumber}</span> — {selectedTask.title}
                </span>
                <button type="button" onClick={() => setSelectedTask(null)} className="flex min-h-[40px] shrink-0 items-center text-[13px] font-semibold text-tk-green-700 underline-offset-4 hover:underline">
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
                  className={FIELD}
                />
                {debouncedTaskSearch.trim().length > 0 && (
                  <div className="mt-[6px] max-h-[176px] overflow-y-auto rounded-tk-input border border-tk-line">
                    {taskSearchQuery.isLoading ? (
                      <div className="px-1 py-1">
                        <LoadingPhrase size="compact" />
                      </div>
                    ) : (taskSearchQuery.data?.items || []).length === 0 ? (
                      <p className="px-3 py-3 text-center text-[12px] text-tk-muted">کوئی کام نہیں ملا</p>
                    ) : (
                      taskSearchQuery.data.items.map((foundTask) => (
                        <button
                          key={foundTask.id}
                          type="button"
                          onClick={() => setSelectedTask(foundTask)}
                          className="flex h-[44px] w-full items-center justify-between gap-2 border-b border-tk-line-row px-3 text-start text-[14px] last:border-b-0 hover:bg-tk-hover"
                        >
                          <span className="truncate">{foundTask.title}</span>
                          <span className="shrink-0 font-mono text-[12px] text-tk-muted">{foundTask.codeNumber}</span>
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
          <p className="rounded-tk-chip bg-tk-hover px-3 py-[6px] text-[12px] leading-tk-label text-tk-green-900">
            یہ اطلاع اس کام کے تمام فعال ذمہ داران کو بھیجی جائے گی۔
          </p>
        )}

        <div>
          <label htmlFor="notification-template" className={FIELD_LABEL}>
            پیغام کا ٹیمپلیٹ
          </label>
          <select id="notification-template" value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} className={FIELD}>
            <option value="">کوئی ٹیمپلیٹ منتخب نہیں</option>
            {NOTIFICATION_TEMPLATES.map((template) => (
              <option key={template.key} value={template.key}>
                {template.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="notification-custom-message" className={FIELD_LABEL}>
            اپنا پیغام لکھیں
          </label>
          <textarea
            id="notification-custom-message"
            value={customMessage}
            onChange={(event) => setCustomMessage(event.target.value)}
            rows={4}
            placeholder="اختیاری — یہاں لکھا پیغام منتخب کردہ ٹیمپلیٹ کی بجائے استعمال ہوگا"
            className={`${FIELD_TEXTAREA} resize-none`}
          />
        </div>

        {!task && (
          <>
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="flex h-10 w-fit items-center text-[13px] font-semibold text-tk-green-700 underline underline-offset-4"
            >
              {showHistory ? 'بھیجنے کی سرگزشت چھپائیں' : 'بھیجنے کی سرگزشت دیکھیں'}
            </button>
            {showHistory && <NotificationHistoryPanel />}
          </>
        )}

        {/* The send button keeps its rule (canSubmit) and its busy state; it is dimmed while it
            cannot be used. */}
        <ModalFooter>
          <BusyButton type="submit" busy={isPending} busyLabel="بھیجا جا رہا ہے۔۔۔" disabled={!canSubmit} className={`${BUTTON_PRIMARY} flex-1`}>
            اطلاع بھیجیں
          </BusyButton>
          <button type="button" onClick={onClose} className={BUTTON_GHOST}>
            منسوخ کریں
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default SendNotificationDialog;
