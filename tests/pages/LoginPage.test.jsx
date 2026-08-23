import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../../src/pages/LoginPage.jsx';
import { useAuthStore } from '../../src/store/authStore.js';

vi.mock('../../src/services/auth.api.js', () => ({ loginWithGoogle: vi.fn(), getCurrentUser: vi.fn() }));
import { loginWithGoogle } from '../../src/services/auth.api.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>
  );
}

// @react-oauth/google is mocked globally (src/setupTests.js) — "Mock Google Sign-In" simulates a
// successful credential response, "Mock Google Error" simulates the popup/One Tap onError path.
describe('LoginPage (docs/11-auth.md §2.2-2.3)', () => {
  beforeEach(() => {
    resetStore();
    loginWithGoogle.mockReset();
    mockNavigate.mockReset();
  });

  it('renders no inline alert before any login attempt', () => {
    renderLoginPage();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // docs/08-ui-ux.md §2 — the Login screen's actual visual content (a gap the Phase 10.2 kickoff
  // never covered — see Phase 10.7 report §B).
  it('renders the system name, Urdu department name, and the fixed salutation line', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: 'Task Management System' })).toBeInTheDocument();
    expect(screen.getByText('خود کفالت شعبہ جات (دعوتِ اسلامی)')).toBeInTheDocument();
    expect(screen.getByText('صلوٰۃ علی الحبیب ﷺ')).toBeInTheDocument();
  });

  it("Google's own sign-in failure (not a backend rejection) also shows the generic message inline, not just a toast", async () => {
    renderLoginPage();

    fireEvent.click(screen.getByText('Mock Google Error'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Login mumkin nahi hua, dobara koshish karein');
    expect(loginWithGoogle).not.toHaveBeenCalled(); // this path never reaches the backend at all
  });

  it.each([
    ['USER_NOT_FOUND', 'Yeh email system mein register nahi hai. Admin se rabta karein.'],
    ['USER_INACTIVE', 'Aap ka account fi-alhaal band hai'],
    ['INVALID_TOKEN', 'Login mumkin nahi hua, dobara koshish karein'],
  ])('shows the backend-provided message inline for a %s failure, not just a toast', async (code, message) => {
    loginWithGoogle.mockRejectedValue(Object.assign(new Error(message), { code, name: 'ApiError' }));
    renderLoginPage();

    fireEvent.click(screen.getByText('Mock Google Sign-In'));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('a successful login on retry clears the prior inline alert', async () => {
    loginWithGoogle
      .mockRejectedValueOnce(Object.assign(new Error('Invalid'), { code: 'INVALID_TOKEN' }))
      .mockResolvedValueOnce({ token: 'jwt-abc', user: { id: '1', name: 'Om', role: 'user' } });
    renderLoginPage();

    fireEvent.click(screen.getByText('Mock Google Sign-In'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Mock Google Sign-In'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
