import { describe, it, expect, beforeEach } from 'vitest';
import apiClient, { ApiError } from '../../src/services/apiClient.js';
import { useAuthStore } from '../../src/store/authStore.js';

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

describe('apiClient request interceptor', () => {
  beforeEach(() => resetStore());

  it('attaches Authorization when a token exists in the store', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    const requestFulfilled = apiClient.interceptors.request.handlers[0].fulfilled;

    const config = requestFulfilled({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer jwt-abc');
  });

  it('omits Authorization when there is no token in the store', () => {
    const requestFulfilled = apiClient.interceptors.request.handlers[0].fulfilled;

    const config = requestFulfilled({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('apiClient response interceptor', () => {
  beforeEach(() => {
    resetStore();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });
  });

  it('on 401: clears the auth store and rejects with an ApiError', async () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    const responseRejected = apiClient.interceptors.response.handlers[0].rejected;
    const fakeError = {
      response: { status: 401, data: { success: false, message: 'Expired', code: 'UNAUTHORIZED' } },
    };

    await expect(responseRejected(fakeError)).rejects.toBeInstanceOf(ApiError);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('on 401: redirects to /login', async () => {
    const responseRejected = apiClient.interceptors.response.handlers[0].rejected;
    const fakeError = { response: { status: 401, data: {} } };

    await responseRejected(fakeError).catch(() => {});

    expect(window.location.href).toBe('/login');
  });

  it('on a non-401 error: unwraps the backend { message, code } shape into an ApiError', async () => {
    const responseRejected = apiClient.interceptors.response.handlers[0].rejected;
    const fakeError = {
      response: {
        status: 400,
        data: { success: false, message: 'Validation failed.', code: 'VALIDATION_ERROR' },
      },
    };

    await expect(responseRejected(fakeError)).rejects.toMatchObject({
      message: 'Validation failed.',
      code: 'VALIDATION_ERROR',
    });
  });

  it('falls back to a generic message/code when there is no backend response body', async () => {
    const responseRejected = apiClient.interceptors.response.handlers[0].rejected;
    const fakeError = { message: 'Network Error' };

    await expect(responseRejected(fakeError)).rejects.toMatchObject({
      message: 'Network Error',
      code: 'SERVER_ERROR',
    });
  });

  it('does not clear the auth store for a non-401 error', async () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    const responseRejected = apiClient.interceptors.response.handlers[0].rejected;
    const fakeError = { response: { status: 500, data: {} } };

    await responseRejected(fakeError).catch(() => {});

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
