import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useDashboardFilters } from '../../src/hooks/useDashboardFilters.js';

function wrapper({ children }) {
  return <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>;
}

describe('useDashboardFilters (docs/09-frontend-features.md §5)', () => {
  it('setFilter writes the value into the URL params', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper });

    act(() => result.current.setFilter('status', 'ongoing'));

    expect(result.current.params.status).toBe('ongoing');
    expect(result.current.apiFilters.status).toBe('ongoing');
  });

  it('any filter/search/sort change resets page to 1', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper });

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.setFilter('status', 'ongoing'));
    expect(result.current.page).toBe(1);
  });

  it('toggleKpiFilter applies a status/performanceRating filter, and clicking the same value again clears it', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper });

    act(() => result.current.toggleKpiFilter('performanceRating', 'excellent'));
    expect(result.current.params.performanceRating).toBe('excellent');

    act(() => result.current.toggleKpiFilter('performanceRating', 'excellent'));
    expect(result.current.params.performanceRating).toBeUndefined();
  });

  it('clearAllFilters removes every filter param but leaves nothing stale behind', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper });

    act(() => {
      result.current.setFilter('status', 'ongoing');
      result.current.setFilter('search', 'foo');
    });
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearAllFilters());

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.params.status).toBeUndefined();
    expect(result.current.params.search).toBeUndefined();
  });

  it('maps a deadline-type date range into deadlineFrom/deadlineTo for the API filter object', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper });

    // Each setFilter() call is issued in its own act() — matching real usage, where each is a
    // separate DOM event with a render in between (see setFilters' doc comment for why two
    // setFilter calls issued back-to-back in the SAME event would clobber each other).
    act(() => result.current.setFilter('from', '2026-01-01'));
    act(() => result.current.setFilter('to', '2026-01-31'));

    expect(result.current.apiFilters.deadlineFrom).toBe('2026-01-01');
    expect(result.current.apiFilters.deadlineTo).toBe('2026-01-31');
    expect(result.current.apiFilters.entryFrom).toBeUndefined();
  });

  it('maps an entry-type date range into entryFrom/entryTo instead', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper });

    act(() => result.current.setFilter('dateType', 'entry'));
    act(() => result.current.setFilter('from', '2026-02-01'));

    expect(result.current.apiFilters.entryFrom).toBe('2026-02-01');
    expect(result.current.apiFilters.deadlineFrom).toBeUndefined();
  });

  it('setFilters applies multiple params atomically in one call (e.g. clearing two active KPI filters at once)', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper });

    act(() => result.current.setFilter('status', 'ongoing'));
    act(() => result.current.setFilter('performanceRating', 'excellent'));
    expect(result.current.params.status).toBe('ongoing');
    expect(result.current.params.performanceRating).toBe('excellent');

    act(() => result.current.setFilters({ status: undefined, performanceRating: undefined }));

    expect(result.current.params.status).toBeUndefined();
    expect(result.current.params.performanceRating).toBeUndefined();
  });

  it('carries the given pageSize into apiFilters.limit', () => {
    const { result } = renderHook(() => useDashboardFilters(50), { wrapper });
    expect(result.current.apiFilters.limit).toBe(50);
  });
});
