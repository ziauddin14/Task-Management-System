import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import Spinner from '../common/Spinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useLookupList } from '../../hooks/useLookupList.js';
import { useCreateLookupValue } from '../../hooks/useCreateLookupValue.js';
import { useUpdateLookupValue } from '../../hooks/useUpdateLookupValue.js';

const LIST_TYPE = 'responsibility'; // docs/04-db-models.md §5 — the only listType that exists today.

// docs/09-frontend-features.md §10 — mirrors backend/src/validators/lookupList.validator.js's
// createLookupValueSchema: value required (trimmed), sortOrder an optional integer.
const addValueSchema = z.object({
  value: z.string().trim().min(1, 'Value is required'),
});

// Placement decision (Phase 10.5 kickoff §1): no dedicated route or full screen exists in any doc
// for lookup-list management, and the only listType today is "responsibility" — so this is a
// small panel embedded directly in UsersPage.jsx, not a new page/route.
//
// Known backend limitation (see Phase 10.5 report §I): GET /lookup-lists always returns ONLY
// active entries (lookupList.service.js's listActive hardcodes isActive:true, and the query
// schema has no includeInactive param) — there is currently no way to list or reactivate a
// deactivated value from any screen. Deactivating one here is therefore effectively permanent
// until a backend change adds that capability; the confirmation below says so explicitly rather
// than silently hiding that limitation from the Admin.
function LookupListPanel() {
  const { data: entries, isLoading } = useLookupList(LIST_TYPE);
  const createValue = useCreateLookupValue();
  const updateValue = useUpdateLookupValue();
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ value: '', sortOrder: 0 });
  const [deactivatingEntry, setDeactivatingEntry] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(addValueSchema), defaultValues: { value: '' } });

  async function onAddValue(values) {
    try {
      await createValue.mutateAsync({ listType: LIST_TYPE, value: values.value });
    } catch (err) {
      if (err.code === 'DUPLICATE_LOOKUP_VALUE') {
        setError('value', { type: 'manual', message: err.message });
      }
      return;
    }
    toast.success('ویلیو شامل کر دی گئی');
    reset({ value: '' });
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditDraft({ value: entry.value, sortOrder: entry.sortOrder });
  }

  async function saveEdit(entry) {
    try {
      await updateValue.mutateAsync({
        id: entry.id,
        payload: { value: editDraft.value.trim(), sortOrder: Number(editDraft.sortOrder) },
      });
    } catch {
      return; // global mutations.onError (App.jsx) already toasted it (e.g. a rename collision).
    }
    toast.success('ویلیو اپڈیٹ ہو گئی');
    setEditingId(null);
  }

  async function handleConfirmDeactivate() {
    const entry = deactivatingEntry;
    setDeactivatingEntry(null);
    try {
      await updateValue.mutateAsync({ id: entry.id, payload: { isActive: false } });
      toast.success('ویلیو بند کر دی گئی');
    } catch {
      // global mutations.onError already toasted it.
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <h2 className="mb-2 text-base font-bold">ذمہ داری لسٹ</h2>

      {isLoading ? (
        <Spinner label="لوڈ ہو رہا ہے…" />
      ) : (entries || []).length === 0 ? (
        <EmptyState message="ابھی کوئی ذمہ داری ویلیو موجود نہیں۔" />
      ) : (
        <ul className="mb-3 flex flex-col gap-1">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-2 py-1 text-sm">
              {editingId === entry.id ? (
                <>
                  <input
                    aria-label="Value"
                    value={editDraft.value}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, value: event.target.value }))}
                    className="h-10 flex-1 rounded-lg border border-gray-300 px-2"
                  />
                  <input
                    aria-label="Sort order"
                    type="number"
                    value={editDraft.sortOrder}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, sortOrder: event.target.value }))}
                    className="h-10 w-16 rounded-lg border border-gray-300 px-2"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(entry)}
                    className="h-10 min-w-[40px] rounded-lg bg-brand px-2 text-xs text-white hover:bg-brand/90"
                  >
                    محفوظ کریں
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="h-10 min-w-[40px] rounded-lg px-2 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    منسوخ کریں
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1">{entry.value}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    className="h-10 min-w-[40px] rounded-lg border border-gray-300 px-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    ترمیم کریں
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeactivatingEntry(entry)}
                    className="h-10 min-w-[40px] rounded-lg border border-gray-300 px-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Deactivate
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit(onAddValue)} className="flex items-start gap-2">
        <div className="flex-1">
          <input
            aria-label="نئی ذمہ داری"
            placeholder="نئی ویلیو…"
            {...register('value')}
            className="h-10 w-full rounded-lg border border-gray-300 px-2"
          />
          {errors.value && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors.value.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-10 min-w-[40px] rounded-lg bg-brand px-4 text-white hover:bg-brand/90 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <ConfirmDialog
        isOpen={Boolean(deactivatingEntry)}
        title="ویلیو بند کریں"
        message="اس ویلیو کو بند کرنے کے بعد اسے دوبارہ ایکٹیو کرنا فی الحال اس اسکرین سے ممکن نہیں (صرف ایکٹیو ویلیوز یہاں دکھائی دیتی ہیں)۔ واقعی بند کرنا چاہتے ہیں؟"
        confirmLabel="ہاں، بند کریں"
        cancelLabel="منسوخ کریں"
        isLoading={updateValue.isPending}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivatingEntry(null)}
      />
    </div>
  );
}

export default LookupListPanel;
