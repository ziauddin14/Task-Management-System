import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLookupValue } from '../services/lookupLists.api.js';

// docs/10-api-integration.md §4 — PATCH /lookup-lists/:id. Same invalidation as
// useCreateLookupValue — matches the ['lookupLists', listType] key so Phase 10.3's task form
// Responsibility dropdown refreshes too.
export function useUpdateLookupValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => updateLookupValue(id, payload),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['lookupLists', entry.listType] });
    },
  });
}
