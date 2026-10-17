import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/apiClient.js', () => ({
  default: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
}));

import apiClient from '../../src/services/apiClient.js';
import {
  getActivitySettings,
  getActivitySummary,
  getActivityUsers,
  getUserActivityEvents,
  getUserActivityHistory,
  updateActivitySettings,
} from '../../src/services/activity.api.js';
import { notifyLogout } from '../../src/services/auth.api.js';

const ok = (data, meta) => ({ data: { success: true, data, meta } });

describe('activity.api', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.post.mockReset();
    apiClient.patch.mockReset();
  });

  it('calls the admin endpoints and unwraps their data (and meta for lists)', async () => {
    apiClient.get.mockResolvedValueOnce(ok({ inactiveCount: 2 }));
    expect(await getActivitySummary()).toEqual({ inactiveCount: 2 });
    expect(apiClient.get).toHaveBeenLastCalledWith('/admin/activity/summary');

    apiClient.get.mockResolvedValueOnce(ok([{ id: 'u1' }], { total: 1 }));
    expect(await getActivityUsers({ search: 'ali', page: 2 })).toEqual({ items: [{ id: 'u1' }], meta: { total: 1 } });
    expect(apiClient.get).toHaveBeenLastCalledWith('/admin/activity/users', { params: { search: 'ali', page: 2 } });

    apiClient.get.mockResolvedValueOnce(ok([], { total: 0 }));
    await getUserActivityEvents('u1', { type: 'LOGIN', from: '2026-10-01' });
    expect(apiClient.get).toHaveBeenLastCalledWith('/admin/activity/users/u1/events', { params: { type: 'LOGIN', from: '2026-10-01' } });

    apiClient.get.mockResolvedValueOnce(ok([], { total: 0 }));
    await getUserActivityHistory('u1', { page: 1, limit: 10 });
    expect(apiClient.get).toHaveBeenLastCalledWith('/admin/activity/users/u1/history', { params: { page: 1, limit: 10 } });

    apiClient.get.mockResolvedValueOnce(ok({ inactivityDays: 7 }));
    expect(await getActivitySettings()).toEqual({ inactivityDays: 7 });
    expect(apiClient.get).toHaveBeenLastCalledWith('/admin/settings/activity');

    apiClient.patch.mockResolvedValueOnce(ok({ inactivityDays: 14 }));
    expect(await updateActivitySettings({ inactivityDays: 14 })).toEqual({ inactivityDays: 14 });
    expect(apiClient.patch).toHaveBeenLastCalledWith('/admin/settings/activity', { inactivityDays: 14 });
  });
});

describe('auth.api — notifyLogout', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
  });

  it('posts /auth/logout with the given token and without the session-expired redirect', () => {
    apiClient.post.mockResolvedValue(ok({ loggedOut: true }));
    notifyLogout('jwt-abc');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', null, {
      headers: { Authorization: 'Bearer jwt-abc' },
      skipSessionRedirect: true,
    });
  });

  it('is fire-and-forget: returns nothing to wait for and swallows a failure', async () => {
    apiClient.post.mockRejectedValue(new Error('network down'));
    expect(notifyLogout('jwt-abc')).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 0)); // the rejection settles; nothing surfaces
  });

  it('never throws, even if the request cannot be started', () => {
    apiClient.post.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => notifyLogout('jwt-abc')).not.toThrow();
  });

  it('sends nothing without a token', () => {
    notifyLogout(null);
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
