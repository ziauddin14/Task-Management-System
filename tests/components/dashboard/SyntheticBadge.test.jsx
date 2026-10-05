import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SyntheticBadge from '../../../src/components/dashboard/SyntheticBadge.jsx';
import { isSyntheticRating, ratingForPercent, syntheticDetail, SYNTHETIC_LABEL } from '../../../src/utils/taskDisplay.js';

// The "تخمینی" marker shown beside a developer-assigned rating.
describe('SyntheticBadge', () => {
  it('reads "تخمینی", with "تخمینی N%" as its hover tooltip', () => {
    render(<SyntheticBadge assumedPercent={80} />);
    const badge = screen.getByRole('button');
    expect(badge).toHaveTextContent(/^تخمینی$/);
    expect(badge).toHaveAttribute('title', 'تخمینی 80%');
  });

  it('a tap expands it to "تخمینی N%" (a phone has no hover), and a second tap collapses it', () => {
    render(<SyntheticBadge assumedPercent={40} />);
    const badge = screen.getByRole('button');

    fireEvent.click(badge);
    expect(badge).toHaveTextContent('تخمینی 40%');
    expect(badge).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(badge);
    expect(badge).toHaveTextContent(/^تخمینی$/);
    expect(badge).toHaveAttribute('aria-expanded', 'false');
  });

  it('tells a screen reader it is a synthetic rating and the assumed percent', () => {
    render(<SyntheticBadge assumedPercent={70} />);
    expect(screen.getByRole('button', { name: 'تخمینی درجہ بندی — فرض کردہ 70%' })).toBeInTheDocument();
  });

  it('is type="button", so it never submits a form it sits in', () => {
    render(<SyntheticBadge assumedPercent={70} />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('static (print / export): plain text with the percent spelled out, not a button', () => {
    const { container } = render(<SyntheticBadge static assumedPercent={80} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container).toHaveTextContent(/^تخمینی 80%$/);
  });

  it('keeps the figure as one left-to-right unit, so it reads "80%" (not "%80") after the Urdu word', () => {
    const { container } = render(<SyntheticBadge static assumedPercent={80} />);
    const figure = container.querySelector('[dir="ltr"]');
    expect(figure).toHaveTextContent(/^80%$/);

    render(<SyntheticBadge assumedPercent={40} />);
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    expect(badge.querySelector('[dir="ltr"]')).toHaveTextContent(/^40%$/);
  });
});

describe('taskDisplay — synthetic helpers', () => {
  it('isSyntheticRating is true only while the marker is on', () => {
    expect(isSyntheticRating({ syntheticRating: { isSynthetic: true, assumedPercent: 80 } })).toBe(true);
    expect(isSyntheticRating({ syntheticRating: { isSynthetic: false, assumedPercent: 80 } })).toBe(false);
    expect(isSyntheticRating({ syntheticRating: null })).toBe(false);
    expect(isSyntheticRating({})).toBe(false);
    expect(isSyntheticRating(undefined)).toBe(false);
  });

  it('syntheticDetail spells out the label and the percent', () => {
    expect(SYNTHETIC_LABEL).toBe('تخمینی');
    expect(syntheticDetail(62.5)).toBe('تخمینی 62.5%');
  });

  it.each([
    [100, 'excellent'],
    [90, 'excellent'],
    [89.9, 'good'],
    [80, 'good'],
    [79.9, 'fair'],
    [70, 'fair'],
    [69.9, 'weak'],
    [0, 'weak'],
  ])('ratingForPercent(%s) -> %s — the same thresholds as the backend, no late downgrade', (percent, rating) => {
    expect(ratingForPercent(percent)).toBe(rating);
  });
});
