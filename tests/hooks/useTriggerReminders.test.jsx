import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTriggerReminders } from '../../src/hooks/useTriggerReminders.js';

vi.mock('../../src/services/reports.api.js', () => ({
  triggerReminders: vi.fn(),
  exportReport: vi.fn(),
  exportUserSummary: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { triggerReminders } from '../../src/services/reports.api.js';
import toast from 'react-hot-toast';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// docs/10-api-integration.md §4 — POST /admin/trigger-reminders. Toast the returned count; no
// cache invalidation needed.
describe('useTriggerReminders (docs/10-api-integration.md §4)', () => {
  beforeEach(() => {
    triggerReminders.mockReset();
    toast.success.mockClear();
  });

  it('fires the mutation and toasts the returned count', async () => {
    triggerReminders.mockResolvedValue({ remindersSent: 7 });
    const { result } = renderHook(() => useTriggerReminders(), { wrapper: createWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(triggerReminders).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('7 reminders sent');
  });
});
