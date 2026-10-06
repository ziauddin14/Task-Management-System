import React, { useEffect, useMemo, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Pencil, Plus, Search } from 'lucide-react';
import Modal, { ModalFooter } from '../common/Modal.jsx';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import BusyButton from '../common/BusyButton.jsx';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { useCreateTask } from '../../hooks/useCreateTask.js';
import { useUpdateTask } from '../../hooks/useUpdateTask.js';
import { BUTTON_GHOST, BUTTON_PRIMARY, FIELD, FIELD_ERROR, FIELD_LABEL, FIELD_TEXTAREA } from '../../utils/uiClasses.js';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// docs/09-frontend-features.md §2, §10 — zod schema mirroring the backend validator
// (backend/src/validators/task.validator.js) field-for-field: title/responsibility min(1),
// assignees min 1 entry, deadline required. NOTE (contradiction, reported per standing process
// rule rather than silently resolved): docs/09-frontend-features.md §2's field table states title
// must be "3–500 chars", but the actual approved backend validator only enforces
// `z.string().trim().min(1, ...)` with no upper bound. This schema mirrors the real backend
// behavior (min 1, no max) rather than the doc's stricter figure, since a stricter client-side
// rule than the server's would falsely reject input the server would accept — see Phase 10.3
// report section F.
//
// Past-deadline rejection applies in create mode ONLY (docs/09-frontend-features.md §2: editing an
// existing task's deadline to a past date is still allowed).
function buildSchema(mode) {
  return z.object({
    title: z.string().trim().min(1, 'Title is required'),
    assignees: z.array(z.string().min(1)).min(1, 'At least one assignee is required'),
    responsibility: z.string().trim().min(1, 'Responsibility is required'),
    deadline: z
      .string()
      .min(1, 'A valid deadline date is required')
      .refine((value) => {
        if (mode !== 'create') return true;
        return startOfDay(value) >= startOfDay(new Date());
      }, 'آخری تاریخ آج یا اس کے بعد کی ہونی چاہیے'),
  });
}

