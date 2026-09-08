import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageActionsPortalProvider, PageActions } from '../../src/contexts/PageActionsPortal.jsx';

function Harness({ withTarget }) {
  const [slot, setSlot] = useState(null);
  return (
    <>
      <div data-testid="navbar-slot" ref={withTarget ? setSlot : undefined} />
      <PageActionsPortalProvider target={withTarget ? slot : null}>
        <PageActions>
          <button type="button">Portaled action</button>
        </PageActions>
      </PageActionsPortalProvider>
    </>
  );
}

// Lets a page (e.g. DashboardPage's Print View/Export) render controls inside AppLayout's Navbar
// without AppLayout needing any page-specific knowledge.
describe('PageActionsPortal', () => {
  it('renders children into the provided target node, not inline where <PageActions> sits', () => {
    render(<Harness withTarget />);

    const slot = screen.getByTestId('navbar-slot');
    const button = screen.getByText('Portaled action');
    expect(slot).toContainElement(button);
  });

  it('renders nothing when no target has been provided yet (e.g. before the Navbar slot mounts)', () => {
    const { container } = render(<Harness withTarget={false} />);
    expect(screen.queryByText('Portaled action')).not.toBeInTheDocument();
    expect(container.querySelector('button')).toBeNull();
  });
});
