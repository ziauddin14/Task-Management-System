import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { UserPlus, UserRoundPen } from 'lucide-react';
import Modal, { ModalFooter } from '../common/Modal.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import BusyButton from '../common/BusyButton.jsx';
import { useCreateUser } from '../../hooks/useCreateUser.js';
import { useUpdateUser } from '../../hooks/useUpdateUser.js';
import { BUTTON_GHOST, BUTTON_PRIMARY, FIELD, FIELD_ERROR, FIELD_LABEL } from '../../utils/uiClasses.js';

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
      return undefined;
    }
    // Returned so react-hook-form's handleSubmit waits for it: `isSubmitting` (the Save button's
    // busy state) stays true until the request settles, instead of flipping back at once.
    return submit(values);
  }

  // Desktop redesign (approved mockup "6 — نیا صارف") — the look only: the same four fields (and, in
  // edit mode, the "فعال" switch) in the shared field style; the email is typed left-to-right.
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? 'صارف میں ترمیم کریں' : 'نیا صارف'}
        variant="redesign"
        icon={isEdit ? UserRoundPen : UserPlus}
        subtitle={isEdit ? 'صارف کی تفصیل میں تبدیلی کریں' : 'نئے صارف کی تفصیل درج کریں'}
        maxWidthClassName="max-w-[560px]"
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-[10px]">
          <div>
            <label htmlFor="user-name" className={FIELD_LABEL}>
              نام
            </label>
            <input id="user-name" type="text" {...register('name')} className={FIELD} />
            {errors.name && (
              <p role="alert" className={FIELD_ERROR}>
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="user-email" className={FIELD_LABEL}>
              ای میل
            </label>
            <input id="user-email" type="email" dir="ltr" {...register('email')} disabled={isEdit} className={`${FIELD} text-right`} />
            {errors.email && (
              <p role="alert" className={FIELD_ERROR}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="user-responsibility" className={FIELD_LABEL}>
              ذمہ داری
            </label>
            {/* Free text on purpose: the Task form's ذمہ داری dropdown derives its options FROM this
                field, so this is the entry point for a new responsibility value. */}
            <input id="user-responsibility" type="text" {...register('responsibility')} className={FIELD} />
            {errors.responsibility && (
              <p role="alert" className={FIELD_ERROR}>
                {errors.responsibility.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="user-role" className={FIELD_LABEL}>
              کردار
            </label>
            <select id="user-role" {...register('role')} className={FIELD}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p role="alert" className={FIELD_ERROR}>
                {errors.role.message}
              </p>
            )}
          </div>

          {isEdit && (
            <label className="flex h-[48px] cursor-pointer items-center gap-3 rounded-tk-input bg-tk-surface px-[14px] text-[14px] text-tk-ink">
              <input type="checkbox" {...register('isActive')} className="h-5 w-5 accent-tk-green-700" />
              فعال
            </label>
          )}

          <ModalFooter>
            <BusyButton
              type="submit"
              // mutation.isPending covers the save that follows the deactivation confirmation: by
              // then the form's own submit has already returned, so isSubmitting alone would miss it.
              busy={isSubmitting || mutation.isPending}
              busyLabel="محفوظ ہو رہا ہے…"
              className={`${BUTTON_PRIMARY} flex-1`}
            >
              محفوظ کریں
            </BusyButton>
            <button type="button" onClick={onClose} className={BUTTON_GHOST}>
              منسوخ کریں
            </button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingValues)}
        title="صارف بند کریں"
        message="اس صارف کو بند کرنے سے وہ اب لاگ ان نہیں کر سکیں گے۔ کیا جاری رکھیں؟"
        confirmLabel="ہاں، جاری رکھیں"
        cancelLabel="منسوخ کریں"
        tone="danger"
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
