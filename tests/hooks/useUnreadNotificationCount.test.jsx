import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnreadNotificationCount } from '../../src/hooks/useUnreadNotificationCount.js';

vi.mock('../../src/services/notifications.api.js', () => ({
  getUnreadNotificationCount: vi.fn(),
}));

import { getUnreadNotificationCount } from '../../src/services/notifications.api.js';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

async function advance(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

// Fake timers so the 60s refetchInterval can be advanced deterministically instead of waiting on
// real wall-clock time. Deliberately never mixed with @testing-library's own waitFor() in this
// file — waitFor's internal polling relies on real setTimeout ticks, which fake timers freeze,
// causing it to hang until the test's own (real-time) timeout. The advance() helper above wraps
// vi.advanceTimersByTimeAsync in act(), so the state update it triggers (React Query's setState on
// the resolved query) is properly flushed before assertions run — no waitFor needed.
describe('useUnreadNotificationCount (locked blueprint §Real-time vs Polling)', () => {
  beforeEach(() => {
    getUnreadNotificationCount.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches the unread count on mount', async () => {
    getUnreadNotificationCount.mockResolvedValue({ count: 3 });
    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper: createWrapper() });

    await advance(0);

    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ count: 3 });
  });

  it('polls again roughly every 60 seconds', async () => {
    getUnreadNotificationCount.mockResolvedValue({ count: 0 });
    renderHook(() => useUnreadNotificationCount(), { wrapper: createWrapper() });
    await advance(0);
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1);

    await advance(60_000);
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(2);

    await advance(60_000);
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(3);
  });

  it('does not poll faster than the 60s interval', async () => {
    getUnreadNotificationCount.mockResolvedValue({ count: 0 });
    renderHook(() => useUnreadNotificationCount(), { wrapper: createWrapper() });
    await advance(0);
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1);

    await advance(30_000);
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1);
  });
});
