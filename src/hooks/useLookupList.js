import { useQuery } from '@tanstack/react-query';
import { getLookupList } from '../services/lookupLists.api.js';

// docs/10-api-integration.md §3 — key ['lookupLists', listType], staleTime 5m (dropdown values
// change rarely).
export function useLookupList(listType) {
  return useQuery({
    queryKey: ['lookupLists', listType],
    queryFn: () => getLookupList(listType),
    staleTime: 5 * 60_000,
  });
}
