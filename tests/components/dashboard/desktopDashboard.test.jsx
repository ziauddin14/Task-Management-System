import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, renderHook, act } from '@testing-library/react';
import StatusDonut from '../../../src/components/dashboard/StatusDonut.jsx';
import StatusTileRow from '../../../src/components/dashboard/StatusTileRow.jsx';
import QualityHero from '../../../src/components/dashboard/QualityHero.jsx';
import { useCountUp, canAnimateNumbers } from '../../../src/hooks/useCountUp.js';
import { progressFillClass } from '../../../src/utils/dashboardTheme.js';

// The desktop dashboard's three KPI pieces (approved mockup "DesktopAfter") and the count-up hook.
const byStatus = {
  ongoing: { count: 3, percent: 2 },
  pending: { count: 52, percent: 34 },
  complete: { count: 0, percent: 0 },
  closed: { count: 97, percent: 64 },
};
const ratings = {
  bands: { excellent: { count: 0, percent: 0 }, good: { count: 82, percent: 55 }, fair: { count: 6, percent: 4 }, weak: { count: 60, percent: 41 } },
  ratedCount: 148,
  unratedCount: 4,
  syntheticCount: 134,
  averageEffectivePercent: 62.6,
  overallQuality: { band: 'weak', percent: 62.6 },
};

