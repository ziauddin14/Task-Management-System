import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLoginWithGoogle } from '../../src/hooks/useLoginWithGoogle.js';
import { useAuthStore } from '../../src/store/authStore.js';

vi.mock('../../src/services/auth.api.js', () => ({ loginWithGoogle: vi.fn() }));
import { loginWithGoogle } from '../../src/services/auth.api.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, queryClient };
}

describe('useLoginWithGoogle (docs/10-api-integration.md §4)', () => {
  beforeEach(() => {
    resetStore();
    loginWithGoogle.mockReset();
    mockNavigate.mockReset();
  });

  it('on success: populates authStore, sets the currentUser cache directly, and navigates to /', async () => {
    loginWithGoogle.mockResolvedValue({ token: 'jwt-xyz', user: { id: '1', name: 'Om', role: 'user' } });
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useLoginWithGoogle(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ idToken: 'google-id-token' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(loginWithGoogle).toHaveBeenCalledWith('google-id-token');
    expect(useAuthStore.getState()).toMatchObject({
      user: { id: '1', name: 'Om', role: 'user' },
      token: 'jwt-xyz',
      isAuthenticated: true,
    });
    expect(queryClient.getQueryData(['currentUser'])).toEqual({ id: '1', name: 'Om', role: 'user' });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('on failure: does not touch authStore or navigate', async () => {
    loginWithGoogle.mockRejectedValue(
      Object.assign(new Error('Yeh email system mein register nahi hai. Admin se rabta karein.'), {
        code: 'USER_NOT_FOUND',
      })
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useLoginWithGoogle(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ idToken: 'bad-token' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
