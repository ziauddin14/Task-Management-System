import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import { useCreateUser } from '../../hooks/useCreateUser.js';
import { useUpdateUser } from '../../hooks/useUpdateUser.js';

// docs/09-frontend-features.md §10 — mirrors backend/src/validators/user.validator.js field-for-
// field (verified directly, not just the doc's own field list — see Phase 10.5 report §F): name
// min(1), email a valid address, responsibility min(1), role enum('admin','user'). Email is only
// meaningfully validated in create mode — edit mode never submits it at all (disabled/read-only
// field, immutable per docs/05-apis.md §3), so its schema entry there is a no-op placeholder.
function buildSchema(mode) {
  return z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: mode === 'create' ? z.string().email('A valid email is required') : z.string().optional(),
    responsibility: z.string().trim().min(1, 'Responsibility is required'),
    role: z.enum(['admin', 'user'], { errorMap: () => ({ message: 'Role must be admin or user' }) }),
    isActive: z.boolean().optional(),
  });
}

// docs/08-ui-ux.md §8, docs/09-frontend-features.md §9 — create mode: Name/Email/Responsibility/
// Role. Edit mode: Name/Responsibility/Role/Active toggle, Email shown but disabled. Deactivating
// (isActive true -> false) requires the documented confirmation before the mutation fires.
function UserFormModal({ isOpen, onClose, mode, user }) {
  const isEdit = mode === 'edit';
  const schema = buildSchema(mode);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(user?.id);
  const mutation = isEdit ? updateUser : createUser;
  const [pendingValues, setPendingValues] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', responsibility: '', role: 'user', isActive: true },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && user) {
      reset({ name: user.name, email: user.email, responsibility: user.responsibility, role: user.role, isActive: user.isActive });
    } else {
      reset({ name: '', email: '', responsibility: '', role: 'user', isActive: true });
    }
    setPendingValues(null);
  }, [isOpen, isEdit, user, reset]);

  async function submit(values) {
    const payload = isEdit
      ? { name: values.name, responsibility: values.responsibility, role: values.role, isActive: values.isActive }
      : { name: values.name, email: values.email, responsibility: values.responsibility, role: values.role };

    try {
      await mutation.mutateAsync(payload);
    } catch (err) {
      // docs/09-frontend-features.md §9 — duplicate email maps to an inline field error, not just
      // the global toast (App.jsx's queryClient onError still fires that too).
      if (err.code === 'DUPLICATE_EMAIL') {
        setError('email', { type: 'manual', message: err.message });
      }
      return;
    }
    toast.success(isEdit ? 'صارف اپڈیٹ ہو گیا' : 'صارف کامیابی سے بنا دیا گیا');
    onClose();
  }

  function onFormSubmit(values) {
    // docs/09-frontend-features.md §9 — deactivating (true -> false) needs its own confirmation
    // before the mutation fires; reactivating or an unrelated field change does not.
    if (isEdit && user?.isActive && values.isActive === false) {
      setPendingValues(values);
      return;
    }
    submit(values);
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'صارف میں ترمیم کریں' : 'نیا صارف'}>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-3">
          <div>
            <label htmlFor="user-name" className="mb-1 block text-sm font-medium text-gray-700">
              نام
            </label>
            <input id="user-name" type="text" {...register('name')} className="h-10 w-full rounded-lg border border-gray-300 px-2" />
            {errors.name && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="user-email" className="mb-1 block text-sm font-medium text-gray-700">
              ای میل
            </label>
            <input
              id="user-email"
              type="email"
              {...register('email')}
              disabled={isEdit}
              className="h-10 w-full rounded-lg border border-gray-300 px-2 disabled:bg-gray-100 disabled:text-gray-500"
            />
            {errors.email && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="user-responsibility" className="mb-1 block text-sm font-medium text-gray-700">
              ذمہ داری
            </label>
            {/* Prompt 3C's consequence: this was a LookupList-backed <select>, but with the
                Lookup List panel removed (Prompt 3D) there would be no way left to ever enter a
                responsibility value that doesn't already exist — the Task form's dropdown now
                derives its options FROM this field, so this field is the actual entry point for
                new values and must accept free text. */}
            <input
              id="user-responsibility"
              type="text"
              {...register('responsibility')}
              className="h-10 w-full rounded-lg border border-gray-300 px-2"
            />
            {errors.responsibility && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.responsibility.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="user-role" className="mb-1 block text-sm font-medium text-gray-700">
              کردار
            </label>
            <select id="user-role" {...register('role')} className="h-10 w-full rounded-lg border border-gray-300 px-2">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.role.message}
              </p>
            )}
          </div>

          {isEdit && (
            <label className="flex h-10 items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register('isActive')} className="h-4 w-4" />
              فعال
            </label>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-10 min-w-[40px] rounded-lg px-4 text-gray-700 hover:bg-gray-100">
              منسوخ کریں
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 min-w-[40px] rounded-lg bg-brand px-4 text-white hover:bg-brand/90 disabled:opacity-50"
            >
              محفوظ کریں
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingValues)}
        title="صارف بند کریں"
        message="اس صارف کو بند کرنے سے وہ اب لاگ ان نہیں کر سکیں گے۔ کیا جاری رکھیں؟"
        confirmLabel="ہاں، جاری رکھیں"
        cancelLabel="منسوخ کریں"
        isLoading={mutation.isPending}
        onConfirm={() => {
          const values = pendingValues;
          setPendingValues(null);
          submit(values);
        }}
        onCancel={() => setPendingValues(null)}
      />
    </>
  );
}

export default UserFormModal;
