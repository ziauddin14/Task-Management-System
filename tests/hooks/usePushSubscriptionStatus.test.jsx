import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePushSubscriptionStatus } from '../../src/hooks/usePushSubscriptionStatus.js';

vi.mock('../../src/utils/pushNotifications.js', () => ({
  getExistingSubscription: vi.fn(),
  isPushSupported: vi.fn(),
}));

import { getExistingSubscription, isPushSupported } from '../../src/utils/pushNotifications.js';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('usePushSubscriptionStatus', () => {
  beforeEach(() => {
    getExistingSubscription.mockReset();
    isPushSupported.mockReset();
  });

  it('reports isSubscribed:true when the browser has an existing subscription', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue({ endpoint: 'https://x.test' });
    const { result } = renderHook(() => usePushSubscriptionStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ isSubscribed: true });
  });

  it('reports isSubscribed:false when there is none', async () => {
    isPushSupported.mockReturnValue(true);
    getExistingSubscription.mockResolvedValue(null);
    const { result } = renderHook(() => usePushSubscriptionStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ isSubscribed: false });
  });

  it('never even queries when push is not supported (enabled:false)', async () => {
    isPushSupported.mockReturnValue(false);
    renderHook(() => usePushSubscriptionStatus(), { wrapper: createWrapper() });

    expect(getExistingSubscription).not.toHaveBeenCalled();
  });
});
