import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { CircleHelp, TriangleAlert } from 'lucide-react';
import Modal, { ModalFooter } from './Modal.jsx';
import BusyButton from './BusyButton.jsx';
import { BUTTON_DANGER, BUTTON_GHOST, BUTTON_PRIMARY } from '../../utils/uiClasses.js';

// docs/09-frontend-features.md §2 — the Close action's "distinct, clearly-separated
// button/confirmation" (and reused by the Deactivate-user confirmation, §9, in a later sub-phase).
//
// `tone` is the look only: "danger" (a confirmation of something that takes a thing away — closing
// a task, switching a user or a list value off, removing an estimate) gets the warning icon and the
// red button; without it the dialog is the plain green one. Labels, handlers and the busy state
// are the same either way.
function ConfirmDialog({ isOpen, title, message, confirmLabel = 'ہاں', cancelLabel = 'منسوخ کریں', onConfirm, onCancel, isLoading, tone }) {
  const isDanger = tone === 'danger';
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      variant="redesign"
      icon={isDanger ? TriangleAlert : CircleHelp}
      iconTone={isDanger ? 'danger' : undefined}
      maxWidthClassName="max-w-[480px]"
    >
      <p className="pb-2 text-[15px] leading-tk-label text-tk-ink-soft">{message}</p>
      <ModalFooter>
        <BusyButton onClick={onConfirm} busy={Boolean(isLoading)} className={`${isDanger ? BUTTON_DANGER : BUTTON_PRIMARY} flex-1 font-semibold`}>
          {confirmLabel}
        </BusyButton>
        <button type="button" onClick={onCancel} disabled={isLoading} className={BUTTON_GHOST}>
          {cancelLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ConfirmDialog;
