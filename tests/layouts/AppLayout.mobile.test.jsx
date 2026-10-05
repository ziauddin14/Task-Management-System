import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '../../src/layouts/AppLayout.jsx';
import { useAuthStore } from '../../src/store/authStore.js';
import { PageActions } from '../../src/contexts/PageActionsPortal.jsx';
import { useDismissPageActions } from '../../src/contexts/PageActionsDismissContext.js';
import { setViewportWidth, resetViewport } from '../helpers/viewport.js';

vi.mock('../../src/services/notifications.api.js', () => ({
  getUnreadNotificationCount: vi.fn().mockResolvedValue({ count: 0 }),
  getNotifications: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { getUnreadNotificationCount, getNotifications } from '../../src/services/notifications.api.js';

function PageWithActions() {
  const dismiss = useDismissPageActions();
  return (
    <div>
      Page With Action
      <PageActions>
        <button type="button" onClick={dismiss}>
          Page Action
        </button>
      </PageActions>
    </div>
  );
}

function renderLayout(url = '/', user = { id: 'u1', name: 'Zia', responsibility: 'IT', role: 'admin' }) {
  useAuthStore.getState().login(user, 'jwt');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>Dashboard Content</div>} />
            <Route path="/tasks" element={<div>Tasks Content</div>} />
            <Route path="/settings" element={<div>Settings Content</div>} />
            <Route path="/users" element={<div>Users Content</div>} />
            <Route path="/actions" element={<PageWithActions />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const appBar = () => screen.getByRole('banner');
const tabBar = () => screen.queryByRole('navigation', { name: 'مرکزی نیویگیشن' });
const sidebarNav = () => screen.queryByRole('navigation', { name: 'Main navigation' });
const moreSheet = () => screen.queryByRole('dialog', { name: 'مزید' });
const notificationPanel = () => document.querySelector('[role="dialog"][aria-label="اطلاعات"]');

describe('AppLayout — the mobile shell (< 768px) and the switch to it', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    mockNavigate.mockReset();
    getUnreadNotificationCount.mockReset();
    getUnreadNotificationCount.mockResolvedValue({ count: 0 });
    getNotifications.mockClear();
  });
  afterEach(() => {
    resetViewport();
    delete window.google;
  });

  describe('which layout', () => {
    it.each([[320], [375], [390], [767]])('%ipx: green app bar + bottom tab bar, and no sidebar', (width) => {
      setViewportWidth(width);
      renderLayout('/');

      expect(appBar()).toHaveClass('bg-tk-green-900', 'h-tk-appbar');
      expect(tabBar()).toBeInTheDocument();
      expect(sidebarNav()).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it.each([[768], [1024], [1280]])('%ipx: the desktop layout as before — sidebar, white header, no tab bar', (width) => {
      setViewportWidth(width);
      renderLayout('/');

      expect(sidebarNav()).toBeInTheDocument();
      expect(tabBar()).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'مینو' })).not.toBeInTheDocument();
      expect(appBar()).not.toHaveClass('bg-tk-green-900');
      // The user's name and responsibility are written out in the header, as before.
      expect(within(appBar()).getByText(/Zia/)).toBeInTheDocument();
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('with no matchMedia at all it is the desktop layout', () => {
      renderLayout('/');
      // (The sidebar's own breakpoint hook has no matchMedia either, so it renders as its closed,
      // aria-hidden drawer — it is there, and it is the desktop layout's.)
      expect(screen.getByRole('navigation', { name: 'Main navigation', hidden: true })).toBeInTheDocument();
      expect(tabBar()).not.toBeInTheDocument();
      expect(appBar()).not.toHaveClass('bg-tk-green-900');
    });
  });

  describe('the app bar', () => {
    beforeEach(() => setViewportWidth(375));

    it('holds the menu button, the title, the bell and the user\'s initial — in one row where only the title can shrink', () => {
      renderLayout('/');
      const bar = appBar();

      expect(within(bar).getByRole('button', { name: 'مینو' })).toHaveClass('h-tk-touch', 'w-tk-touch', 'shrink-0');
      expect(within(bar).getByRole('button', { name: 'اطلاعات' })).toHaveClass('h-tk-touch', 'w-tk-touch', 'shrink-0');
      const title = within(bar).getByText('ٹاسک مینجمنٹ سسٹم');
      expect(title).toHaveClass('min-w-0', 'flex-1', 'truncate'); // it gives way; the bell never does
      expect(within(bar).getByText('Z')).toHaveAttribute('aria-hidden', 'true');
    });

    it('the title names the screen: the app on the dashboard, "ٹاسک" on the task list', () => {
      const first = renderLayout('/');
      expect(within(appBar()).getByText('ٹاسک مینجمنٹ سسٹم')).toBeInTheDocument();
      first.unmount();

      renderLayout('/tasks');
      expect(within(appBar()).getByText('ٹاسک')).toBeInTheDocument();
      expect(within(appBar()).queryByText('ٹاسک مینجمنٹ سسٹم')).not.toBeInTheDocument();
    });

    it('unread notifications: a dot on the bell, the count on the "اطلاعات" tab, and both say so to a screen reader', async () => {
      getUnreadNotificationCount.mockResolvedValue({ count: 3 });
      const { container } = renderLayout('/');

      await waitFor(() => expect(container.querySelector('[data-unread-dot]')).not.toBeNull());
      expect(within(appBar()).getByRole('button', { name: 'اطلاعات، 3 نہ پڑھی گئی' })).toBeInTheDocument();
      expect(tabBar().querySelector('[data-tab-badge]')).toHaveTextContent(/^3$/);
    });

    it('nothing unread: no dot and no badge', async () => {
      const { container } = renderLayout('/');
      await waitFor(() => expect(getUnreadNotificationCount).toHaveBeenCalled());
      expect(container.querySelector('[data-unread-dot]')).toBeNull();
      expect(tabBar().querySelector('[data-tab-badge]')).toBeNull();
    });
  });

  describe('the tab bar in the layout', () => {
    beforeEach(() => setViewportWidth(375));

    it('an Admin has five tabs, a normal user four (no reports)', () => {
      const admin = renderLayout('/');
      expect(within(tabBar()).getAllByRole('listitem')).toHaveLength(5);
      admin.unmount();

      renderLayout('/', { id: 'u2', name: 'Ali', role: 'user' });
      expect(within(tabBar()).getAllByRole('listitem')).toHaveLength(4);
      expect(within(tabBar()).queryByText('رپورٹس')).not.toBeInTheDocument();
    });

    it('the page is given room at its end, so nothing it renders sits behind the fixed bar', () => {
      renderLayout('/');
      const main = screen.getByRole('main');
      expect(main).toContainElement(screen.getByText('Dashboard Content'));
      expect(main).not.toContainElement(tabBar());
      // The padding is the bar's height + the home-indicator inset + a little air (set inline).
      expect(main.outerHTML).toMatch(/padding-bottom|style=/);
    });
  });

  describe('notifications', () => {
    beforeEach(() => setViewportWidth(375));

    it('the bell and the "اطلاعات" tab open the one existing notification panel', async () => {
      renderLayout('/');
      expect(notificationPanel()).toHaveAttribute('aria-hidden', 'true');
      expect(getNotifications).not.toHaveBeenCalled();

      fireEvent.click(within(appBar()).getByRole('button', { name: 'اطلاعات' }));
      expect(notificationPanel()).toHaveAttribute('aria-hidden', 'false');
      await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(1));

      fireEvent.click(within(notificationPanel()).getByRole('button', { name: 'اطلاعات بند کریں' }));
      expect(notificationPanel()).toHaveAttribute('aria-hidden', 'true');

      fireEvent.click(within(tabBar()).getByRole('button', { name: 'اطلاعات' }));
      expect(notificationPanel()).toHaveAttribute('aria-hidden', 'false');
      expect(document.querySelectorAll('[role="dialog"][aria-label="اطلاعات"]')).toHaveLength(1);
    });
  });

  describe('"مزید" — what the old drawer held', () => {
    beforeEach(() => setViewportWidth(375));

    it('the menu button and the "مزید" tab open the same sheet', () => {
      renderLayout('/');
      expect(moreSheet()).not.toBeInTheDocument();

      fireEvent.click(within(appBar()).getByRole('button', { name: 'مینو' }));
      expect(moreSheet()).toBeInTheDocument();
      fireEvent.click(within(moreSheet()).getByRole('button', { name: 'بند کریں' }));
      expect(moreSheet()).not.toBeInTheDocument();

      fireEvent.click(within(tabBar()).getByRole('button', { name: 'مزید' }));
      expect(moreSheet()).toBeInTheDocument();
      expect(screen.getAllByRole('dialog', { name: 'مزید' })).toHaveLength(1);
    });

    it('shows who is signed in, and the links the tabs do not cover: settings, and users for an Admin', () => {
      renderLayout('/');
      fireEvent.click(within(appBar()).getByRole('button', { name: 'مینو' }));
      const sheet = moreSheet();

      expect(sheet).toHaveTextContent('Zia');
      expect(sheet).toHaveTextContent('IT');
      expect(within(sheet).getByRole('link', { name: 'ترتیبات' })).toHaveAttribute('href', '/settings');
      expect(within(sheet).getByRole('link', { name: 'تمام یوزرز' })).toHaveAttribute('href', '/users');
      expect(within(sheet).getByRole('button', { name: 'لاگ آؤٹ' })).toBeInTheDocument();
    });

    it('a normal user has no users link', () => {
      renderLayout('/', { id: 'u2', name: 'Ali', role: 'user' });
      fireEvent.click(within(appBar()).getByRole('button', { name: 'مینو' }));

      expect(within(moreSheet()).getByRole('link', { name: 'ترتیبات' })).toBeInTheDocument();
      expect(within(moreSheet()).queryByRole('link', { name: 'تمام یوزرز' })).not.toBeInTheDocument();
    });

    it('choosing a link closes the sheet', () => {
      renderLayout('/');
      fireEvent.click(within(appBar()).getByRole('button', { name: 'مینو' }));

      fireEvent.click(within(moreSheet()).getByRole('link', { name: 'ترتیبات' }));

      expect(moreSheet()).not.toBeInTheDocument();
      expect(screen.getByText('Settings Content')).toBeInTheDocument();
      // ...and "مزید" is now the current tab.
      expect(within(tabBar()).getByRole('button', { name: 'مزید' })).toHaveAttribute('aria-current', 'page');
    });

    it('logout does what it always did: clears the session and goes to the login page', () => {
      renderLayout('/');
      fireEvent.click(within(appBar()).getByRole('button', { name: 'مینو' }));

      fireEvent.click(within(moreSheet()).getByRole('button', { name: 'لاگ آؤٹ' }));

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().token).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('a page\'s own actions (export, reminders…) appear inside the sheet, since the app bar has no room for them', () => {
      renderLayout('/actions');
      expect(screen.queryByRole('button', { name: 'Page Action' })).not.toBeInTheDocument();

      fireEvent.click(within(appBar()).getByRole('button', { name: 'مینو' }));

      expect(within(moreSheet()).getByRole('button', { name: 'Page Action' })).toBeInTheDocument();
      expect(within(appBar()).queryByRole('button', { name: 'Page Action' })).not.toBeInTheDocument();
    });

    it('such an action can close the sheet before opening a dialog of its own', () => {
      renderLayout('/actions');
      fireEvent.click(within(appBar()).getByRole('button', { name: 'مینو' }));

      fireEvent.click(within(moreSheet()).getByRole('button', { name: 'Page Action' }));

      expect(moreSheet()).not.toBeInTheDocument();
    });
  });
});
