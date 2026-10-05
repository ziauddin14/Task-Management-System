import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import RatingKpiGroup from '../../../src/components/dashboard/RatingKpiGroup.jsx';

// The "کارکردگی" KPI group: four band cards + the overall-quality card + the synthetic / unrated
// line. Pure presentation of the summary endpoint's `ratings` block — which filters it was
// computed with (all of them, minus the rating filter) is the backend's and DashboardPage's job.
const band = (count, percent) => ({ count, percent });

// The live figures: 147 rated (134 of them synthetic), 5 unrated, average 62.4% -> weak.
const liveRatings = {
  bands: { excellent: band(0, 0), good: band(81, 55), fair: band(6, 4), weak: band(60, 41) },
  ratedCount: 147,
  unratedCount: 5,
  syntheticCount: 134,
  averageEffectivePercent: 62.4,
  overallQuality: { band: 'weak', percent: 62.4 },
};
const emptyRatings = {
  bands: { excellent: band(0, 0), good: band(0, 0), fair: band(0, 0), weak: band(0, 0) },
  ratedCount: 0,
  unratedCount: 0,
  syntheticCount: 0,
  averageEffectivePercent: null,
  overallQuality: null,
};

function renderGroup(props = {}) {
  const onToggleRating = vi.fn();
  const utils = render(<RatingKpiGroup ratings={liveRatings} activeRating={undefined} onToggleRating={onToggleRating} {...props} />);
  return { ...utils, onToggleRating };
}
const card = (label) => screen.getByRole('button', { name: new RegExp(`^${label}`) });
const overallCard = () => screen.getByRole('group', { name: 'مجموعی کیفیت' });

describe('RatingKpiGroup — band cards', () => {
  it('shows the four bands, best first, each with its count and its percent of the rated set', () => {
    renderGroup();

    const labels = screen.getAllByRole('button').slice(0, 4).map((button) => button.textContent);
    expect(labels).toEqual(['ممتاز0' + '0%', 'بہتر81' + '55%', 'مناسب6' + '4%', 'کمزور60' + '41%']);
  });

  it('marks the band that is the active filter, and only that one', () => {
    renderGroup({ activeRating: 'good' });

    expect(card('بہتر')).toHaveAttribute('aria-pressed', 'true');
    ['ممتاز', 'مناسب', 'کمزور'].forEach((label) => expect(card(label)).toHaveAttribute('aria-pressed', 'false'));
  });

  it('with a band active, the other cards still show their own figures (the data is not narrowed by it)', () => {
    renderGroup({ activeRating: 'good' });

    expect(card('مناسب')).toHaveTextContent('6');
    expect(card('کمزور')).toHaveTextContent('60');
    expect(card('کمزور')).toHaveTextContent('41%');
  });

  it('clicking a band asks to toggle that rating', () => {
    const { onToggleRating } = renderGroup();

    fireEvent.click(card('کمزور'));
    fireEvent.click(card('ممتاز'));

    expect(onToggleRating.mock.calls).toEqual([['weak'], ['excellent']]);
  });
});

describe('RatingKpiGroup — overall quality', () => {
  it('shows the overall band and the average percent', () => {
    renderGroup();

    expect(overallCard()).toHaveTextContent('کمزور');
    expect(overallCard()).toHaveTextContent('62.4%');
  });

  it('is information, not a filter: it is not a button', () => {
    renderGroup();
    expect(within(overallCard()).queryByRole('button')).not.toBeInTheDocument();
    expect(overallCard().tagName).toBe('DIV');
  });

  it.each([
    ['excellent', 95, 'ممتاز'],
    ['good', 80, 'بہتر'],
    ['fair', 70, 'مناسب'],
    ['weak', 0, 'کمزور'],
  ])('band %s at %s%% reads "%s"', (bandKey, percent, label) => {
    renderGroup({ ratings: { ...liveRatings, overallQuality: { band: bandKey, percent } } });
    expect(overallCard()).toHaveTextContent(label);
    expect(overallCard()).toHaveTextContent(`${percent}%`);
  });

  it('never shows the count of unrated tasks as if it were the overall quality (the old card)', () => {
    renderGroup({ ratings: { ...liveRatings, unratedCount: 139 } });
    expect(overallCard()).not.toHaveTextContent('139');
  });
});

