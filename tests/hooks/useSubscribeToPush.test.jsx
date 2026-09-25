import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscribeToPush } from '../../src/hooks/useSubscribeToPush.js';

vi.mock('../../src/services/push.api.js', () => ({
  subscribeToPush: vi.fn(),
}));
vi.mock('../../src/utils/pushNotifications.js', () => ({
  registerServiceWorker: vi.fn(),
  subscribeBrowserToPush: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { subscribeToPush } from '../../src/services/push.api.js';
import { registerServiceWorker, subscribeBrowserToPush } from '../../src/utils/pushNotifications.js';
import toast from 'react-hot-toast';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSubscribeToPush', () => {
  beforeEach(() => {
    subscribeToPush.mockReset();
    registerServiceWorker.mockReset();
    subscribeBrowserToPush.mockReset();
    toast.success.mockClear();
    vi.stubGlobal('Notification', { requestPermission: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers, requests permission, subscribes, and posts to the backend when granted', async () => {
    Notification.requestPermission.mockResolvedValue('granted');
    const fakeSubscription = { toJSON: () => ({ endpoint: 'https://x.test', keys: { p256dh: 'a', auth: 'b' } }) };
    subscribeBrowserToPush.mockResolvedValue(fakeSubscription);
    subscribeToPush.mockResolvedValue({ subscribed: true });

    const { result } = renderHook(() => useSubscribeToPush(), { wrapper: createWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(registerServiceWorker).toHaveBeenCalled();
    expect(subscribeToPush).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://x.test', deviceInfo: expect.any(String) })
    );
    expect(result.current.data).toEqual({ granted: true });
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('resolves (not throws) with a distinguishable reason when permission is denied — no backend call, no toast', async () => {
    Notification.requestPermission.mockResolvedValue('denied');

    const { result } = renderHook(() => useSubscribeToPush(), { wrapper: createWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(subscribeBrowserToPush).not.toHaveBeenCalled();
    expect(subscribeToPush).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({ granted: false, reason: 'permission-not-granted', permission: 'denied' });
    expect(toast.success).not.toHaveBeenCalled();
  });

  // Audit fix — this used to be swallowed entirely (only a console.error, no way for a caller to
  // detect it happened at all). Now it must propagate as a real mutation error so
  // PushPermissionBanner.jsx can render its name/message on-screen.
  it('propagates a real thrown error (e.g. pushManager.subscribe() rejecting) as the mutation error, not silently', async () => {
    Notification.requestPermission.mockResolvedValue('granted');
    const thrown = Object.assign(new Error('Registration failed - permission denied'), { name: 'NotAllowedError' });
    subscribeBrowserToPush.mockRejectedValue(thrown);

    const { result } = renderHook(() => useSubscribeToPush(), { wrapper: createWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(thrown);
    expect(subscribeToPush).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
