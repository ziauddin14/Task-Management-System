import { useEffect, useState } from 'react';

// docs/09-frontend-features.md §5 — "Search input is debounced client-side (~400ms after the user
// stops typing) before it updates the URL query param." `inputValue` reflects every keystroke
// immediately (so the text box never feels laggy); `debouncedValue` only changes 400ms after
// typing stops, and is what the caller wires into the URL/query.
export function useDebouncedSearch(initialValue = '', delay = 400) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(inputValue), delay);
    return () => clearTimeout(timer);
  }, [inputValue, delay]);

  return [inputValue, setInputValue, debouncedValue];
}
