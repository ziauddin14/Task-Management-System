import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateActivitySettings } from '../services/activity.api.js';

// PATCH /admin/settings/activity. On success the card shows the saved value at once, and the
// activity log's tiles, list and the dashboard alert are re-read, since N decides who is flagged.
export function useUpdateActivitySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateActivitySettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(['activitySettings'], settings);
      queryClient.invalidateQueries({ queryKey: ['activitySummary'] });
      queryClient.invalidateQueries({ queryKey: ['activityUsers'] });
    },
  });
}
