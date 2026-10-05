import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PhraseLine from '../../../src/components/common/PhraseLine.jsx';
import { LOADING_PHRASE } from '../../../src/utils/loadingPhrase.js';

// The one place the phrase is laid out — shared by the loader, the busy "load more" buttons and
// the login page's static salutation. jsdom has no layout, so the fitted font size itself can only
// be checked in a real browser; these tests cover the contract jsdom can prove.
function getLine(container) {
  return container.querySelector('[data-phrase-line]');
}

describe('PhraseLine', () => {
  it('renders the phrase verbatim from the shared constant, on one line, right-to-left, in the theme green', () => {
    const { container } = render(<PhraseLine />);
    const line = getLine(container);
    expect(line.textContent).toBe(LOADING_PHRASE);
    expect(line).toHaveAttribute('dir', 'rtl');
    expect(line).toHaveClass('whitespace-nowrap', 'text-brand', 'justify-center');
  });

  it('by default is static content: not animated, readable by assistive tech, and not a status region', () => {
    const { container } = render(<PhraseLine size="compact" />);
    const line = getLine(container);
    expect(line).not.toHaveClass('motion-safe:animate-pulse');
    expect(line).not.toHaveAttribute('aria-hidden');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('pulses only when asked to, and only for users who have not asked for reduced motion', () => {
    const { container } = render(<PhraseLine animated />);
    expect(getLine(container)).toHaveClass('motion-safe:animate-pulse');
  });

  it('can be hidden from assistive tech where a plain label beside it already says what is happening', () => {
    const { container } = render(<PhraseLine decorative />);
    expect(getLine(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('lets only the gap between the two halves shrink, down to a small minimum', () => {
    const { container } = render(<PhraseLine />);
    const [first, gap, second] = getLine(container).children;
    expect(first).toHaveClass('shrink-0');
    expect(second).toHaveClass('shrink-0');
    expect(gap).toHaveClass('shrink', 'whitespace-pre');
    expect(gap.style.minWidth).toBe('0.6em');
  });

  it('reserves a fixed row height per size, and treats an unknown size as "section"', () => {
    const heightOf = (size) => {
      const { container, unmount } = render(<PhraseLine size={size} />);
      const { height } = getLine(container).style;
      unmount();
      return height;
    };
    expect(['fullscreen', 'section', 'compact', 'nope'].map(heightOf)).toEqual(['4.5rem', '3rem', '2rem', '3rem']);
  });

  it('is built from spans only, so it is valid inside a button', () => {
    const { container } = render(
      <button type="button">
        <PhraseLine size="compact" />
      </button>
    );
    expect(container.querySelector('button div')).toBeNull();
  });

  it('reports its fitted size to onFit (null when there is no layout to measure, as in jsdom)', () => {
    const onFit = vi.fn();
    render(<PhraseLine onFit={onFit} />);
    expect(onFit).toHaveBeenCalledWith(null);
  });
});
