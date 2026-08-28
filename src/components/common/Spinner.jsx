import React from 'react'; // explicit import — see src/App.jsx's comment for why

// docs/07-frontend-foundation.md §10 — shared loading indicator, reused by every list-fetching
// component instead of each one inventing its own.
function Spinner({ label = 'لوڈ ہو رہا ہے…' }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-8 text-gray-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default Spinner;
