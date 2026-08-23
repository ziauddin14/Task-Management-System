import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateTaskUpdate } from '../../src/hooks/useCreateTaskUpdate.js';

vi.mock('../../src/services/taskUpdates.api.js', () => ({
  createTaskUpdate: vi.fn(),
  getTaskUpdates: vi.fn(),
}));
import { createTaskUpdate } from '../../src/services/taskUpdates.api.js';

const updatedTask = { id: 't1', title: 'Task', completionPercent: 60, status: 'ongoing' };

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// docs/10-api-integration.md §4 — the consolidated invalidation matrix for "Create Task Update":
// tasks invalidated, task set directly, taskUpdates invalidated, dashboardSummary invalidated.
describe('useCreateTaskUpdate (docs/10-api-integration.md §4, §6)', () => {
  beforeEach(() => createTaskUpdate.mockReset());

  it('on success: sets task cache directly, and invalidates taskUpdates/tasks/dashboardSummary', async () => {
    createTaskUpdate.mockResolvedValue({ update: { id: 'u1' }, task: updatedTask });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    const { result } = renderHook(() => useCreateTaskUpdate('t1'), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ description: 'Progress made', completionPercent: 60 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createTaskUpdate).toHaveBeenCalledWith('t1', { description: 'Progress made', completionPercent: 60 });
    expect(setQueryDataSpy).toHaveBeenCalledWith(['task', 't1'], updatedTask);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['taskUpdates', 't1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboardSummary'] });
  });
});
