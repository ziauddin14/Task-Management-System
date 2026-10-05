import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomSheet from '../../../src/components/mobile/BottomSheet.jsx';
import Modal from '../../../src/components/common/Modal.jsx';

function Opener({ footer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open
      </button>
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="فلٹر" footer={footer}>
        <button type="button">Inside</button>
      </BottomSheet>
    </>
  );
}

describe('BottomSheet — the mobile layout\'s overlay panel', () => {
  it('renders nothing while closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={vi.fn()} title="فلٹر">
        content
      </BottomSheet>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open: a modal dialog named by its title, docked to the bottom edge with rounded top corners', () => {
    render(
      <BottomSheet isOpen onClose={vi.fn()} title="فلٹر">
        content
      </BottomSheet>
    );
    const sheet = screen.getByRole('dialog', { name: 'فلٹر' });

    expect(sheet).toHaveAttribute('aria-modal', 'true');
    expect(sheet).toHaveClass('w-full', 'rounded-t-tk-hero', 'max-h-[88vh]');
    expect(sheet.parentElement).toHaveClass('fixed', 'inset-0', 'items-end');
    expect(screen.getByRole('heading', { name: 'فلٹر' })).toBeInTheDocument();
  });

  it('closes by its close button, by the backdrop and by Escape', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="فلٹر">
        content
      </BottomSheet>
    );
    const [backdrop, closeButton] = screen.getAllByRole('button', { name: 'بند کریں' });

    fireEvent.click(closeButton);
    fireEvent.click(backdrop);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(3);
    expect(closeButton).toHaveClass('h-tk-touch', 'w-tk-touch'); // a 44px target
  });

  it('other keys do not close it, and Escape does nothing once it is closed', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <BottomSheet isOpen onClose={onClose} title="فلٹر">
        content
      </BottomSheet>
    );
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <BottomSheet isOpen={false} onClose={onClose} title="فلٹر">
        content
      </BottomSheet>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focus moves into the sheet when it opens and returns to what opened it when it closes', () => {
    render(<Opener />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();

    fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'فلٹر' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('a footer stays outside the scrolling content, so its buttons never scroll out of reach', () => {
    render(<Opener footer={<button type="button">Apply</button>} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const scroller = screen.getByRole('dialog').querySelector('.overflow-y-auto');

    expect(scroller).toContainElement(screen.getByRole('button', { name: 'Inside' }));
    expect(scroller).not.toContainElement(screen.getByRole('button', { name: 'Apply' }));
  });

  it('slides in only through classes that are animated solely when motion is allowed (prefers-reduced-motion)', () => {
    render(
      <BottomSheet isOpen onClose={vi.fn()} title="فلٹر">
        content
      </BottomSheet>
    );
    // styles/tokens.css defines both animations inside @media (prefers-reduced-motion: no-preference).
    expect(screen.getByRole('dialog')).toHaveClass('tk-sheet-enter');
    expect(screen.getAllByRole('button', { name: 'بند کریں' })[0]).toHaveClass('tk-backdrop-enter');
  });
});

// Every existing dialog (details, update, send-notification, confirm, task form…) is rendered by
// common/Modal.jsx. Below 768px it becomes a bottom sheet — with `max-md:` classes only, so the
// centred card at 768px and up is untouched.
describe('Modal — a bottom sheet below 768px, the same centred card above', () => {
  function renderModal() {
    render(
      <Modal isOpen onClose={vi.fn()} title="کام اپڈیٹ کریں">
        <p>body</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'کام اپڈیٹ کریں' });
    return { dialog, overlay: dialog.parentElement, card: dialog.firstElementChild };
  }

  it('keeps every class it had: centred, padded, max-w-lg, 90vh, rounded card', () => {
    const { dialog, overlay, card } = renderModal();
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center', 'p-4');
    expect(dialog).toHaveClass('relative', 'w-full', 'max-w-lg');
    expect(card).toHaveClass('max-h-[90vh]', 'w-full', 'overflow-y-auto', 'rounded-lg', 'border-t-4', 'border-brand', 'bg-white', 'p-4', 'shadow-xl');
  });

  it('adds the phone layout only as max-md: variants — docked to the bottom, full width, rounded top', () => {
    const { dialog, overlay, card } = renderModal();
    expect(overlay).toHaveClass('max-md:items-end', 'max-md:p-0');
    expect(dialog).toHaveClass('max-md:max-w-none');
    expect(card).toHaveClass('max-md:max-h-[88vh]', 'max-md:rounded-b-none', 'max-md:rounded-t-[20px]');

    // Nothing was added that could reach 768px and up: every new class is behind max-md:.
    const original = new Set(['fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center', 'p-4', 'relative', 'w-full', 'max-w-lg', 'max-h-[90vh]', 'overflow-y-auto', 'rounded-lg', 'border-t-4', 'border-brand', 'bg-white', 'shadow-xl']);
    [overlay, dialog, card].forEach((element) => {
      [...element.classList].filter((name) => !original.has(name)).forEach((name) => expect(name.startsWith('max-md:')).toBe(true));
    });
  });
});
