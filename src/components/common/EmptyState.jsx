import React from 'react'; // explicit import — see src/App.jsx's comment for why

// docs/07-frontend-foundation.md §10 — shared empty-state, message contextual to what's empty
// (no tasks match this filter vs. no tasks at all, etc.) rather than a blank table.
function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center text-gray-500">
      <p>{message}</p>
    </div>
  );
}

export default EmptyState;
