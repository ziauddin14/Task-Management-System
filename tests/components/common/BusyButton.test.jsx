import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BusyButton from '../../../src/components/common/BusyButton.jsx';
import BusyRegion from '../../../src/components/common/BusyRegion.jsx';
import Modal from '../../../src/components/common/Modal.jsx';
import { LOADING_PHRASE } from '../../../src/utils/loadingPhrase.js';

// The shared busy-button behaviour: the button keeps its own label and size and only becomes
// disabled + aria-busy; the loading phrase shows in the nearest busy region — the line under a
// <BusyRegion>'s button row, or the strip under a Modal — or, for a full-width button, inside it.
describe('BusyButton', () => {
  it('while idle is an ordinary button: enabled, no aria-busy, passes its props through', () => {
    const onClick = vi.fn();
    render(
      <BusyButton onClick={onClick} className="h-10 px-4" title="hint">
        محفوظ کریں
      </BusyButton>
    );
    const button = screen.getByRole('button', { name: 'محفوظ کریں' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('h-10', 'px-4');
    expect(button).toHaveAttribute('title', 'hint');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('while busy keeps its label, and is disabled + aria-busy so it cannot be pressed twice', () => {
    const onClick = vi.fn();
    render(
      <BusyButton busy onClick={onClick} type="submit">
        محفوظ کریں
      </BusyButton>
    );
    const button = screen.getByRole('button', { name: 'محفوظ کریں' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button.querySelector('[data-phrase-line]')).toBeNull(); // the phrase is NOT squeezed inside
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("`disabled` alone is the caller's own condition — disabled, but not busy and no loading phrase", () => {
    render(
      <BusyRegion>
        <BusyButton disabled>محفوظ کریں</BusyButton>
      </BusyRegion>
    );
    const button = screen.getByRole('button', { name: 'محفوظ کریں' });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  describe('inside a BusyRegion (a button row outside any dialog)', () => {
    function Row({ busy }) {
      return (
        <BusyRegion>
          <div data-testid="row">
            <button type="button">منسوخ کریں</button>
            <BusyButton busy={busy} busyLabel="محفوظ ہو رہا ہے…">
              محفوظ کریں
            </BusyButton>
          </div>
        </BusyRegion>
      );
    }

    it('shows nothing extra while idle — no line is reserved', () => {
      const { container } = render(<Row busy={false} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(container.querySelector('[data-phrase-line]')).toBeNull();
    });

    it('while busy, shows the one-line phrase AFTER the button row, announced by its plain label', () => {
      const { container } = render(<Row busy />);
      const status = screen.getByRole('status');
      const row = screen.getByTestId('row');

      expect(container.querySelector('[data-phrase-line]').textContent).toBe(LOADING_PHRASE);
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('محفوظ ہو رہا ہے…')).toHaveClass('sr-only');
      // Under the row: it follows the row in the document and is not inside it (or the button).
      expect(row.contains(status)).toBe(false);
      expect(row.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('the line appears and disappears with the busy state, and the buttons are the same nodes throughout', () => {
      const { rerender } = render(<Row busy={false} />);
      const save = screen.getByRole('button', { name: 'محفوظ کریں' });
      const cancel = screen.getByRole('button', { name: 'منسوخ کریں' });

      rerender(<Row busy />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'محفوظ کریں' })).toBe(save);
      expect(screen.getByRole('button', { name: 'منسوخ کریں' })).toBe(cancel);

      rerender(<Row busy={false} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(save).toBeEnabled();
    });
  });

  describe('inside a Modal', () => {
    function Dialog({ busy }) {
      return (
        <Modal isOpen onClose={vi.fn()} title="ٹیسٹ">
          <p>مواد</p>
          <BusyButton busy={busy} busyLabel="بھیجا جا رہا ہے۔۔۔">
            اطلاع بھیجیں
          </BusyButton>
        </Modal>
      );
    }

    it('shows no strip while idle', () => {
      const { container } = render(<Dialog busy={false} />);
      expect(container.querySelector('[data-busy-strip]')).toBeNull();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('while busy, shows the phrase in a strip attached under the dialog card — outside its scrolling area', () => {
      const { container } = render(<Dialog busy />);
      const strip = container.querySelector('[data-busy-strip]');
      const button = screen.getByRole('button', { name: 'اطلاع بھیجیں' });
      const scrollingCard = button.closest('.overflow-y-auto');

      expect(strip.querySelector('[data-phrase-line]').textContent).toBe(LOADING_PHRASE);
      expect(screen.getByRole('status')).toHaveTextContent('بھیجا جا رہا ہے۔۔۔');
      expect(scrollingCard).not.toBeNull();
      expect(scrollingCard.contains(strip)).toBe(false); // never inside the card: it cannot move the button
      expect(strip).toHaveClass('absolute', 'top-full');
      // Still part of the dialog, so assistive tech that honours aria-modal announces it.
      expect(screen.getByRole('dialog').contains(strip)).toBe(true);
    });

    it('a button in the modal header (headerActions) uses the same strip', () => {
      const { container } = render(
        <Modal
          isOpen
          onClose={vi.fn()}
          title="ٹیسٹ"
          headerActions={
            <BusyButton busy busyLabel="تیار ہو رہا ہے۔۔۔">
              ایکسپورٹ کریں
            </BusyButton>
          }
        >
          <p>مواد</p>
        </Modal>
      );
      expect(container.querySelector('[data-busy-strip]')).not.toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('تیار ہو رہا ہے۔۔۔');
      expect(screen.getByRole('button', { name: 'ایکسپورٹ کریں' })).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('phraseInside (full-width buttons only)', () => {
    it('replaces the label with the phrase inside the button while busy, without a separate line', () => {
      render(
        <BusyRegion>
          <BusyButton busy phraseInside busyLabel="مزید اطلاعات لوڈ ہو رہی ہیں…" className="h-10 w-full disabled:opacity-50">
            مزید دیکھیں
          </BusyButton>
        </BusyRegion>
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button.querySelector('[data-phrase-line]').textContent).toBe(LOADING_PHRASE);
      expect(button.querySelector('[data-phrase-line]')).toHaveAttribute('aria-hidden', 'true');
      expect(button).not.toHaveTextContent('مزید دیکھیں');
      expect(screen.getByText('مزید اطلاعات لوڈ ہو رہی ہیں…')).toHaveClass('sr-only');
      // Not dimmed like an ordinary disabled button — the phrase is the busy signal.
      expect(button.style.opacity).toBe('1');
      // And nothing is reported to the region: no second phrase under the row.
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows its normal label while idle', () => {
      render(<BusyButton phraseInside>مزید دیکھیں</BusyButton>);
      const button = screen.getByRole('button', { name: 'مزید دیکھیں' });
      expect(button.querySelector('[data-phrase-line]')).toBeNull();
      expect(button.style.opacity).toBe('');
    });
  });
});
