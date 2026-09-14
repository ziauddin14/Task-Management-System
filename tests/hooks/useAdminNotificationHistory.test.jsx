import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminNotificationHistory } from '../../src/hooks/useAdminNotificationHistory.js';

vi.mock('../../src/services/notifications.api.js', () => ({
  getAdminNotificationHistory: vi.fn(),
}));

import { getAdminNotificationHistory } from '../../src/services/notifications.api.js';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminNotificationHistory', () => {
  beforeEach(() => {
    getAdminNotificationHistory.mockReset();
  });

  it('fetches with the given params and exposes items/meta', async () => {
    getAdminNotificationHistory.mockResolvedValue({ items: [{ batchId: 'b1' }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    const { result } = renderHook(() => useAdminNotificationHistory({ page: 1, limit: 20 }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getAdminNotificationHistory).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result.current.data.items).toEqual([{ batchId: 'b1' }]);
  });
});
