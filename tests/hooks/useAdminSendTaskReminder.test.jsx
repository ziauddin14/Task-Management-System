import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminSendTaskReminder } from '../../src/hooks/useAdminSendTaskReminder.js';

vi.mock('../../src/services/notifications.api.js', () => ({
  sendTaskReminder: vi.fn(),
}));

import { sendTaskReminder } from '../../src/services/notifications.api.js';

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminSendTaskReminder', () => {
  beforeEach(() => {
    sendTaskReminder.mockReset();
  });

  it('calls the API with the taskId and payload split apart correctly', async () => {
    sendTaskReminder.mockResolvedValue({ batchId: 'b1', recipientsResolved: 2, createdCount: 2, failures: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useAdminSendTaskReminder(), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ taskId: 't1', payload: { templateKey: 'DEADLINE_APPROACHING' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sendTaskReminder).toHaveBeenCalledWith('t1', { templateKey: 'DEADLINE_APPROACHING' });
  });

  it('invalidates admin history and the acting user\'s own notification queries on success', async () => {
    sendTaskReminder.mockResolvedValue({ batchId: 'b1', recipientsResolved: 1, createdCount: 1, failures: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAdminSendTaskReminder(), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ taskId: 't1', payload: {} });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['adminNotificationHistory'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notificationsUnreadCount'] });
  });
});
