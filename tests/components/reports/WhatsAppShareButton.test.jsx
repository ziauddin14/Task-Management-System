import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WhatsAppShareButton from '../../../src/components/reports/WhatsAppShareButton.jsx';

const sampleFile = new File(['x'], 'report.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

function setNavigatorShare({ canShare, share } = {}) {
  if (canShare) Object.defineProperty(window.navigator, 'canShare', { value: canShare, configurable: true });
  if (share) Object.defineProperty(window.navigator, 'share', { value: share, configurable: true });
}

function clearNavigatorShare() {
  delete window.navigator.canShare;
  delete window.navigator.share;
}

// docs/09-frontend-features.md §1 — corrected Web Share API approach (not a wa.me link).
describe('WhatsAppShareButton', () => {
  afterEach(() => clearNavigatorShare());

  it('renders nothing before any export has succeeded (file is null)', () => {
    const { container } = render(<WhatsAppShareButton file={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('appears and calls navigator.share with the exported file when canShare returns true', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigatorShare({ canShare: vi.fn(() => true), share });

    render(<WhatsAppShareButton file={sampleFile} />);

    const button = screen.getByText('واٹس ایپ پر شیئر کریں');
    fireEvent.click(button);

    expect(share).toHaveBeenCalledWith({ files: [sampleFile], title: 'Task Report' });
  });

  it('shows the documented fallback hint (never throws) when canShare is unsupported/absent', () => {
    clearNavigatorShare(); // simulate a browser with no Web Share API at all

    expect(() => render(<WhatsAppShareButton file={sampleFile} />)).not.toThrow();
    expect(screen.getByText('Faisal ki gayi file WhatsApp Desktop/Web mein manually attach kar dein')).toBeInTheDocument();
    expect(screen.queryByText('واٹس ایپ پر شیئر کریں')).not.toBeInTheDocument();
  });

  it('shows the fallback hint when canShare returns false for this specific file', () => {
    setNavigatorShare({ canShare: vi.fn(() => false), share: vi.fn() });

    render(<WhatsAppShareButton file={sampleFile} />);

    expect(screen.getByText('Faisal ki gayi file WhatsApp Desktop/Web mein manually attach kar dein')).toBeInTheDocument();
  });
});