describe('RatingKpiGroup — synthetic and unrated lines', () => {
  it('says how many of the rated tasks are synthetic: "N میں سے X تخمینی"', () => {
    renderGroup();
    expect(screen.getByText('147 میں سے 134 تخمینی')).toBeInTheDocument();
  });

  it('says how many tasks have no rating: "بغیر درجہ بندی: N"', () => {
    renderGroup();
    expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 5' })).toBeInTheDocument();
  });

  it('omits the synthetic line when no rated task is synthetic', () => {
    renderGroup({ ratings: { ...liveRatings, syntheticCount: 0 } });
    expect(screen.queryByText(/میں سے/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 5' })).toBeInTheDocument();
  });

  it('omits the unrated line when every task is rated', () => {
    renderGroup({ ratings: { ...liveRatings, unratedCount: 0 } });
    expect(screen.queryByText(/بغیر درجہ بندی/)).not.toBeInTheDocument();
    expect(screen.getByText('147 میں سے 134 تخمینی')).toBeInTheDocument();
  });

  it('the unrated line is the way to list those tasks: clicking it toggles the "-" rating filter', () => {
    const { onToggleRating } = renderGroup();
    fireEvent.click(screen.getByRole('button', { name: 'بغیر درجہ بندی: 5' }));
    expect(onToggleRating).toHaveBeenCalledWith('-');
  });

  it('shows the unrated line as active while that filter is on', () => {
    renderGroup({ activeRating: '-' });
    expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 5' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('RatingKpiGroup — empty set', () => {
  it('nothing rated: zero counts with no percent, and a dash for the overall quality — never "0%"', () => {
    renderGroup({ ratings: emptyRatings });

    ['ممتاز', 'بہتر', 'مناسب', 'کمزور'].forEach((label) => {
      expect(card(label)).toHaveTextContent('0');
      expect(card(label)).not.toHaveTextContent('%');
    });
    expect(overallCard()).toHaveTextContent('—');
    expect(overallCard()).not.toHaveTextContent('%');
    expect(screen.queryByText(/میں سے/)).not.toBeInTheDocument();
    expect(screen.queryByText(/بغیر درجہ بندی/)).not.toBeInTheDocument();
  });

  it('only unrated tasks in the set: still a dash, and the unrated count is shown', () => {
    renderGroup({ ratings: { ...emptyRatings, unratedCount: 7 } });
    expect(overallCard()).toHaveTextContent('—');
    expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 7' })).toBeInTheDocument();
  });

  it('renders nothing at all when the summary carries no ratings block', () => {
    const { container } = renderGroup({ ratings: undefined });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('RatingKpiGroup — while a newer summary is loading', () => {
  it('keeps the cards, marks the group busy, and shows the loading phrase over the (hidden) lines', () => {
    const { container } = renderGroup({ isRefreshing: true });

    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
    expect(card('بہتر')).toHaveTextContent('81'); // previous figures stay on screen
    expect(screen.getByRole('status')).toHaveTextContent('خلاصہ اپڈیٹ ہو رہا ہے…');
    expect(container.querySelector('[data-phrase-line]')).not.toBeNull();
    // The lines are invisible and unclickable, not gone.
    expect(container.querySelector('[data-rating-lines]')).toHaveClass('opacity-0', 'pointer-events-none');
  });

  it('the lines are visible again once the refresh is over', () => {
    const { container, rerender } = renderGroup({ isRefreshing: true });
    rerender(<RatingKpiGroup ratings={liveRatings} onToggleRating={vi.fn()} />);

    expect(container.querySelector('[data-rating-lines]')).not.toHaveClass('opacity-0');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // Pressing "بغیر درجہ بندی" is itself what starts a refresh (the status cards follow the rating
  // filter): if the line were swapped out for the loader, the button would be unmounted under the
  // user's finger and keyboard focus would fall back to the page.
  it('the "بغیر درجہ بندی" button stays mounted — and keeps focus — through a refresh', () => {
    const { rerender } = renderGroup();
    const unrated = screen.getByRole('button', { name: 'بغیر درجہ بندی: 5' });
    unrated.focus();

    rerender(<RatingKpiGroup ratings={liveRatings} activeRating="-" onToggleRating={vi.fn()} isRefreshing />);

    expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 5' })).toBe(unrated);
    expect(unrated).toHaveFocus();
    expect(unrated).toHaveAttribute('aria-pressed', 'true');
  });

  it('is not busy otherwise, and the line area keeps a fixed minimum height either way (no jump)', () => {
    const { container, rerender } = renderGroup();
    const lineArea = container.firstElementChild.lastElementChild;

    expect(container.firstElementChild).not.toHaveAttribute('aria-busy');
    expect(lineArea).toHaveClass('min-h-[2rem]');
    rerender(<RatingKpiGroup ratings={liveRatings} onToggleRating={vi.fn()} isRefreshing />);
    expect(container.firstElementChild.lastElementChild).toHaveClass('min-h-[2rem]');
  });
});

describe('RatingKpiGroup — layout', () => {
  it('five cards in the same responsive grid as the status group: 2-up, 3-up, then one row of 5', () => {
    const { container } = renderGroup();
    const grid = container.firstElementChild.firstElementChild;
    expect(grid).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-5');
    expect(grid.children).toHaveLength(5);
  });
});
