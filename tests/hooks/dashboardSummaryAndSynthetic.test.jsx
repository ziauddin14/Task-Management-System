import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/services/apiClient.js', () => ({
  default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import apiClient from '../../src/services/apiClient.js';
import { getDashboardSummary } from '../../src/services/dashboard.api.js';
import { editSyntheticRating, removeSyntheticRating } from '../../src/services/tasks.api.js';
import { useDashboardSummary } from '../../src/hooks/useDashboardSummary.js';
import { useDashboardFilters } from '../../src/hooks/useDashboardFilters.js';
import { useEditSyntheticRating, useRemoveSyntheticRating } from '../../src/hooks/useSyntheticRatingMutations.js';

const summary = { byStatus: {}, byPerformance: {}, total: 0, ratings: { bands: {}, ratedCount: 0, unratedCount: 0, syntheticCount: 0, overallQuality: null } };

function queryWrapper(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.patch.mockReset();
  apiClient.delete.mockReset();
});

describe('dashboard.api / tasks.api — the new calls', () => {
  it('getDashboardSummary sends the given filters as query params', async () => {
    apiClient.get.mockResolvedValue({ data: { data: summary } });

    const result = await getDashboardSummary({ status: 'pending', assigneeId: 'u1' });

    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/summary', { params: { status: 'pending', assigneeId: 'u1' } });
    expect(result).toBe(summary);
  });

  it('getDashboardSummary with no argument sends no filters', async () => {
    apiClient.get.mockResolvedValue({ data: { data: summary } });
    await getDashboardSummary();
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/summary', { params: {} });
  });

  it('editSyntheticRating PATCHes /tasks/:id/synthetic-rating with the payload and returns the task', async () => {
    apiClient.patch.mockResolvedValue({ data: { data: { id: 't2', performanceRating: 'excellent' } } });

    const result = await editSyntheticRating('t2', { assumedPercent: 92, note: 'x' });

    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/t2/synthetic-rating', { assumedPercent: 92, note: 'x' });
    expect(result).toEqual({ id: 't2', performanceRating: 'excellent' });
  });

  it('removeSyntheticRating DELETEs /tasks/:id/synthetic-rating, the optional note in the body', async () => {
    apiClient.delete.mockResolvedValue({ data: { data: { id: 't2', performanceRating: '-' } } });

    const result = await removeSyntheticRating('t2', { note: 'y' });
    await removeSyntheticRating('t3');

    expect(apiClient.delete).toHaveBeenNthCalledWith(1, '/tasks/t2/synthetic-rating', { data: { note: 'y' } });
    expect(apiClient.delete).toHaveBeenNthCalledWith(2, '/tasks/t3/synthetic-rating', { data: {} });
    expect(result).toEqual({ id: 't2', performanceRating: '-' });
  });
});

