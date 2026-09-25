import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/apiClient.js', () => ({
  default: { post: vi.fn() },
}));

import apiClient from '../../src/services/apiClient.js';
import { subscribeToPush, unsubscribeFromPush } from '../../src/services/push.api.js';

describe('push.api', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
  });

  it('subscribeToPush POSTs the subscription payload to /push/subscribe', async () => {
    apiClient.post.mockResolvedValue({ data: { data: { subscribed: true } } });
    const payload = { endpoint: 'https://x.test', keys: { p256dh: 'a', auth: 'b' } };

    const result = await subscribeToPush(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/push/subscribe', payload);
    expect(result).toEqual({ subscribed: true });
  });

  it('unsubscribeFromPush POSTs the endpoint to /push/unsubscribe', async () => {
    apiClient.post.mockResolvedValue({ data: { data: { subscribed: false } } });

    const result = await unsubscribeFromPush('https://x.test');

    expect(apiClient.post).toHaveBeenCalledWith('/push/unsubscribe', { endpoint: 'https://x.test' });
    expect(result).toEqual({ subscribed: false });
  });
});
