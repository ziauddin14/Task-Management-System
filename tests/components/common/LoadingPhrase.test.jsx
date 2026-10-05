import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingPhrase from '../../../src/components/common/LoadingPhrase.jsx';
import { LOADING_PHRASE } from '../../../src/utils/loadingPhrase.js';

// The one shared loader behind every loading state in the app. jsdom has no layout, so the fitted
// font size itself can only be checked in a real browser; these tests cover what jsdom can prove:
// the verbatim phrase, the one-line/RTL/brand-colour contract and accessibility.
function getPhrase(container) {
  return container.querySelector('[data-phrase-line]');
}

describe('LoadingPhrase', () => {
  it('renders the phrase verbatim — every diacritic and the full gap — from the shared constant', () => {
    const { container } = render(<LoadingPhrase />);
    expect(getPhrase(container).textContent).toBe(LOADING_PHRASE);
  });

  it('keeps the phrase on one line, right-to-left, in the theme green', () => {
    const { container } = render(<LoadingPhrase />);
    const phrase = getPhrase(container);
    expect(phrase).toHaveAttribute('dir', 'rtl');
    expect(phrase).toHaveClass('whitespace-nowrap', 'text-brand', 'justify-center');
  });

  it('lets only the gap between the two halves shrink, so it gives way first on a narrow screen', () => {
    const { container } = render(<LoadingPhrase />);
    const [first, gap, second] = getPhrase(container).children;
    expect(first).toHaveClass('shrink-0');
    expect(second).toHaveClass('shrink-0');
    expect(gap).toHaveClass('shrink', 'whitespace-pre');
    expect(gap.style.minWidth).toBe('0.6em');
  });

  it('is an accessible busy status region whose name is the plain label, not the decorative phrase', () => {
    const { container } = render(<LoadingPhrase label="کام لوڈ ہو رہے ہیں…" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(getPhrase(container)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('کام لوڈ ہو رہے ہیں…')).toBeInTheDocument();
  });

  it('falls back to a default label when none is given', () => {
    render(<LoadingPhrase />);
    expect(screen.getByText('لوڈ ہو رہا ہے…')).toBeInTheDocument();
  });

  it('reserves a fixed row height per size, so nothing shifts when the loader appears or disappears', () => {
    const heights = ['fullscreen', 'section', 'compact'].map((size) => {
      const { container, unmount } = render(<LoadingPhrase size={size} />);
      const { height } = getPhrase(container).style;
      unmount();
      return height;
    });
    expect(heights).toEqual(['4.5rem', '3rem', '2rem']);
  });

  it('fills the viewport height in the full-screen size', () => {
    render(<LoadingPhrase size="fullscreen" label="سیشن بحال ہو رہا ہے…" />);
    expect(screen.getByRole('status')).toHaveClass('min-h-screen', 'justify-center');
  });

  it('keeps the label for screen readers only in the compact size', () => {
    render(<LoadingPhrase size="compact" />);
    expect(screen.getByText('لوڈ ہو رہا ہے…')).toHaveClass('sr-only');
  });

  it('falls back to the section size for an unknown size', () => {
    const { container } = render(<LoadingPhrase size="nope" />);
    expect(getPhrase(container).style.height).toBe('3rem');
  });
});
