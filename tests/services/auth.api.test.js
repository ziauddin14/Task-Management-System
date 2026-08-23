import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/apiClient.js', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

import apiClient from '../../src/services/apiClient.js';
import { loginWithGoogle, getCurrentUser } from '../../src/services/auth.api.js';

describe('auth.api', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
    apiClient.get.mockReset();
  });

  it('loginWithGoogle posts { idToken } to /auth/google and unwraps data.data', async () => {
    apiClient.post.mockResolvedValue({
      data: { success: true, data: { token: 'jwt-abc', user: { id: '1', name: 'Om' } } },
    });

    const result = await loginWithGoogle('id-token-abc');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/google', { idToken: 'id-token-abc' });
    expect(result).toEqual({ token: 'jwt-abc', user: { id: '1', name: 'Om' } });
  });

  it('getCurrentUser gets /auth/me and unwraps data.data', async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, data: { id: '1', name: 'Om', role: 'user' } },
    });

    const result = await getCurrentUser();

    expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual({ id: '1', name: 'Om', role: 'user' });
  });
});
