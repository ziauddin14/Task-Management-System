import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Search } from 'lucide-react';

// docs/08-ui-ux.md §5 — search input (icon + placeholder), matches title or codeNumber. Purely
// presentational: debounce timing lives in hooks/useDebouncedSearch.js, owned by FilterBar.
function SearchBar({ value, onChange }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-gray-400" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Kaam ya code number talaash karein…"
        aria-label="Kaam ya code number talaash karein"
        className="h-10 w-full rounded-lg border border-gray-300 ps-9 pe-3 focus:border-brand focus:outline-none"
      />
    </div>
  );
}

export default SearchBar;
