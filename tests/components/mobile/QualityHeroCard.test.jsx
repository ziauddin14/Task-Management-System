import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QualityHeroCard from '../../../src/components/mobile/QualityHeroCard.jsx';

// The summary endpoint's `ratings` block (docs/05-apis.md §8) — the figures of the approved mockup.
const ratings = {
  bands: {
    excellent: { count: 0, percent: 0 },
    good: { count: 81, percent: 55 },
    fair: { count: 6, percent: 4 },
    weak: { count: 60, percent: 41 },
  },
  ratedCount: 147,
  unratedCount: 5,
  syntheticCount: 134,
  averageEffectivePercent: 62.4,
  overallQuality: { band: 'weak', percent: 62.4 },
};

const hrefForRating = (rating) => `/tasks?performanceRating=${rating}`;

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <QualityHeroCard ratings={ratings} hrefForRating={hrefForRating} {...props} />
    </MemoryRouter>
  );
}

describe('QualityHeroCard — the mobile dashboard\'s "مجموعی کیفیت" hero', () => {
  it.each([
    ['excellent', 'ممتاز', 93.5, 'stroke-tk-excellent-fill', 'text-tk-excellent'],
    ['good', 'بہتر', 84.6, 'stroke-tk-good-fill', 'text-tk-good'],
    ['fair', 'مناسب', 71, 'stroke-tk-fair-fill', 'text-tk-fair'],
    ['weak', 'کمزور', 62.4, 'stroke-tk-weak-fill', 'text-tk-weak'],
  ])('band "%s": shows the label, the average pill and a ring in the band colour', (band, label, percent, strokeClass, textClass) => {
    const { container } = renderCard({ ratings: { ...ratings, overallQuality: { band, percent } } });

    const bandLabel = container.querySelector('[data-quality-band]');
    expect(bandLabel).toHaveTextContent(label);
    expect(bandLabel).toHaveClass(textClass);
    expect(screen.getByText('اوسط', { exact: false })).toHaveTextContent(`اوسط ${percent}%`);

    // The ring: named for assistive tech, the figure written inside it, the arc in the band colour
    // and as long as the average percent of the circle.
    expect(screen.getByRole('img', { name: `اوسط ${percent} فیصد` })).toBeInTheDocument();
    const arc = container.querySelector('[data-ring-arc]');
    expect(arc).toHaveClass(strokeClass);
    const [filled, whole] = arc.getAttribute('stroke-dasharray').split(' ').map(Number);
    expect(filled / whole).toBeCloseTo(percent / 100, 5);
  });

  it('says how many rated tasks the figure is based on', () => {
    renderCard();
    expect(screen.getByText('147 درجہ بند کاموں کی بنیاد پر')).toBeInTheDocument();
  });

  it('draws one stacked-bar segment per band that has tasks, sized by its share of the rated set', () => {
    const { container } = renderCard();

    const segments = [...container.querySelectorAll('[data-band-segment]')];
    // "ممتاز" has no tasks, so it gets no segment at all (not a zero-width one).
    expect(segments.map((segment) => segment.dataset.bandSegment)).toEqual(['good', 'fair', 'weak']);
    expect(segments.map((segment) => segment.style.flexGrow)).toEqual(['55', '4', '41']);
    // The bar is described in words for a screen reader — every band, with its count.
    expect(screen.getByRole('img', { name: 'ممتاز 0، بہتر 81، مناسب 6، کمزور 60' })).toBeInTheDocument();
  });

  it('lists all four bands with their counts, each linking to the task list filtered to that band', () => {
    renderCard();

    const expected = [
      ['ممتاز', 0, 'excellent'],
      ['بہتر', 81, 'good'],
      ['مناسب', 6, 'fair'],
      ['کمزور', 60, 'weak'],
    ];
    expected.forEach(([label, count, key]) => {
      const link = screen.getByRole('link', { name: `${label}: ${count} کام` });
      expect(link).toHaveAttribute('href', `/tasks?performanceRating=${key}`);
      expect(within(link).getByText(String(count))).toBeInTheDocument();
    });
  });

  it('marks the band that is the current rating filter', () => {
    renderCard({ activeRating: 'good' });

    expect(screen.getByRole('link', { name: 'بہتر: 81 کام' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'کمزور: 60 کام' })).not.toHaveAttribute('aria-current');
  });

  it('shows how many ratings are synthetic and how many real, and links the unrated count to those tasks', () => {
    const { container } = renderCard();

    // 147 rated, 134 of them synthetic → 13 real.
    expect(container.querySelector('[data-rating-lines]')).toHaveTextContent('134 تخمینی • 13 اصل');
    const unrated = screen.getByRole('link', { name: 'بغیر درجہ بندی: 5' });
    expect(unrated).toHaveAttribute('href', '/tasks?performanceRating=-');
  });

  it('marks the unrated link as current while "unrated" is the rating filter', () => {
    renderCard({ activeRating: '-' });
    expect(screen.getByRole('link', { name: 'بغیر درجہ بندی: 5' })).toHaveAttribute('aria-current', 'true');
  });

  it('omits the unrated link when every task is rated', () => {
    renderCard({ ratings: { ...ratings, unratedCount: 0 } });
    expect(screen.queryByText(/بغیر درجہ بندی/)).not.toBeInTheDocument();
  });

  describe('nothing rated', () => {
    const empty = {
      bands: { excellent: { count: 0, percent: 0 }, good: { count: 0, percent: 0 }, fair: { count: 0, percent: 0 }, weak: { count: 0, percent: 0 } },
      ratedCount: 0,
      unratedCount: 7,
      syntheticCount: 0,
      averageEffectivePercent: null,
      overallQuality: null,
    };

    it('says so instead of showing a band, a zero average, a ring or a bar', () => {
      const { container } = renderCard({ ratings: empty });

      expect(screen.getByText('ابھی کسی کام کی درجہ بندی نہیں ہوئی')).toBeInTheDocument();
      expect(container.querySelector('[data-quality-band]')).toBeNull();
      expect(container.querySelector('[data-ring-arc]')).toBeNull();
      expect(container.querySelector('[data-band-segment]')).toBeNull();
      expect(screen.queryByText(/اوسط/)).not.toBeInTheDocument();
      expect(screen.queryByText(/درجہ بند کاموں کی بنیاد پر/)).not.toBeInTheDocument();
      expect(screen.queryByText(/تخمینی/)).not.toBeInTheDocument();
    });

    it('still links to the unrated tasks', () => {
      renderCard({ ratings: empty });
      expect(screen.getByRole('link', { name: 'بغیر درجہ بندی: 7' })).toHaveAttribute('href', '/tasks?performanceRating=-');
    });

    it('renders nothing below the heading when there are no tasks at all', () => {
      const { container } = renderCard({ ratings: { ...empty, unratedCount: 0 } });
      expect(container.querySelector('[data-rating-lines]')).toBeNull();
    });
  });

  it('renders nothing until the summary has arrived', () => {
    const { container } = renderCard({ ratings: undefined });
    expect(container).toBeEmptyDOMElement();
  });

  it('while a newer summary is loading: keeps the figures, marks the card busy and shows the loading phrase over the footer', () => {
    const { container } = renderCard({ isRefreshing: true });

    expect(screen.getByRole('region', { name: 'مجموعی کیفیت' })).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('[data-quality-band]')).toHaveTextContent('کمزور');
    expect(screen.getByRole('status')).toHaveTextContent('خلاصہ اپڈیٹ ہو رہا ہے…');
    // Hidden, not removed — so the line keeps its height and nothing below it moves.
    expect(container.querySelector('[data-rating-lines]')).toHaveClass('opacity-0');
  });
});
