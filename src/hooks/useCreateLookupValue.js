import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLookupValue } from '../services/lookupLists.api.js';

// docs/10-api-integration.md §4 — POST /lookup-lists. On success: invalidateQueries(['lookupLists',
// listType]) — this is the same key useLookupList('responsibility') reads (Phase 10.3's task
// form dropdown), so that dropdown refreshes automatically too.
export function useCreateLookupValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createLookupValue(payload),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['lookupLists', entry.listType] });
    },
  });
}
