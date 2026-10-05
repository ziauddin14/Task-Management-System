import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../src/services/users.api.js', () => ({
  getUsers: vi.fn().mockResolvedValue({ items: [{ id: 'u1', name: 'Ali' }, { id: 'u2', name: 'Bilal' }], meta: {} }),
}));

import MobileFilterBar from '../../../src/components/mobile/MobileFilterBar.jsx';
import { useDashboardFilters } from '../../../src/hooks/useDashboardFilters.js';
import { getUsers } from '../../../src/services/users.api.js';

// The real filter hook over a real (in-memory) URL: what the bar does is what lands in the query.
function Harness({ isAdmin }) {
  const filtersHook = useDashboardFilters(25);
  const location = useLocation();
  return (
    <div>
      <MobileFilterBar filtersHook={filtersHook} isAdmin={isAdmin} />
      <div data-testid="query">{location.search}</div>
      <div data-testid="page">{filtersHook.page}</div>
    </div>
  );
}

function renderBar(url = '/tasks', isAdmin = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Harness isAdmin={isAdmin} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const query = () => new URLSearchParams(screen.getByTestId('query').textContent);
const chipRow = () => screen.getByRole('list', { name: 'فلٹرز' });
const activeChips = () => [...chipRow().querySelectorAll('[data-active-chip]')].map((el) => el.textContent);
const filterButton = () => screen.getByRole('button', { name: /^فلٹر/ });

describe('MobileFilterBar — search, the "فلٹر" button and the chip row', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 10, 0, 0));
    getUsers.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('active filters as chips', () => {
    it('shows every filter in force as a removable chip, in dark green', () => {
      renderBar('/tasks?status=pending&performanceRating=weak&ratingSource=synthetic');

      expect(activeChips()).toEqual(['پینڈنگ', 'کمزور', 'تخمینی']);
      chipRow().querySelectorAll('[data-active-chip]').forEach((el) => expect(el).toHaveClass('bg-tk-green-900', 'text-white'));
      expect(screen.getByRole('button', { name: 'پینڈنگ — فلٹر ہٹائیں' })).toBeInTheDocument();
    });

    it('tapping a chip removes just that filter from the URL and resets the page', () => {
      renderBar('/tasks?status=pending&performanceRating=weak&page=3');

      fireEvent.click(screen.getByRole('button', { name: 'کمزور — فلٹر ہٹائیں' }));

      expect(query().get('performanceRating')).toBeNull();
      expect(query().get('status')).toBe('pending');
      expect(query().get('page')).toBeNull();
      expect(activeChips()).toEqual(['پینڈنگ']);
    });

    it('the zimmedar chip carries that person\'s name (Admin)', async () => {
      renderBar('/tasks?assigneeId=u2');
      expect(await screen.findByRole('button', { name: 'Bilal — فلٹر ہٹائیں' })).toBeInTheDocument();
    });

    it('the unrated filter reads "بغیر درجہ بندی", and "اصل" names the real-ratings filter', () => {
      renderBar('/tasks?performanceRating=-&ratingSource=real');
      expect(activeChips()).toEqual(['بغیر درجہ بندی', 'اصل']);
    });

    it('a date range is ONE chip, and removing it clears the whole range', () => {
      renderBar('/tasks?dateType=entry&from=2026-01-01&to=2026-03-31');
      expect(activeChips()).toEqual(['تاریخِ اندراج: 01-01-26 تا 31-03-26']);

      fireEvent.click(screen.getByRole('button', { name: /تاریخِ اندراج.*فلٹر ہٹائیں/ }));

      expect(screen.getByTestId('query').textContent).toBe('');
    });

    it('the search text is not a chip here — it is already visible in the search field', () => {
      renderBar('/tasks?search=audit&status=closed');
      expect(activeChips()).toEqual(['کلوز']);
      expect(screen.getByRole('searchbox')).toHaveValue('audit');
    });
  });

  describe('the "فلٹر" button', () => {
    it('shows how many filters are in force, as a badge and in its name', () => {
      const { container } = renderBar('/tasks?status=pending&performanceRating=weak');
      expect(container.querySelector('[data-filter-count]')).toHaveTextContent(/^2$/);
      expect(filterButton()).toHaveAccessibleName('فلٹر، 2 فعال');
    });

    it('has no badge when nothing is filtered', () => {
      const { container } = renderBar('/tasks');
      expect(container.querySelector('[data-filter-count]')).toBeNull();
      expect(filterButton()).toHaveAccessibleName('فلٹر');
    });

    it('opens the filter sheet, showing the filters in force', () => {
      renderBar('/tasks?status=pending');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(filterButton());

      const sheet = screen.getByRole('dialog', { name: 'فلٹر' });
      expect(within(within(sheet).getByRole('group', { name: 'کام کی کیفیت' })).getByRole('button', { name: 'پینڈنگ' })).toHaveAttribute('aria-pressed', 'true');
      expect(filterButton()).toHaveAttribute('aria-expanded', 'true');
    });

    it('applying the sheet writes all its filters to the URL at once, resets the page and closes it', () => {
      renderBar('/tasks?status=pending&page=4&search=audit');
      fireEvent.click(filterButton());
      const sheet = screen.getByRole('dialog', { name: 'فلٹر' });

      fireEvent.click(within(within(sheet).getByRole('group', { name: 'کام کی کیفیت' })).getByRole('button', { name: 'کلوز' }));
      fireEvent.click(within(within(sheet).getByRole('group', { name: 'کارکردگی' })).getByRole('button', { name: 'بہتر' }));
      fireEvent.click(within(within(sheet).getByRole('group', { name: 'تاریخ' })).getByRole('button', { name: 'اس ماہ' }));
      fireEvent.click(within(sheet).getByRole('button', { name: 'لاگو کریں' }));

      expect(Object.fromEntries(query())).toEqual({
        status: 'closed',
        performanceRating: 'good',
        dateType: 'deadline',
        from: '2026-10-01',
        to: '2026-10-31',
        search: 'audit', // untouched
      });
      expect(screen.getByTestId('page').textContent).toBe('1');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(activeChips()).toEqual(['کلوز', 'بہتر', 'آخری تاریخ: اس ماہ']);
    });

    it('"صاف کریں" in the sheet clears the filters but keeps the search', () => {
      renderBar('/tasks?status=pending&performanceRating=weak&search=audit');
      fireEvent.click(filterButton());

      fireEvent.click(within(screen.getByRole('dialog', { name: 'فلٹر' })).getByRole('button', { name: 'صاف کریں' }));

      expect(Object.fromEntries(query())).toEqual({ search: 'audit' });
      expect(screen.queryByRole('list', { name: 'فلٹرز' })).toBeInTheDocument(); // the quick chips remain
      expect(activeChips()).toEqual([]);
    });
  });

  describe('quick date chips', () => {
    const quickChips = () => [...chipRow().querySelectorAll('li button')].filter((b) => !b.querySelector('[data-active-chip]')).map((b) => b.textContent);

    it('offers آج، اس ہفتے، اس ماہ as light chips after the active ones', () => {
      renderBar('/tasks?status=pending');
      expect(quickChips()).toEqual(['آج', 'اس ہفتے', 'اس ماہ']);
      expect([...chipRow().querySelectorAll('li')].map((li) => li.textContent)).toEqual(['پینڈنگ', 'آج', 'اس ہفتے', 'اس ماہ']);
    });

    it('tapping one sets the deadline range in the URL; it then shows as an active chip and leaves the quick list', () => {
      renderBar('/tasks');

      fireEvent.click(screen.getByRole('button', { name: 'اس ہفتے' }));

      expect(Object.fromEntries(query())).toEqual({ from: '2026-10-05', to: '2026-10-11' });
      expect(activeChips()).toEqual(['آخری تاریخ: اس ہفتے']);
      expect(quickChips()).toEqual(['آج', 'اس ماہ']);
    });

    it('keeps the date field already chosen', () => {
      renderBar('/tasks?dateType=entry&from=2026-01-01');
      fireEvent.click(screen.getByRole('button', { name: 'آج' }));
      expect(Object.fromEntries(query())).toEqual({ dateType: 'entry', from: '2026-10-06', to: '2026-10-06' });
    });
  });

  describe('search', () => {
    it('typing filters after a pause (debounced), not on every key', () => {
      vi.useRealTimers();
      vi.useFakeTimers();
      renderBar('/tasks?status=pending&page=2');

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'audit' } });
      expect(query().get('search')).toBeNull();

      act(() => vi.advanceTimersByTime(450));

      expect(query().get('search')).toBe('audit');
      expect(query().get('status')).toBe('pending');
      expect(query().get('page')).toBeNull();
    });

    it('clearing the box removes the search filter', () => {
      vi.useRealTimers();
      vi.useFakeTimers();
      renderBar('/tasks?search=audit');

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
      act(() => vi.advanceTimersByTime(450));

      expect(query().get('search')).toBeNull();
    });

    it('is labelled, and at least 44px tall', () => {
      renderBar('/tasks');
      expect(screen.getByRole('searchbox', { name: 'کام یا کوڈ نمبر تلاش کریں' })).toBeInTheDocument();
      expect(screen.getByRole('searchbox').closest('label')).toHaveClass('h-[48px]');
    });
  });

  describe('roles', () => {
    it('a normal user: no zimmedar list is fetched and the sheet has no zimmedar filter', async () => {
      renderBar('/tasks', false);
      fireEvent.click(filterButton());

      expect(screen.queryByLabelText('ذمہ دار')).not.toBeInTheDocument();
      await waitFor(() => expect(getUsers).not.toHaveBeenCalled());
    });

    it('an Admin: the sheet lists the assignable users', async () => {
      renderBar('/tasks', true);
      fireEvent.click(filterButton());
      expect(await screen.findByRole('option', { name: 'Bilal' })).toBeInTheDocument();
    });
  });
});