describe('useDashboardSummary', () => {
  it('fetches with the filters it is given', async () => {
    apiClient.get.mockResolvedValue({ data: { data: summary } });

    const { result } = renderHook(() => useDashboardSummary({ status: 'closed' }), { wrapper: queryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/summary', { params: { status: 'closed' } });
  });

  it('when the filters change it refetches, keeping the previous figures on screen meanwhile', async () => {
    const first = { ...summary, total: 152 };
    const second = { ...summary, total: 53 };
    let resolveSecond;
    apiClient.get.mockResolvedValueOnce({ data: { data: first } }).mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    const { result, rerender } = renderHook(({ filters }) => useDashboardSummary(filters), {
      wrapper: queryWrapper(),
      initialProps: { filters: {} },
    });
    await waitFor(() => expect(result.current.data).toEqual(first));
    expect(result.current.isPlaceholderData).toBe(false);

    rerender({ filters: { status: 'pending' } });

    await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith('/dashboard/summary', { params: { status: 'pending' } }));
    expect(result.current.data).toEqual(first); // previous figures, not a blank
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await act(async () => resolveSecond({ data: { data: second } }));
    await waitFor(() => expect(result.current.data).toEqual(second));
    expect(result.current.isPlaceholderData).toBe(false);
  });
});

describe('useDashboardFilters — statusSummaryFilters / ratingSummaryFilters (what each KPI group asks the summary for)', () => {
  const routerWrapper = (url) =>
    function Wrapper({ children }) {
      return <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;
    };

  it('both are empty with no filters — never carrying sort, page or limit', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper: routerWrapper('/?page=4&sortBy=title&sortOrder=desc') });
    expect(result.current.statusSummaryFilters).toEqual({});
    expect(result.current.ratingSummaryFilters).toEqual({});
    expect(result.current.apiFilters).toMatchObject({ page: 4, limit: 25, sortBy: 'title', sortOrder: 'desc' });
  });

  it('both carry every other task filter the table uses', () => {
    const url = '/?ratingSource=synthetic&assigneeId=u1&responsibility=R1&search=audit&dateType=entry&from=2026-01-01&to=2026-03-31';
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper: routerWrapper(url) });
    const others = { ratingSource: 'synthetic', assigneeId: 'u1', responsibility: 'R1', search: 'audit', entryFrom: '2026-01-01', entryTo: '2026-03-31' };

    expect(result.current.statusSummaryFilters).toEqual(others);
    expect(result.current.ratingSummaryFilters).toEqual(others);
  });

  it('use the deadline range by default', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper: routerWrapper('/?from=2026-01-01') });
    expect(result.current.statusSummaryFilters).toEqual({ deadlineFrom: '2026-01-01' });
    expect(result.current.ratingSummaryFilters).toEqual({ deadlineFrom: '2026-01-01' });
  });

  it('each group LEAVES OUT its own filter and keeps the other one', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper: routerWrapper('/?performanceRating=good&status=pending&assigneeId=u1') });

    expect(result.current.apiFilters).toMatchObject({ performanceRating: 'good', status: 'pending', assigneeId: 'u1' }); // the table IS filtered by both
    // The rating cards: not narrowed by the band chosen, but they do follow the status.
    expect(result.current.ratingSummaryFilters).toEqual({ status: 'pending', assigneeId: 'u1' });
    // The status cards: not narrowed by the status chosen, but they do follow the rating.
    expect(result.current.statusSummaryFilters).toEqual({ performanceRating: 'good', assigneeId: 'u1' });
  });

  it('toggling a band leaves ratingSummaryFilters identical (the band cards are not refetched) and narrows statusSummaryFilters', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper: routerWrapper('/?assigneeId=u1') });
    const before = result.current.ratingSummaryFilters;

    act(() => result.current.toggleKpiFilter('performanceRating', 'weak'));

    expect(result.current.apiFilters.performanceRating).toBe('weak');
    expect(result.current.ratingSummaryFilters).toEqual(before);
    expect(result.current.statusSummaryFilters).toEqual({ assigneeId: 'u1', performanceRating: 'weak' });
  });

  it('toggling a status leaves statusSummaryFilters identical (the status cards are not refetched) and narrows ratingSummaryFilters', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper: routerWrapper('/?assigneeId=u1') });
    const before = result.current.statusSummaryFilters;

    act(() => result.current.toggleKpiFilter('status', 'pending'));

    expect(result.current.apiFilters.status).toBe('pending');
    expect(result.current.statusSummaryFilters).toEqual(before);
    expect(result.current.ratingSummaryFilters).toEqual({ assigneeId: 'u1', status: 'pending' });
  });

  it('with neither a status nor a rating chosen the two are equal — one query key, one request', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper: routerWrapper('/?assigneeId=u1&ratingSource=real') });
    expect(result.current.statusSummaryFilters).toEqual(result.current.ratingSummaryFilters);
  });

  it('ratingSource counts as an active filter and is cleared with the rest', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper: routerWrapper('/?ratingSource=real') });
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearAllFilters());

    expect(result.current.params.ratingSource).toBeUndefined();
    expect(result.current.hasActiveFilters).toBe(false);
  });
});

describe('useEditSyntheticRating / useRemoveSyntheticRating', () => {
  function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    return { queryClient, invalidate, wrapper: queryWrapper(queryClient) };
  }

  it('edit: calls the endpoint for that task, stores the returned task and refreshes the list and the KPI summary', async () => {
    const updated = { id: 't2', performanceRating: 'excellent' };
    apiClient.patch.mockResolvedValue({ data: { data: updated } });
    const { queryClient, invalidate, wrapper } = setup();
    const { result } = renderHook(() => useEditSyntheticRating('t2'), { wrapper });

    await act(async () => result.current.mutateAsync({ assumedPercent: 92 }));

    expect(apiClient.patch).toHaveBeenCalledWith('/tasks/t2/synthetic-rating', { assumedPercent: 92 });
    expect(queryClient.getQueryData(['task', 't2'])).toEqual(updated);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboardSummary'] });
  });

  it('remove: the same cache effects', async () => {
    const updated = { id: 't2', performanceRating: '-' };
    apiClient.delete.mockResolvedValue({ data: { data: updated } });
    const { queryClient, invalidate, wrapper } = setup();
    const { result } = renderHook(() => useRemoveSyntheticRating('t2'), { wrapper });

    await act(async () => result.current.mutateAsync({ note: 'x' }));

    expect(apiClient.delete).toHaveBeenCalledWith('/tasks/t2/synthetic-rating', { data: { note: 'x' } });
    expect(queryClient.getQueryData(['task', 't2'])).toEqual(updated);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboardSummary'] });
  });

  it('a failed edit changes no cache and refreshes nothing', async () => {
    apiClient.patch.mockRejectedValue(new Error('409'));
    const { queryClient, invalidate, wrapper } = setup();
    const { result } = renderHook(() => useEditSyntheticRating('t2'), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ assumedPercent: 5 })).rejects.toThrow('409');
    });

    expect(queryClient.getQueryData(['task', 't2'])).toBeUndefined();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
