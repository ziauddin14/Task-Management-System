import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersPage from '../../src/pages/UsersPage.jsx';

const { sampleUsers } = vi.hoisted(() => ({
  sampleUsers: [
    { id: 'u1', name: 'Ali', email: 'ali@example.com', responsibility: 'IT', role: 'user', isActive: true },
    { id: 'u2', name: 'Admin User', email: 'admin@example.com', responsibility: 'Management', role: 'admin', isActive: false },
  ],
}));

vi.mock('../../src/services/users.api.js', () => ({
  getUsers: vi.fn().mockResolvedValue({ items: sampleUsers, meta: { page: 1, totalPages: 1, total: 2 } }),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock('../../src/services/lookupLists.api.js', () => ({
  getLookupList: vi.fn().mockResolvedValue([{ id: 'r1', value: 'IT', isActive: true }]),
  createLookupValue: vi.fn(),
  updateLookupValue: vi.fn(),
}));

import { getUsers } from '../../src/services/users.api.js';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersPage />
    </QueryClientProvider>
  );
}

describe('UsersPage (docs/08-ui-ux.md §8)', () => {
  beforeEach(() => getUsers.mockClear());

  it('renders the users table from useUsers', async () => {
    renderPage();
    expect(await screen.findByText('Ali')).toBeInTheDocument();
    expect(screen.getByText('ali@example.com')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    it('the search box debounces ~400ms before calling GET /users with the new search term', async () => {
      renderPage();
      await act(async () => {}); // let the initial fetch settle

      fireEvent.change(screen.getByLabelText('Naam ya email talaash karein'), { target: { value: 'ali' } });
      act(() => vi.advanceTimersByTime(399));
      expect(getUsers).not.toHaveBeenCalledWith({ search: 'ali' });

      act(() => vi.advanceTimersByTime(1));
      expect(getUsers).toHaveBeenCalledWith({ search: 'ali' });
    });
  });

  it('"+ New User" opens the form in create mode', async () => {
    renderPage();
    await screen.findByText('Ali');

    fireEvent.click(screen.getByText('Naya User'));

    expect(await screen.findByRole('dialog', { name: 'Naya User' })).toBeInTheDocument();
  });

  it('row "Edit" opens the form pre-filled in edit mode', async () => {
    renderPage();
    await screen.findByText('Ali');

    fireEvent.click(screen.getAllByText('Edit')[0]);

    expect(await screen.findByRole('dialog', { name: 'User Edit Karein' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ali')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ali@example.com')).toBeInTheDocument();
  });
});
