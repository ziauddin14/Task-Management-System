import React from 'react'; // explicit import — see src/App.jsx's comment for why
import Modal from '../common/Modal.jsx';
import PreviousUpdatesContent from './PreviousUpdatesContent.jsx';

// docs/08-ui-ux.md §7 — reachable directly via the row's own "Previous Updates" button. Wraps the
// same PreviousUpdatesContent used inline inside UpdateModal.jsx, so both entry points render
// identical content rather than two hand-maintained copies.
function PreviousUpdatesModal({ isOpen, onClose, taskId }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Purani Updates">
      <PreviousUpdatesContent taskId={taskId} />
    </Modal>
  );
}

export default PreviousUpdatesModal;
