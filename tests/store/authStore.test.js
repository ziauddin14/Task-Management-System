import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../src/store/authStore.js';

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  localStorage.clear();
}

describe('authStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts with a logged-out shape', () => {
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('login() sets user, token, and isAuthenticated', () => {
    const user = { id: '1', name: 'Om', role: 'user' };

    useAuthStore.getState().login(user, 'jwt-token-abc');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.token).toBe('jwt-token-abc');
    expect(state.isAuthenticated).toBe(true);
  });

  it('logout() clears user, token, and isAuthenticated', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-token-abc');

    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('persists to localStorage under the documented key and round-trips the exact values', () => {
    const user = { id: '1', name: 'Om', role: 'user' };

    useAuthStore.getState().login(user, 'jwt-token-abc');

    const raw = localStorage.getItem('auth-storage');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.state.user).toEqual(user);
    expect(parsed.state.token).toBe('jwt-token-abc');
    expect(parsed.state.isAuthenticated).toBe(true);
  });

  it('logout() clears the persisted localStorage value too', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-token-abc');
    useAuthStore.getState().logout();

    const parsed = JSON.parse(localStorage.getItem('auth-storage'));
    expect(parsed.state).toMatchObject({ user: null, token: null, isAuthenticated: false });
  });
});
