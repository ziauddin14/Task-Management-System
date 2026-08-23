import React, { useEffect, useMemo, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { useLookupList } from '../../hooks/useLookupList.js';
import { useCreateTask } from '../../hooks/useCreateTask.js';
import { useUpdateTask } from '../../hooks/useUpdateTask.js';

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
      }, 'Deadline aaj ya us ke baad honi chahiye'),
  });
}

function TaskFormModal({ isOpen, onClose, mode, task }) {
  const isEdit = mode === 'edit';
  const schema = useMemo(() => buildSchema(mode), [mode]);
  const { data: users } = useAssignableUsers();
  const { data: responsibilities } = useLookupList('responsibility');
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
    toast.success(isEdit ? 'Kaam update ho gaya' : 'Kaam kamyabi se bana diya gaya');
    onClose();
  }

  const filteredUsers = (users?.items || []).filter((person) =>
    person.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Kaam Edit Karein' : 'Naya Kaam'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div>
          <label htmlFor="task-title" className="mb-1 block text-sm font-medium text-gray-700">
            Kaam (Title)
          </label>
          <textarea id="task-title" {...register('title')} rows={3} className="w-full rounded-lg border border-gray-300 p-2" />
          {errors.title && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors.title.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="assignee-search">
            Zimmedar(an)
          </label>
          <Controller
            control={control}
            name="assignees"
            render={({ field }) => (
              <div>
                <div className="mb-1 flex flex-wrap gap-1">
                  {field.value.map((id) => {
                    const person = (users?.items || []).find((u) => u.id === id);
                    if (!person) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-xs text-brand"
                      >
                        {person.name}
                        <button
                          type="button"
                          onClick={() => field.onChange(field.value.filter((v) => v !== id))}
                          aria-label={`${person.name} hataayein`}
                        >
                          &times;
                        </button>
                      </span>
                    );
                  })}
                </div>
                <input
                  id="assignee-search"
                  type="text"
                  value={assigneeSearch}
                  onChange={(event) => setAssigneeSearch(event.target.value)}
                  placeholder="Naam talaash karein…"
                  className="mb-1 h-10 w-full rounded-lg border border-gray-300 px-2"
                />
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200">
                  {filteredUsers.map((person) => {
                    const checked = field.value.includes(person.id);
                    return (
                      <label key={person.id} className="flex h-10 items-center gap-2 px-2 text-sm hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              checked ? field.value.filter((v) => v !== person.id) : [...field.value, person.id]
                            )
                          }
                        />
                        {person.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          />
          {errors.assignees && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors.assignees.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="task-responsibility" className="mb-1 block text-sm font-medium text-gray-700">
            Zimmedari
          </label>
          <select
            id="task-responsibility"
            {...register('responsibility')}
            className="h-10 w-full rounded-lg border border-gray-300 px-2"
          >
            <option value="">Intekhab karein</option>
            {(responsibilities || []).map((entry) => (
              <option key={entry.id} value={entry.value}>
                {entry.value}
              </option>
            ))}
          </select>
          {errors.responsibility && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors.responsibility.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="task-deadline" className="mb-1 block text-sm font-medium text-gray-700">
            Deadline
          </label>
          <input
            id="task-deadline"
            type="date"
            {...register('deadline')}
            className="h-10 w-full rounded-lg border border-gray-300 px-2"
          />
          {errors.deadline && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors.deadline.message}
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 min-w-[40px] rounded-lg px-4 text-gray-700 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 min-w-[40px] rounded-lg bg-brand px-4 text-white hover:bg-brand/90 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default TaskFormModal;
