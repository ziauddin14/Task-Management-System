import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Search } from 'lucide-react';

// docs/08-ui-ux.md §5 — search input (icon + placeholder), matches title or codeNumber. Purely
// presentational: debounce timing lives in hooks/useDebouncedSearch.js, owned by FilterBar.
function SearchBar({ value, onChange }) {
  return (
    <label className="flex h-[46px] min-w-[200px] flex-[1.6_1_0%] items-center gap-2 rounded-tk-input bg-tk-surface px-[14px] focus-within:ring-2 focus-within:ring-tk-green-700">
      <Search className="h-5 w-5 shrink-0 text-tk-muted" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="کام یا کوڈ نمبر تلاش کریں..."
        aria-label="کام یا کوڈ نمبر تلاش کریں"
        className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14px] text-tk-ink placeholder:text-tk-muted focus:outline-none"
      />
    </label>
  );
}

export default SearchBar;
