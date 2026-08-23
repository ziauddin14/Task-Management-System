import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateLookupValue } from '../../src/hooks/useCreateLookupValue.js';
import { useUpdateLookupValue } from '../../src/hooks/useUpdateLookupValue.js';

vi.mock('../../src/services/lookupLists.api.js', () => ({
  createLookupValue: vi.fn(),
  updateLookupValue: vi.fn(),
  getLookupList: vi.fn(),
}));
import { createLookupValue, updateLookupValue } from '../../src/services/lookupLists.api.js';

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// docs/10-api-integration.md §4 — both mutations invalidate ['lookupLists', listType], the exact
// key useLookupList('responsibility') reads (Phase 10.3's task form dropdown shares this cache).
describe('useCreateLookupValue / useUpdateLookupValue (docs/10-api-integration.md §4)', () => {
  beforeEach(() => {
    createLookupValue.mockReset();
    updateLookupValue.mockReset();
  });

  it('useCreateLookupValue: on success, invalidates ["lookupLists", listType]', async () => {
    createLookupValue.mockResolvedValue({ id: 'r1', listType: 'responsibility', value: 'IT' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateLookupValue(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ listType: 'responsibility', value: 'IT' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lookupLists', 'responsibility'] });
  });

  it('useUpdateLookupValue: on success, invalidates ["lookupLists", listType]', async () => {
    updateLookupValue.mockResolvedValue({ id: 'r1', listType: 'responsibility', value: 'Finance', isActive: false });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateLookupValue(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ id: 'r1', payload: { isActive: false } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateLookupValue).toHaveBeenCalledWith('r1', { isActive: false });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lookupLists', 'responsibility'] });
  });
});
