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
    expect(screen.getByText('غیر فعال')).toBeInTheDocument();
  });

  // Prompt 3E — نام, ذمہ داری, ای میل, کردار, کیفیت, اقدامات in this exact right-to-left order.
  it('renders the table headers in the exact required Urdu order', async () => {
    renderPage();
    await screen.findByText('Ali');
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['نام', 'ذمہ داری', 'ای میل', 'کردار', 'کیفیت', 'اقدامات']);
  });

  // Prompt 3D — the Lookup List panel no longer renders on this page (its data/model/API are
  // untouched, see components/users/LookupListPanel.jsx, just not mounted here anymore).
  it('does not render the Lookup List panel', async () => {
    renderPage();
    await screen.findByText('Ali');
    expect(screen.queryByText('Zimmedari List')).not.toBeInTheDocument();
  });

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    it('the search box debounces ~400ms before calling GET /users with the new search term', async () => {
      renderPage();
      await act(async () => {}); // let the initial fetch settle

      fireEvent.change(screen.getByLabelText('نام یا ای میل تلاش کریں'), { target: { value: 'ali' } });
      act(() => vi.advanceTimersByTime(399));
      expect(getUsers).not.toHaveBeenCalledWith({ search: 'ali' });

      act(() => vi.advanceTimersByTime(1));
      expect(getUsers).toHaveBeenCalledWith({ search: 'ali' });
    });
  });

  it('"+ New User" opens the form in create mode', async () => {
    renderPage();
    await screen.findByText('Ali');

    fireEvent.click(screen.getByText('نیا صارف'));

    expect(await screen.findByRole('dialog', { name: 'نیا صارف' })).toBeInTheDocument();
  });

  it('row "Edit" opens the form pre-filled in edit mode', async () => {
    renderPage();
    await screen.findByText('Ali');

    fireEvent.click(screen.getAllByText('ترمیم کریں')[0]);

    expect(await screen.findByRole('dialog', { name: 'صارف میں ترمیم کریں' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ali')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ali@example.com')).toBeInTheDocument();
  });
});
