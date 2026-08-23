import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { triggerReminders } from '../services/reports.api.js';

// docs/10-api-integration.md §4 — POST /admin/trigger-reminders. Unlike the two export hooks
// (§5), this returns plain JSON (not a blob), so it's a normal useMutation like every other §4
// hook. On success: toast the returned count; no cache invalidation needed (doesn't change any
// task/user data directly visible in a list).
export function useTriggerReminders() {
  return useMutation({
    mutationFn: triggerReminders,
    onSuccess: ({ remindersSent }) => {
      toast.success(`${remindersSent} reminders sent`);
    },
  });
}
