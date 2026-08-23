import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateUser } from '../../src/hooks/useCreateUser.js';
import { useUpdateUser } from '../../src/hooks/useUpdateUser.js';

vi.mock('../../src/services/users.api.js', () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getUsers: vi.fn(),
  getUser: vi.fn(),
}));
import { createUser, updateUser } from '../../src/services/users.api.js';

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// docs/10-api-integration.md §4, §6 — the consolidated invalidation matrix for "Create/Update User".
describe('useCreateUser / useUpdateUser (docs/10-api-integration.md §4)', () => {
  beforeEach(() => {
    createUser.mockReset();
    updateUser.mockReset();
  });

  it('useCreateUser: on success, invalidates ["users"]', async () => {
    createUser.mockResolvedValue({ id: 'u1', name: 'Ali' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ name: 'Ali', email: 'ali@example.com', responsibility: 'IT', role: 'user' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('useUpdateUser: on success, sets ["user", userId] directly AND invalidates ["users"]', async () => {
    const updatedUser = { id: 'u1', name: 'Ali Updated', isActive: true };
    updateUser.mockResolvedValue(updatedUser);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    const { result } = renderHook(() => useUpdateUser('u1'), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ name: 'Ali Updated' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateUser).toHaveBeenCalledWith('u1', { name: 'Ali Updated' });
    expect(setQueryDataSpy).toHaveBeenCalledWith(['user', 'u1'], updatedUser);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
  });
});
