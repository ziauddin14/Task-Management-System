import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Spinner from '../../../src/components/common/Spinner.jsx';

// Durood Shareef animated loader — replaces the old spinning-circle icon everywhere Spinner is
// used. role="status"/aria-live="polite" and the caller-supplied label text are unchanged, so
// screen readers keep announcing loading the same way they always did.
describe('Spinner', () => {
  it('renders the animated Durood Shareef text inside an accessible status region', () => {
    render(<Spinner label="کام لوڈ ہو رہے ہیں…" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('صلوٰۃ علی الحبیب ﷺ')).toBeInTheDocument();
    expect(screen.getByText('کام لوڈ ہو رہے ہیں…')).toBeInTheDocument();
  });

  it('falls back to a default label when none is given', () => {
    render(<Spinner />);
    expect(screen.getByText('لوڈ ہو رہا ہے…')).toBeInTheDocument();
  });
});
