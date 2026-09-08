import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import FilterBar from '../../../src/components/dashboard/FilterBar.jsx';
import { useDashboardFilters } from '../../../src/hooks/useDashboardFilters.js';

vi.mock('../../../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [], meta: {} }) }));
vi.mock('../../../src/services/lookupLists.api.js', () => ({
  getLookupList: vi.fn().mockResolvedValue([{ id: 'r1', value: 'IT', isActive: true }]),
}));

function Harness({ isAdmin }) {
  const filtersHook = useDashboardFilters(25);
  return (
    <div>
      <FilterBar filtersHook={filtersHook} isAdmin={isAdmin} />
      <div data-testid="search-param">{filtersHook.params.search || ''}</div>
      <div data-testid="page-param">{filtersHook.page}</div>
    </div>
  );
}

function renderFilterBar(isAdmin = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/?page=3']}>
        <Harness isAdmin={isAdmin} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('FilterBar (docs/08-ui-ux.md §5, docs/09-frontend-features.md §5)', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('debounces search input ~400ms before writing to the URL, and resets page to 1', () => {
    renderFilterBar();

    fireEvent.change(screen.getByLabelText('کام یا کوڈ نمبر تلاش کریں'), { target: { value: 'foo' } });

    expect(screen.getByTestId('search-param').textContent).toBe('');

    act_advance(300);
    expect(screen.getByTestId('search-param').textContent).toBe('');

    act_advance(150);
    expect(screen.getByTestId('search-param').textContent).toBe('foo');
    expect(screen.getByTestId('page-param').textContent).toBe('1');
  });

  it('hides the assignee filter for a non-admin', () => {
    renderFilterBar(false);
    expect(screen.queryByLabelText('Assignee filter')).not.toBeInTheDocument();
  });

  it('shows the assignee filter (Admin only)', () => {
    renderFilterBar(true);
    expect(screen.getByLabelText('Assignee filter')).toBeInTheDocument();
  });

  it('shows "Clear all filters" only once a filter is active', async () => {
    renderFilterBar();
    expect(screen.queryByText('تمام فلٹرز صاف کریں')).not.toBeInTheDocument();

    await screen.findByText('IT'); // the Responsibility <option> lands once its fetch resolves
    fireEvent.change(screen.getByLabelText('Responsibility filter'), { target: { value: 'IT' } });
    expect(screen.getByText('تمام فلٹرز صاف کریں')).toBeInTheDocument();

    fireEvent.click(screen.getByText('تمام فلٹرز صاف کریں'));
    expect(screen.queryByText('تمام فلٹرز صاف کریں')).not.toBeInTheDocument();
  });
});

// vi.advanceTimersByTime wrapped in act() so React state updates triggered by the timer flush
// before the next assertion.
function act_advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}
