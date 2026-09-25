import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnsubscribeFromPush } from '../../src/hooks/useUnsubscribeFromPush.js';

vi.mock('../../src/services/push.api.js', () => ({
  unsubscribeFromPush: vi.fn(),
}));
vi.mock('../../src/utils/pushNotifications.js', () => ({
  unsubscribeBrowserFromPush: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { unsubscribeFromPush } from '../../src/services/push.api.js';
import { unsubscribeBrowserFromPush } from '../../src/utils/pushNotifications.js';
import toast from 'react-hot-toast';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUnsubscribeFromPush', () => {
  beforeEach(() => {
    unsubscribeFromPush.mockReset();
    unsubscribeBrowserFromPush.mockReset();
    toast.success.mockClear();
  });

  it('unsubscribes the browser then tells the backend the endpoint', async () => {
    unsubscribeBrowserFromPush.mockResolvedValue('https://x.test');
    unsubscribeFromPush.mockResolvedValue({ subscribed: false });

    const { result } = renderHook(() => useUnsubscribeFromPush(), { wrapper: createWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(unsubscribeFromPush).toHaveBeenCalledWith('https://x.test');
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('does not call the backend when there was no browser subscription to begin with', async () => {
    unsubscribeBrowserFromPush.mockResolvedValue(null);

    const { result } = renderHook(() => useUnsubscribeFromPush(), { wrapper: createWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(unsubscribeFromPush).not.toHaveBeenCalled();
  });
});
