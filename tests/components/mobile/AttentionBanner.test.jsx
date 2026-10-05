import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AttentionBanner from '../../../src/components/mobile/AttentionBanner.jsx';

function renderBanner(props = {}) {
  return render(
    <MemoryRouter>
      <AttentionBanner count={53} to="/tasks?status=pending" {...props} />
    </MemoryRouter>
  );
}

// The amber line under the hero card. Its number is the count of tasks in the "پینڈنگ" status —
// the status the backend gives an open task once its deadline has passed.
describe('AttentionBanner — "N کام تاخیر کا شکار ہیں"', () => {
  it('states how many tasks are delayed', () => {
    renderBanner();
    expect(screen.getByRole('link')).toHaveTextContent('53 کام تاخیر کا شکار ہیں');
  });

  it('is one link, with "دیکھیں", to the task list filtered to those tasks', () => {
    renderBanner();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/tasks?status=pending');
    expect(link).toHaveTextContent('دیکھیں');
  });

  it('keeps whatever other filters the link was built with', () => {
    renderBanner({ to: '/tasks?assigneeId=u1&status=pending' });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tasks?assigneeId=u1&status=pending');
  });

  it('uses the singular for exactly one task', () => {
    renderBanner({ count: 1 });
    expect(screen.getByRole('link')).toHaveTextContent('1 کام تاخیر کا شکار ہے');
    expect(screen.getByRole('link')).not.toHaveTextContent('ہیں');
  });

  it.each([[0], [undefined], [null], [-2]])('shows nothing at all when the count is %s', (count) => {
    const { container } = renderBanner({ count });
    expect(container).toBeEmptyDOMElement();
  });

  it('makes no claim about when reminders are sent (nothing in the app configures a time of day)', () => {
    renderBanner();
    expect(screen.getByRole('link')).not.toHaveTextContent(/بجے|یاددہانی|یاد دہانی/);
  });

  it('is amber, from the design tokens, and at least 44px tall', () => {
    renderBanner();
    expect(screen.getByRole('link')).toHaveClass('bg-tk-attention-bg', 'text-tk-attention-text', 'min-h-[64px]');
  });
});