function TaskFormModal({ isOpen, onClose, mode, task }) {
  const isEdit = mode === 'edit';
  const schema = useMemo(() => buildSchema(mode), [mode]);
  const { data: users, isLoading: usersLoading, isError: usersError } = useAssignableUsers();
  // Prompt 3C — Responsibility is no longer sourced from the separate LookupList collection.
  // Derived client-side from the same active-Users data already fetched for the assignee picker
  // above (useAssignableUsers), rather than a dedicated endpoint: at this data scale (a handful of
  // users) a client-side [...new Set(...)] is simpler than adding backend work, avoids a second
  // network round-trip, and automatically stays in sync with whatever responsibility values are
  // actually in use — new values just need to exist on at least one active User.
  const responsibilityOptions = useMemo(() => {
    const values = (users?.items || []).map((person) => person.responsibility).filter(Boolean);
    // Editing a task whose stored responsibility text no longer matches any active user (it's
    // free text now, so nothing keeps it in sync) must still show that value selected, not silently
    // swap it to blank — so it's included even though no current user carries it.
    if (isEdit && task?.responsibility) values.push(task.responsibility);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [users, isEdit, task]);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask(task?.id);
  const mutation = isEdit ? updateTask : createTask;
  const [assigneeSearch, setAssigneeSearch] = useState('');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: '', assignees: [], responsibility: '', deadline: '' },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && task) {
      reset({
        title: task.title,
        assignees: (task.assignees || []).map((person) => person.id),
        responsibility: task.responsibility,
        deadline: task.deadline ? task.deadline.slice(0, 10) : '',
      });
    } else {
      reset({ title: '', assignees: [], responsibility: '', deadline: '' });
    }
    setAssigneeSearch('');
  }, [isOpen, isEdit, task, reset]);

  async function onSubmit(values) {
    const payload = {
      title: values.title,
      assignees: values.assignees,
      responsibility: values.responsibility,
      deadline: values.deadline,
    };
    try {
      await mutation.mutateAsync(payload);
    } catch {
      return; // global mutations.onError (App.jsx) already toasted the error.
    }
    // docs/09-frontend-features.md §2 — exact wording specified only for create; edit mode isn't
    // given a documented string, so a plain confirmation is used there instead.
    toast.success(isEdit ? 'کام اپڈیٹ ہو گیا' : 'کام کامیابی سے بنا دیا گیا');
    onClose();
  }

  const filteredUsers = (users?.items || []).filter((person) =>
    person.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  // Desktop redesign (approved mockup "1 — نیا کام") — the look only. The title on top; under it
  // two columns: the ذمہ دار picker (the chosen people as removable chips, a search box, then a
  // checklist where each row is an initial, the name and a checkbox, tinted when chosen), and
  // beside it ذمہ داری and آخری تاریخ. Below 768px the columns stack and the dialog is a bottom sheet.
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'کام میں ترمیم کریں' : 'نیا کام'}
      variant="redesign"
      icon={isEdit ? Pencil : Plus}
      subtitle={isEdit ? 'کام کی تفصیل اور ذمہ داران میں تبدیلی کریں' : 'کام کی تفصیل اور ذمہ داران منتخب کریں'}
      maxWidthClassName="max-w-[760px]"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div>
          <label htmlFor="task-title" className={FIELD_LABEL}>
            کام کا عنوان
          </label>
          <textarea id="task-title" {...register('title')} rows={3} className={`${FIELD_TEXTAREA} resize-none`} />
          {errors.title && (
            <p role="alert" className={FIELD_ERROR}>
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-x-[18px] gap-y-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>
            <label className={FIELD_LABEL} htmlFor="assignee-search">
              ذمہ دار
            </label>
            <Controller
              control={control}
              name="assignees"
              render={({ field }) => (
                <div>
                  <div className="flex flex-wrap gap-[6px] pb-[6px] empty:hidden">
                    {field.value.map((id) => {
                      const person = (users?.items || []).find((u) => u.id === id);
                      if (!person) return null;
                      return (
                        <span
                          key={id}
                          className="flex h-[34px] items-center rounded-tk-pill bg-tk-closed-tint ps-3 text-[13px] leading-tk-label text-tk-closed-ink max-md:h-tk-touch"
                        >
                          {person.name}
                          <button
                            type="button"
                            onClick={() => field.onChange(field.value.filter((v) => v !== id))}
                            aria-label={`${person.name} ہٹا دیں`}
                            className="flex h-full w-[32px] items-center justify-center rounded-tk-pill text-[16px] hover:bg-tk-closed-chip focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700 max-md:w-tk-touch"
                          >
                            &times;
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex h-[44px] items-center gap-2 rounded-tk-input bg-tk-surface px-[14px] focus-within:ring-2 focus-within:ring-tk-green-700">
                    <Search className="h-[18px] w-[18px] shrink-0 text-tk-muted" aria-hidden="true" />
                    <input
                      id="assignee-search"
                      type="text"
                      value={assigneeSearch}
                      onChange={(event) => setAssigneeSearch(event.target.value)}
                      placeholder="تلاش…"
                      className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14px] text-tk-ink placeholder:text-tk-muted focus:outline-none"
                    />
                  </div>
                  {/* The checklist only renders once the user list itself has actually loaded — an
                      EMPTY list here always means "search matched nothing", never "still loading". */}
                  {usersLoading ? null : usersError ? (
                    <p className="mt-[6px] rounded-tk-input border border-tk-danger-line bg-tk-danger-bg px-3 py-3 text-center text-[12px] text-tk-danger">
                      یوزرز لوڈ نہیں ہو سکے
                    </p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="mt-[6px] rounded-tk-input border border-tk-line px-3 py-3 text-center text-[12px] text-tk-muted">کوئی یوزر نہیں ملا</p>
                  ) : (
                    <div className="mt-[6px] max-h-[176px] overflow-y-auto rounded-tk-input border border-tk-line">
                      {filteredUsers.map((person) => {
                        const checked = field.value.includes(person.id);
                        return (
                          <label
                            key={person.id}
                            className={clsx(
                              'flex h-[44px] cursor-pointer items-center gap-[10px] border-b border-tk-line-row px-3 text-[14px] last:border-b-0',
                              checked ? 'bg-tk-hover font-semibold' : 'hover:bg-tk-surface'
                            )}
                          >
                            {/* The initial is drawn from data-initial (styles/tokens.css), so the
                                label's own text — the checkbox's name — is the person's name alone. */}
                            <span
                              aria-hidden="true"
                              data-initial={person.name.trim().charAt(0)}
                              className={clsx(
                                'tk-initial flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-[12px] font-normal',
                                checked ? 'bg-tk-green-700 text-white' : 'bg-tk-green-50 text-tk-green-900'
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate leading-tk-title">{person.name}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                field.onChange(
                                  checked ? field.value.filter((v) => v !== person.id) : [...field.value, person.id]
                                )
                              }
                              className="h-5 w-5 shrink-0 accent-tk-green-700"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            />
            {errors.assignees && (
              <p role="alert" className={FIELD_ERROR}>
                {errors.assignees.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="task-responsibility" className={FIELD_LABEL}>
                ذمہ داری
              </label>
              {/* Options are the distinct responsibility values already on the assignable users
                  (role=user, active) — the same list the ذمہ دار picker shows. */}
              <select id="task-responsibility" {...register('responsibility')} disabled={usersLoading} className={FIELD}>
                <option value="">انتخاب کریں</option>
                {responsibilityOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {!usersLoading && !usersError && responsibilityOptions.length === 0 && (
                <p className="mt-1 text-[12px] leading-tk-label text-tk-muted">کوئی ذمہ داری نہیں ملی</p>
              )}
              {errors.responsibility && (
                <p role="alert" className={FIELD_ERROR}>
                  {errors.responsibility.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="task-deadline" className={FIELD_LABEL}>
                آخری تاریخ
              </label>
              <input id="task-deadline" type="date" {...register('deadline')} className={FIELD} />
              {errors.deadline && (
                <p role="alert" className={FIELD_ERROR}>
                  {errors.deadline.message}
                </p>
              )}
            </div>
          </div>

          {/* While the user list loads, the loading phrase takes a row of its own under the
              fields (it needs the full width to stay readable). */}
          {usersLoading && (
            <div className="rounded-tk-input border border-tk-line px-1 py-1 md:col-span-2">
              <LoadingPhrase size="compact" />
            </div>
          )}
        </div>

        <ModalFooter>
          <BusyButton type="submit" busy={isSubmitting} busyLabel="محفوظ ہو رہا ہے…" className={`${BUTTON_PRIMARY} flex-1`}>
            محفوظ کریں
          </BusyButton>
          <button type="button" onClick={onClose} className={BUTTON_GHOST}>
            منسوخ کریں
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default TaskFormModal;
