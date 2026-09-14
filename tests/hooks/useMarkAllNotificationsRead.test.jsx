import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarkAllNotificationsRead } from '../../src/hooks/useMarkAllNotificationsRead.js';

vi.mock('../../src/services/notifications.api.js', () => ({
  markAllNotificationsRead: vi.fn(),
}));

import { markAllNotificationsRead } from '../../src/services/notifications.api.js';

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useMarkAllNotificationsRead', () => {
  beforeEach(() => {
    markAllNotificationsRead.mockReset();
  });

  it('calls the API and resolves with the updated count', async () => {
    markAllNotificationsRead.mockResolvedValue({ updatedCount: 5 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: createWrapper(queryClient) });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ updatedCount: 5 });
  });

  it('invalidates both the notification list and the unread-count queries on success', async () => {
    markAllNotificationsRead.mockResolvedValue({ updatedCount: 0 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: createWrapper(queryClient) });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notificationsUnreadCount'] });
  });
});
