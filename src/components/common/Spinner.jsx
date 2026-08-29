import React from 'react'; // explicit import — see src/App.jsx's comment for why

// docs/07-frontend-foundation.md §10 — shared loading indicator, reused by every list-fetching
// component instead of each one inventing its own. Themed as an animated "Durood Shareef" loader
// (صلوٰۃ علی الحبیب ﷺ, gently pulsing) rather than a plain spinner icon — the accessible name is
// still carried by the same role="status"/aria-live="polite" region with the same visible `label`
// text as before, so screen readers announce loading the same way they always did.
function Spinner({ label = 'لوڈ ہو رہا ہے…' }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-1 py-8">
      <span className="animate-pulse text-lg font-bold text-brand md:text-xl">صلوٰۃ علی الحبیب ﷺ</span>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

export default Spinner;
