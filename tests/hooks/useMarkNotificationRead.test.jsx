import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarkNotificationRead } from '../../src/hooks/useMarkNotificationRead.js';

vi.mock('../../src/services/notifications.api.js', () => ({
  markNotificationRead: vi.fn(),
}));

import { markNotificationRead } from '../../src/services/notifications.api.js';

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useMarkNotificationRead', () => {
  beforeEach(() => {
    markNotificationRead.mockReset();
  });

  it('calls the API with the given notification id', async () => {
    markNotificationRead.mockResolvedValue({ id: 'n1', isRead: true });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: createWrapper(queryClient) });

    result.current.mutate('n1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(markNotificationRead).toHaveBeenCalledWith('n1');
  });

  it('invalidates both the notification list and the unread-count queries on success', async () => {
    markNotificationRead.mockResolvedValue({ id: 'n1', isRead: true });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: createWrapper(queryClient) });

    result.current.mutate('n1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notificationsUnreadCount'] });
  });
});
