import React from 'react'; // explicit import — see src/App.jsx's comment for why
import Modal from './Modal.jsx';

// docs/09-frontend-features.md §2 — the Close action's "distinct, clearly-separated
// button/confirmation" (and reused by the Deactivate-user confirmation, §9, in a later sub-phase).
function ConfirmDialog({ isOpen, title, message, confirmLabel = 'ہاں', cancelLabel = 'منسوخ کریں', onConfirm, onCancel, isLoading }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <p className="mb-4 text-gray-700">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="h-10 min-w-[40px] rounded-lg px-4 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="h-10 min-w-[40px] rounded-lg bg-brand px-4 text-white hover:bg-brand/90 disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
