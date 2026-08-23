import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurrentUser } from '../../src/hooks/useCurrentUser.js';
import { useAuthStore } from '../../src/store/authStore.js';

vi.mock('../../src/services/auth.api.js', () => ({ getCurrentUser: vi.fn() }));
import { getCurrentUser } from '../../src/services/auth.api.js';

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCurrentUser (docs/10-api-integration.md §3)', () => {
  beforeEach(() => {
    resetStore();
    getCurrentUser.mockReset();
  });

  it('is disabled (never fetches) when there is no token in authStore', () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('is enabled and fetches when a token exists in authStore', async () => {
    useAuthStore.setState({ token: 'jwt-abc', user: null, isAuthenticated: true });
    getCurrentUser.mockResolvedValue({ id: '1', name: 'Om', role: 'user' });

    const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ id: '1', name: 'Om', role: 'user' });
  });
});
