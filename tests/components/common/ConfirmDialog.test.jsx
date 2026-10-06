import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ConfirmDialog from '../../../src/components/common/ConfirmDialog.jsx';

function renderDialog(props = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <ConfirmDialog
      isOpen
      title="کام بند کریں"
      message="کیا واقعی بند کرنا چاہتے ہیں؟"
      confirmLabel="ہاں، بند کریں"
      cancelLabel="منسوخ کریں"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  );
  return { ...utils, onConfirm, onCancel };
}
const dialog = () => screen.getByRole('dialog', { name: 'کام بند کریں' });

// Redesign: the confirmation uses the shared Modal's opt-in look. What it says and does is unchanged.
describe('ConfirmDialog', () => {
  it('is a redesigned dialog named by its title, showing the message and both labels', () => {
    renderDialog();
    expect(dialog()).toHaveAttribute('data-modal-variant', 'redesign');
    expect(dialog()).toHaveTextContent('کیا واقعی بند کرنا چاہتے ہیں؟');
    expect(within(dialog()).getByRole('button', { name: 'ہاں، بند کریں' })).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'منسوخ کریں' })).toBeInTheDocument();
  });

  it('falls back to "ہاں" / "منسوخ کریں" when no labels are given', () => {
    renderDialog({ confirmLabel: undefined, cancelLabel: undefined });
    expect(within(dialog()).getByRole('button', { name: 'ہاں' })).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: 'منسوخ کریں' })).toBeInTheDocument();
  });

  it('tone="danger": a red icon chip and the danger button', () => {
    renderDialog({ tone: 'danger' });
    expect(dialog().querySelector('[data-modal-icon]')).toHaveClass('bg-tk-danger-bg', 'text-tk-danger');
    const confirm = within(dialog()).getByRole('button', { name: 'ہاں، بند کریں' });
    expect(confirm).toHaveClass('bg-tk-danger-bg', 'text-tk-danger');
    expect(confirm).not.toHaveClass('bg-tk-green-700');
  });

  it('without a tone: the green icon chip and the primary button', () => {
    renderDialog();
    expect(dialog().querySelector('[data-modal-icon]')).toHaveClass('bg-tk-closed-tint', 'text-tk-green-700');
    expect(within(dialog()).getByRole('button', { name: 'ہاں، بند کریں' })).toHaveClass('bg-tk-green-700');
  });

  it('the confirm button confirms; the cancel button, the × and Escape all cancel', () => {
    const { onConfirm, onCancel } = renderDialog({ tone: 'danger' });

    fireEvent.click(within(dialog()).getByRole('button', { name: 'ہاں، بند کریں' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'منسوخ کریں' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'بند کریں' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('while loading: the confirm button keeps its label, is busy and disabled, cancel is disabled, and the loading phrase shows', () => {
    const { onConfirm, onCancel } = renderDialog({ tone: 'danger', isLoading: true });
    const confirm = within(dialog()).getByRole('button', { name: 'ہاں، بند کریں' });

    expect(confirm).toHaveAttribute('aria-busy', 'true');
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveTextContent('ہاں، بند کریں');
    expect(within(dialog()).getByRole('button', { name: 'منسوخ کریں' })).toBeDisabled();
    expect(document.querySelector('[data-busy-strip] [data-phrase-line]')).not.toBeNull();

    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    const { container } = renderDialog({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });
});
