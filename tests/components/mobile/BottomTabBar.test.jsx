import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import BottomTabBar from '../../../src/components/mobile/BottomTabBar.jsx';
import { tabsForRole } from '../../../src/utils/mobileTabs.js';

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderBar({ url = '/', ...props } = {}) {
  const onOpenNotifications = vi.fn();
  const onOpenMore = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <Where />
              <BottomTabBar isAdmin onOpenNotifications={onOpenNotifications} onOpenMore={onOpenMore} {...props} />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
  return { ...utils, onOpenNotifications, onOpenMore };
}

const nav = () => screen.getByRole('navigation', { name: 'مرکزی نیویگیشن' });
const tabLabels = () => within(nav()).getAllByRole('listitem').map((li) => li.textContent.replace(/\d+\+?$/, '').replace(/^\d+\+?/, ''));
const tab = (label) => within(nav()).getAllByRole('listitem').find((li) => li.textContent.includes(label)).firstElementChild;

describe('BottomTabBar — the mobile layout\'s five destinations', () => {
  describe('tabs by role', () => {
    it('an Admin gets ڈیش بورڈ، ٹاسک، رپورٹس، اطلاعات، مزید — in that order', () => {
      renderBar({ isAdmin: true });
      expect(tabLabels()).toEqual(['ڈیش بورڈ', 'ٹاسک', 'رپورٹس', 'اطلاعات', 'مزید']);
    });

    it('a normal user gets no "رپورٹس" tab (that route is Admin-only): four tabs', () => {
      renderBar({ isAdmin: false });
      expect(tabLabels()).toEqual(['ڈیش بورڈ', 'ٹاسک', 'اطلاعات', 'مزید']);
      expect(within(nav()).queryByText('رپورٹس')).not.toBeInTheDocument();
    });

    it('the columns follow the number of tabs, so four tabs fill the bar as five do', () => {
      const admin = renderBar({ isAdmin: true });
      expect(within(nav()).getByRole('list')).toHaveClass('grid', 'grid-cols-5');
      admin.unmount();
      renderBar({ isAdmin: false });
      expect(within(nav()).getByRole('list')).toHaveClass('grid', 'grid-cols-4');
      expect(within(nav()).getByRole('list')).not.toHaveClass('grid-cols-5');
    });

    it('every tab is an EXISTING route or feature: three links to real routes, two buttons opening existing panels', () => {
      renderBar({ isAdmin: true });
      expect(tab('ڈیش بورڈ')).toHaveAttribute('href', '/');
      expect(tab('ٹاسک')).toHaveAttribute('href', '/tasks');
      expect(tab('رپورٹس')).toHaveAttribute('href', '/reports/user-summary');
      expect(tab('اطلاعات').tagName).toBe('BUTTON');
      expect(tab('مزید').tagName).toBe('BUTTON');
    });

    it('tabsForRole is the single source of that list', () => {
      expect(tabsForRole(true).map((t) => t.key)).toEqual(['dashboard', 'tasks', 'reports', 'notifications', 'more']);
      expect(tabsForRole(false).map((t) => t.key)).toEqual(['dashboard', 'tasks', 'notifications', 'more']);
    });
  });

  describe('active state', () => {
    it.each([
      ['/', 'ڈیش بورڈ'],
      ['/tasks', 'ٹاسک'],
      ['/reports/user-summary', 'رپورٹس'],
    ])('at %s the "%s" tab is aria-current="page", green and bold, with the pill behind its icon', (url, label) => {
      renderBar({ url });
      const active = tab(label);

      expect(active).toHaveAttribute('aria-current', 'page');
      expect(active).toHaveClass('text-tk-green-900');
      expect(active.firstElementChild).toHaveClass('bg-tk-green-100', 'rounded-tk-pill');
      expect(within(active).getByText(label)).toHaveClass('font-semibold');
    });

    it('only one tab is current, and the others are muted with no pill', () => {
      renderBar({ url: '/tasks' });
      expect(nav().querySelectorAll('[aria-current]')).toHaveLength(1);

      const other = tab('ڈیش بورڈ');
      expect(other).not.toHaveAttribute('aria-current');
      expect(other).toHaveClass('text-tk-muted');
      expect(other.firstElementChild).not.toHaveClass('bg-tk-green-100');
      expect(within(other).getByText('ڈیش بورڈ')).not.toHaveClass('font-semibold');
    });

    it.each([['/settings'], ['/users']])('"مزید" is the current tab while a screen behind it (%s) is showing', (url) => {
      renderBar({ url });
      expect(tab('مزید')).toHaveAttribute('aria-current', 'page');
      expect(nav().querySelectorAll('[aria-current]')).toHaveLength(1);
    });

    it('the "اطلاعات" tab is never "current" — it opens a panel, it is not a page', () => {
      renderBar({ url: '/', isNotificationsOpen: true });
      expect(tab('اطلاعات')).not.toHaveAttribute('aria-current');
      expect(tab('اطلاعات')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('the notification badge', () => {
    it('shows the unread count on the "اطلاعات" tab, and says it in the tab\'s name', () => {
      renderBar({ unreadCount: 3 });
      const badge = nav().querySelector('[data-tab-badge]');
      expect(badge).toHaveTextContent(/^3$/);
      expect(tab('اطلاعات')).toContainElement(badge);
      expect(tab('اطلاعات')).toHaveAccessibleName('اطلاعات، 3 نہ پڑھی گئی');
    });

    it('no badge at zero', () => {
      renderBar({ unreadCount: 0 });
      expect(nav().querySelector('[data-tab-badge]')).toBeNull();
      expect(tab('اطلاعات')).toHaveAccessibleName('اطلاعات');
    });

    it('caps at "99+"', () => {
      renderBar({ unreadCount: 250 });
      expect(nav().querySelector('[data-tab-badge]')).toHaveTextContent('99+');
    });

    it('only the notifications tab ever carries a badge', () => {
      renderBar({ unreadCount: 7 });
      expect(nav().querySelectorAll('[data-tab-badge]')).toHaveLength(1);
    });
  });

  describe('behaviour', () => {
    it('"اطلاعات" opens the notification panel and "مزید" opens the menu — neither navigates', () => {
      const { onOpenNotifications, onOpenMore } = renderBar({ url: '/tasks?status=pending' });

      fireEvent.click(tab('اطلاعات'));
      fireEvent.click(tab('مزید'));

      expect(onOpenNotifications).toHaveBeenCalledTimes(1);
      expect(onOpenMore).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('where').textContent).toBe('/tasks?status=pending');
    });

    it('a link tab navigates to its route', () => {
      renderBar({ url: '/' });
      fireEvent.click(tab('رپورٹس'));
      expect(screen.getByTestId('where').textContent).toBe('/reports/user-summary');
    });

    it('ڈیش بورڈ <-> ٹاسک keeps the filters: they are one filter state shared through the query string', () => {
      renderBar({ url: '/?status=pending&assigneeId=u1' });
      expect(tab('ٹاسک')).toHaveAttribute('href', '/tasks?status=pending&assigneeId=u1');

      fireEvent.click(tab('ٹاسک'));
      expect(screen.getByTestId('where').textContent).toBe('/tasks?status=pending&assigneeId=u1');
      expect(tab('ڈیش بورڈ')).toHaveAttribute('href', '/?status=pending&assigneeId=u1');
    });

    it('...but the filters do not leak into any other tab, or back from one', () => {
      const first = renderBar({ url: '/tasks?status=pending' });
      expect(tab('رپورٹس')).toHaveAttribute('href', '/reports/user-summary');
      first.unmount();

      renderBar({ url: '/reports/user-summary?from=2026-01-01' });
      expect(tab('ڈیش بورڈ')).toHaveAttribute('href', '/');
      expect(tab('ٹاسک')).toHaveAttribute('href', '/tasks');
    });
  });

  describe('as a bar', () => {
    it('is a labelled navigation landmark, fixed to the bottom edge, 76px tall, hidden when printing', () => {
      renderBar();
      expect(nav()).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'no-print');
      expect(within(nav()).getByRole('list')).toHaveClass('h-tk-tabbar');
    });

    it('leaves room for the phone\'s home indicator (safe-area inset)', () => {
      renderBar();
      expect(nav()).toHaveClass('pb-[env(safe-area-inset-bottom,0px)]');
    });

    it('every tab shows an icon AND a visible label, and fills its whole cell (a touch target well over 44px)', () => {
      renderBar();
      within(nav()).getAllByRole('listitem').forEach((li) => {
        const control = li.firstElementChild;
        expect(control.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
        expect(control).toHaveClass('h-full', 'w-full');
        expect(control.textContent.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