describe('StatusDonut — "کاموں کی صورتحال" as an inline-SVG donut', () => {
  function renderDonut(props = {}) {
    const onToggleStatus = vi.fn();
    const onClearKpiFilters = vi.fn();
    const utils = render(<StatusDonut byStatus={byStatus} total={152} onToggleStatus={onToggleStatus} onClearKpiFilters={onClearKpiFilters} {...props} />);
    return { ...utils, onToggleStatus, onClearKpiFilters };
  }
  const segment = (container, key) => container.querySelector(`[data-donut-segment="${key}"]`);
  const legendRow = (name) => within(screen.getByRole('list')).getByRole('button', { name });

  it('draws one segment per status that has tasks, largest group first, sized by its share', () => {
    const { container } = renderDonut();
    const segments = [...container.querySelectorAll('[data-donut-segment]')];
    expect(segments.map((s) => s.dataset.donutSegment)).toEqual(['closed', 'pending', 'ongoing']); // complete has none

    const circumference = 2 * Math.PI * 60;
    const lengths = segments.map((s) => Number(s.getAttribute('stroke-dasharray').split(' ')[0]));
    expect(lengths[0]).toBeCloseTo((97 / 152) * circumference, 3);
    expect(lengths[1]).toBeCloseTo((52 / 152) * circumference, 3);
    expect(lengths[2]).toBeCloseTo((3 / 152) * circumference, 3);
    expect(lengths.reduce((a, b) => a + b, 0)).toBeCloseTo(circumference, 3); // together: the whole ring
    // Each starts where the previous one ended.
    expect(Number(segments[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(-lengths[0], 3);
  });

  it('each status has its own colour, from the design tokens', () => {
    const { container } = renderDonut();
    expect(segment(container, 'closed')).toHaveClass('stroke-tk-closed-fill');
    expect(segment(container, 'pending')).toHaveClass('stroke-tk-pending-fill');
    expect(segment(container, 'ongoing')).toHaveClass('stroke-tk-ongoing-fill');
  });

  it('the centre shows the total, and the header says "کل N"', () => {
    renderDonut();
    const centre = screen.getByRole('button', { name: /^مجموعی: 152 کام/ });
    expect(centre).toHaveTextContent('152');
    expect(centre).toHaveTextContent('کل کام');
    expect(screen.getByText('کل 152')).toBeInTheDocument();
  });

  it('the legend lists the four statuses with count and percent', () => {
    renderDonut();
    const rows = within(screen.getByRole('list')).getAllByRole('button');
    expect(rows.map((row) => row.textContent)).toEqual(['کلوز97' + '64%', 'پینڈنگ52' + '34%', 'جاری3' + '2%', 'مکمل0' + '0%']);
  });

  it('CLICKING A SEGMENT applies that status filter — the same toggle the status tiles use', () => {
    const { container, onToggleStatus } = renderDonut();
    fireEvent.click(segment(container, 'pending'));
    fireEvent.click(segment(container, 'closed'));
    expect(onToggleStatus.mock.calls).toEqual([['pending'], ['closed']]);
  });

  it('a legend row does the same', () => {
    const { onToggleStatus } = renderDonut();
    fireEvent.click(legendRow('جاری: 3 کام، 2 فیصد'));
    expect(onToggleStatus).toHaveBeenCalledWith('ongoing');
  });

  it('segments are keyboard accessible: focusable buttons, Enter and Space activate, other keys do not', () => {
    const { container, onToggleStatus } = renderDonut();
    const pending = segment(container, 'pending');

    expect(pending).toHaveAttribute('role', 'button');
    expect(pending).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(pending, { key: 'Enter' });
    fireEvent.keyDown(pending, { key: ' ' });
    fireEvent.keyDown(pending, { key: 'a' });
    fireEvent.keyDown(pending, { key: 'Tab' });

    expect(onToggleStatus.mock.calls).toEqual([['pending'], ['pending']]);
  });

  it('every segment is named with its status, count and percent; the drawing as a whole summarises the counts', () => {
    const { container } = renderDonut();
    expect(segment(container, 'closed')).toHaveAttribute('aria-label', 'کلوز: 97 کام، 64 فیصد');
    expect(segment(container, 'pending')).toHaveAttribute('aria-label', 'پینڈنگ: 52 کام، 34 فیصد');
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'کلوز 97، پینڈنگ 52، جاری 3، مکمل 0');
  });

  it('marks the status that is the current filter — on its segment and on its legend row', () => {
    const { container } = renderDonut({ activeStatus: 'pending' });
    expect(segment(container, 'pending')).toHaveAttribute('aria-pressed', 'true');
    expect(segment(container, 'closed')).toHaveAttribute('aria-pressed', 'false');
    expect(legendRow('پینڈنگ: 52 کام، 34 فیصد')).toHaveAttribute('aria-pressed', 'true');
    // With a status chosen the others keep their figures (the data is asked for without that filter).
    expect(legendRow('کلوز: 97 کام، 64 فیصد')).toHaveTextContent('97');
  });

  it('the centre clears the status and rating filters (what the old "مجموعی" card did)', () => {
    const { onClearKpiFilters, onToggleStatus } = renderDonut({ activeStatus: 'pending' });
    fireEvent.click(screen.getByRole('button', { name: /^مجموعی:/ }));
    expect(onClearKpiFilters).toHaveBeenCalledTimes(1);
    expect(onToggleStatus).not.toHaveBeenCalled();
  });

  it('no tasks at all: an empty ring, a zero total, and nothing to click in the ring', () => {
    const { container } = renderDonut({ byStatus: {}, total: 0 });
    expect(container.querySelectorAll('[data-donut-segment]')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /^مجموعی: 0 کام/ })).toBeInTheDocument();
  });

  it('renders nothing until the summary has arrived', () => {
    const { container } = renderDonut({ byStatus: undefined });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('StatusTileRow — the four tinted status tiles', () => {
  function renderTiles(props = {}) {
    const onToggleStatus = vi.fn();
    const utils = render(<StatusTileRow byStatus={byStatus} onToggleStatus={onToggleStatus} {...props} />);
    return { ...utils, onToggleStatus };
  }

  it('shows پینڈنگ، جاری، کلوز، مکمل with count and percent, each in its own tint', () => {
    renderTiles();
    const tiles = screen.getAllByRole('button');
    expect(tiles.map((tile) => tile.textContent)).toEqual(['پینڈنگ52' + '34%', 'جاری3' + '2%', 'کلوز97' + '64%', 'مکمل0' + '0%']);
    expect(tiles[0]).toHaveClass('bg-tk-pending-tint');
    expect(tiles[1]).toHaveClass('bg-tk-ongoing-tint');
    expect(tiles[2]).toHaveClass('bg-tk-closed-tint');
    expect(tiles[3]).toHaveClass('bg-tk-complete-tint');
  });

  it('a tile toggles its status as the filter, and shows which one is in force', () => {
    const { onToggleStatus } = renderTiles({ activeStatus: 'closed' });
    const [pending, , closed] = screen.getAllByRole('button');

    fireEvent.click(pending);

    expect(onToggleStatus).toHaveBeenCalledWith('pending');
    expect(closed).toHaveAttribute('aria-pressed', 'true');
    expect(closed).toHaveClass('ring-2');
    expect(pending).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('QualityHero — the desktop "مجموعی کیفیت" hero', () => {
  function renderHero(props = {}) {
    const onToggleRating = vi.fn();
    const utils = render(<QualityHero ratings={ratings} onToggleRating={onToggleRating} {...props} />);
    return { ...utils, onToggleRating };
  }
  const overall = () => screen.getByRole('group', { name: 'مجموعی کیفیت' });

  it.each([
    ['excellent', 'ممتاز', 93.5, 'stroke-tk-excellent-fill'],
    ['good', 'بہتر', 84.6, 'stroke-tk-good-fill'],
    ['fair', 'مناسب', 71, 'stroke-tk-fair-fill'],
    ['weak', 'کمزور', 62.6, 'stroke-tk-weak-fill'],
  ])('band %s: the label, "اوسط N%%", and a ring in the band colour filled to the average', (band, label, percent, stroke) => {
    const { container } = renderHero({ ratings: { ...ratings, overallQuality: { band, percent } } });

    expect(overall()).toHaveTextContent(label);
    expect(overall()).toHaveTextContent(`اوسط ${percent}%`);
    const arc = container.querySelector('[data-ring-arc]');
    expect(arc).toHaveClass(stroke);
    const [filled, circumference] = arc.getAttribute('stroke-dasharray').split(' ').map(Number);
    expect(filled / circumference).toBeCloseTo(percent / 100, 5);
  });

  it('says how many rated tasks it is based on, how many are synthetic, and how many are unrated', () => {
    renderHero();
    expect(overall()).toHaveTextContent('148 درجہ بند کاموں کی بنیاد پر');
    expect(screen.getByText('148 میں سے 134 تخمینی')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 4' })).toBeInTheDocument();
  });

  it('a stacked bar with one segment per band that has tasks, and four band tiles with count and percent of the RATED set', () => {
    const { container } = renderHero();
    expect([...container.querySelectorAll('[data-band-segment]')].map((s) => s.dataset.bandSegment)).toEqual(['good', 'fair', 'weak']);

    const tiles = ['ممتاز', 'بہتر', 'مناسب', 'کمزور'].map((label) => screen.getByText(label, { selector: 'button span' }).closest('button'));
    expect(tiles.map((tile) => tile.textContent)).toEqual(['ممتاز0' + '0%', 'بہتر82' + '55%', 'مناسب6' + '4%', 'کمزور60' + '41%']);
    expect(tiles[0]).toHaveClass('bg-tk-excellent-tint');
    expect(tiles[3]).toHaveClass('bg-tk-weak-tint');
  });

  it('a band tile toggles that rating; "بغیر درجہ بندی" toggles the unrated filter; the active one is marked', () => {
    const { onToggleRating } = renderHero({ activeRating: 'good' });
    const good = screen.getByText('بہتر', { selector: 'button span' }).closest('button');

    fireEvent.click(screen.getByText('کمزور', { selector: 'button span' }).closest('button'));
    fireEvent.click(screen.getByRole('button', { name: 'بغیر درجہ بندی: 4' }));

    expect(onToggleRating.mock.calls).toEqual([['weak'], ['-']]);
    expect(good).toHaveAttribute('aria-pressed', 'true');
    // The other tiles still show their own figures: the data is not narrowed by the rating filter.
    expect(screen.getByText('کمزور', { selector: 'button span' }).closest('button')).toHaveTextContent('60');
  });

  it('nothing rated: a dash — never 0% — no ring, no bar, and tiles without a percent', () => {
    const empty = { bands: { excellent: { count: 0, percent: 0 }, good: { count: 0, percent: 0 }, fair: { count: 0, percent: 0 }, weak: { count: 0, percent: 0 } }, ratedCount: 0, unratedCount: 7, syntheticCount: 0, averageEffectivePercent: null, overallQuality: null };
    const { container } = renderHero({ ratings: empty });

    expect(overall()).toHaveTextContent('—');
    expect(overall()).not.toHaveTextContent('%');
    expect(container.querySelector('[data-ring-arc]')).toBeNull();
    expect(container.querySelector('[data-band-segment]')).toBeNull();
    expect(screen.getByText('ممتاز', { selector: 'button span' }).closest('button')).not.toHaveTextContent('%');
    expect(screen.queryByText(/میں سے/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 7' })).toBeInTheDocument();
  });

  it('while refreshing: the loading phrase shows over the footer line, which stays mounted (focus is kept)', () => {
    const { container, rerender } = renderHero();
    const unrated = screen.getByRole('button', { name: 'بغیر درجہ بندی: 4' });
    unrated.focus();

    rerender(<QualityHero ratings={ratings} activeRating="-" onToggleRating={vi.fn()} isRefreshing />);

    expect(container.querySelector('[data-phrase-line]')).not.toBeNull();
    expect(container.querySelector('[data-rating-lines]')).toHaveClass('opacity-0', 'pointer-events-none');
    expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 4' })).toBe(unrated);
    expect(unrated).toHaveFocus();
  });
});

describe('useCountUp — numbers count up on first render', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete window.matchMedia;
  });

  function allowMotion(reduced = false) {
    window.matchMedia = (query) => ({ matches: query.includes('prefers-reduced-motion') ? reduced : false, media: query, addEventListener() {}, removeEventListener() {} });
  }

  it('with no matchMedia (tests, server rendering) the value is shown at once — no animation at all', () => {
    expect(canAnimateNumbers()).toBe(false);
    const { result } = renderHook(() => useCountUp(152));
    expect(result.current).toBe(152);
  });

  it('under prefers-reduced-motion the value is shown at once, on the very first render', () => {
    allowMotion(true);
    expect(canAnimateNumbers()).toBe(false);
    const seen = [];
    renderHook(() => {
      const value = useCountUp(62.6);
      seen.push(value);
      return value;
    });
    expect(seen.every((value) => value === 62.6)).toBe(true);
  });

  it('where motion is allowed it starts at 0, passes through rounded in-between figures, and ends on EXACTLY the value', () => {
    allowMotion(false);
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout'] });
    const seen = [];
    const { result } = renderHook(() => {
      const value = useCountUp(152);
      seen.push(value);
      return value;
    });

    expect(result.current).toBe(0);
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(152);
    expect(Number.isInteger(result.current)).toBe(true);
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current).toBe(152);
    expect(Math.max(...seen)).toBe(152); // it never overshoots
  });

  it('keeps the decimals of the target (62.6 never shows 62.5999…) and ends exactly on it', () => {
    allowMotion(false);
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout'] });
    const seen = [];
    const { result } = renderHook(() => {
      const value = useCountUp(62.6);
      seen.push(value);
      return value;
    });
    act(() => vi.advanceTimersByTime(2000));

    expect(result.current).toBe(62.6);
    seen.forEach((value) => expect(String(value)).toMatch(/^\d+(\.\d)?$/));
  });

  it('a later change (a filter was applied) is a quick tween from the figure showing, again ending exactly', () => {
    allowMotion(false);
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout'] });
    const { result, rerender } = renderHook(({ value }) => useCountUp(value), { initialProps: { value: 152 } });
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toBe(152);

    rerender({ value: 60 });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBeLessThan(152);
    expect(result.current).toBeGreaterThan(60); // from 152 downwards — not restarted from 0
    act(() => vi.advanceTimersByTime(400));

    expect(result.current).toBe(60);
  });

  it('a value that is not a number is passed through untouched', () => {
    allowMotion(false);
    const { result } = renderHook(() => useCountUp(undefined));
    expect(result.current).toBeUndefined();
  });
});

describe('progressFillClass — the table bar is coloured by the REAL completion percent', () => {
  it.each([
    [0, 'bg-tk-weak-fill'],
    [29, 'bg-tk-weak-fill'],
    [30, 'bg-tk-pending-fill'],
    [69, 'bg-tk-pending-fill'],
    [70, 'bg-tk-good-fill'],
    [100, 'bg-tk-good-fill'],
  ])('%i%% -> %s', (percent, className) => {
    expect(progressFillClass(percent)).toBe(className);
  });
});
