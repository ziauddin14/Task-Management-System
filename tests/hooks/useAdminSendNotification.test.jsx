import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminSendNotification } from '../../src/hooks/useAdminSendNotification.js';

vi.mock('../../src/services/notifications.api.js', () => ({
  sendAdminNotification: vi.fn(),
}));

import { sendAdminNotification } from '../../src/services/notifications.api.js';

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminSendNotification', () => {
  beforeEach(() => {
    sendAdminNotification.mockReset();
  });

  it('calls the API with the given payload', async () => {
    sendAdminNotification.mockResolvedValue({ batchId: 'b1', recipientsResolved: 2, createdCount: 2, failures: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useAdminSendNotification(), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ recipientType: 'all', templateKey: 'GENERAL_REMINDER' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sendAdminNotification).toHaveBeenCalledWith({ recipientType: 'all', templateKey: 'GENERAL_REMINDER' });
    expect(result.current.data).toEqual({ batchId: 'b1', recipientsResolved: 2, createdCount: 2, failures: [] });
  });

  it('invalidates admin history and the acting user\'s own notification queries on success', async () => {
    sendAdminNotification.mockResolvedValue({ batchId: 'b1', recipientsResolved: 1, createdCount: 1, failures: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAdminSendNotification(), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ recipientType: 'all', templateKey: 'GENERAL_REMINDER' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['adminNotificationHistory'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notificationsUnreadCount'] });
  });
});
