import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockHtml2canvas = vi.fn();
vi.mock('html2canvas', () => ({ default: (...args) => mockHtml2canvas(...args) }));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const TITLE = '15 بڑے گاؤں پر ایک گھریلو صدقہ بکس ذمہ دار رکھ کر اس نظام کو ایس اوپیز کے مطابق آگے بڑھانے کی پلانگ دینا۔';
vi.mock('../../src/services/tasks.api.js', () => ({
  getTask: vi.fn().mockResolvedValue({
    id: 't1',
    codeNumber: '261101',
    title: '15 بڑے گاؤں پر ایک گھریلو صدقہ بکس ذمہ دار رکھ کر اس نظام کو ایس اوپیز کے مطابق آگے بڑھانے کی پلانگ دینا۔',
    deadline: '2026-10-22T00:00:00.000Z',
    status: 'complete',
    completionPercent: 100,
    performanceRating: 'excellent',
    timeStatus: { type: 'early', days: 1 },
  }),
}));
vi.mock('../../src/services/taskUpdates.api.js', () => ({
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1 } }),
  createTaskUpdate: vi.fn(),
}));

import { prepareExportClone, useExportNodeAsImage } from '../../src/hooks/useExportNodeAsImage.js';
import PreviousUpdatesContent from '../../src/components/task/PreviousUpdatesContent.jsx';

// The PNG export of the Task Details dialog ("کام کی تفصیل"). html2canvas draws a word the browser
// reports as more than one box letter by letter — every visible word of a title cut off with "…" —
// which broke the Urdu title apart; and it draws only the scrolled-into-view part of a table that
// scrolls sideways on a phone. Both are fixed in the copy it draws (onclone), never on screen.
// jsdom has no layout, so the measurements are given here; the real rendering is checked in Chrome.
const setSize = (element, { width, scrollWidth, clientWidth }) => {
  if (width !== undefined) element.getBoundingClientRect = () => ({ width, height: 20, top: 0, left: 0, right: width, bottom: 20 });
  if (scrollWidth !== undefined) Object.defineProperty(element, 'scrollWidth', { value: scrollWidth, configurable: true });
  if (clientWidth !== undefined) Object.defineProperty(element, 'clientWidth', { value: clientWidth, configurable: true });
};

function fixture({ summaryOverflow = 0, updatesOverflow = 0 } = {}) {
  const node = document.createElement('div');
  node.innerHTML = `
    <div data-box="summary" style="overflow-x: auto"><table><tbody><tr>
      <td data-export-wrap="" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px">${TITLE}</td>
    </tr></tbody></table></div>
    <div data-box="updates" style="overflow-x: auto"><table><tbody><tr>
      <td>11:38</td>
      <td data-cell="description" style="white-space: normal; max-width: 240px">کام شروع کر دیا گیا ہے</td>
    </tr></tbody></table></div>
    <p>کارکردگی:</p>`;
  document.body.appendChild(node);
  setSize(node, { width: 354 });
  setSize(node.querySelector('td[data-export-wrap]'), { width: 220 });
  setSize(node.querySelector('[data-box="summary"]'), { scrollWidth: 354 + summaryOverflow, clientWidth: 354 });
  setSize(node.querySelector('[data-box="updates"]'), { scrollWidth: 354 + updatesOverflow, clientWidth: 354 });
  return node;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('prepareExportClone — the copy html2canvas draws', () => {
  it('text marked data-export-wrap wraps at the width it has on screen instead of being cut off', () => {
    const node = fixture();

    prepareExportClone(node);

    const cell = node.querySelector('td[data-export-wrap]');
    expect(cell.style).toMatchObject({ whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', width: '220px', minWidth: '220px', maxWidth: '220px' });
  });

  it('a table that scrolls sideways (a phone): the copy is widened by the widest overflow, so every column is drawn', () => {
    const node = fixture({ summaryOverflow: 246, updatesOverflow: 180 });

    prepareExportClone(node);

    expect(node.style).toMatchObject({ width: '600px', minWidth: '600px', maxWidth: 'none' });
    // A wrapping cell in it gets its max-width, as on a wide screen — not one word per line.
    expect(node.querySelector('[data-cell="description"]').style).toMatchObject({ width: '240px', minWidth: '240px' });
  });

  it('nothing overflows (a desktop): the width and every other cell are left alone', () => {
    const node = fixture();

    prepareExportClone(node);

    expect(node.style.width).toBe('');
    expect(node.style.maxWidth).toBe('');
    expect(node.querySelector('[data-cell="description"]').style.width).toBe('');
  });
});

describe('useExportNodeAsImage', () => {
  // Braces: a function returned from beforeEach is run as its teardown — mockReset() returns the mock.
  beforeEach(() => {
    mockHtml2canvas.mockReset();
  });

  it('hands html2canvas an onclone that prepares only the copy — the page on screen is untouched', async () => {
    const node = fixture({ summaryOverflow: 246 });
    let drawn;
    mockHtml2canvas.mockImplementation(async (element, options) => {
      const clone = element.cloneNode(true);
      document.body.appendChild(clone);
      setSize(clone, { width: 354 });
      setSize(clone.querySelector('td[data-export-wrap]'), { width: 220 });
      setSize(clone.querySelector('[data-box="summary"]'), { scrollWidth: 600, clientWidth: 354 });
      await options.onclone(document, clone);
      drawn = clone;
      return { toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' })) };
    });
    const { result } = renderHook(() => useExportNodeAsImage());

    await act(async () => {
      await result.current.run(node, 'kaam-ki-tafseel');
    });

    expect(mockHtml2canvas).toHaveBeenCalledTimes(1);
    expect(mockHtml2canvas.mock.calls[0][1]).toMatchObject({ scale: 2, backgroundColor: '#ffffff', useCORS: true });
    expect(drawn.querySelector('td[data-export-wrap]').style.whiteSpace).toBe('normal');
    expect(drawn.style.width).toBe('600px');
    // The live node: still cut off with "…", its width untouched.
    expect(node.querySelector('td[data-export-wrap]').style).toMatchObject({ whiteSpace: 'nowrap', textOverflow: 'ellipsis' });
    expect(node.style.width).toBe('');
    expect(result.current.exportedFile).toBeInstanceOf(File);
  });
});

describe('the Task Details title cell', () => {
  it('carries data-export-wrap, and is still cut off with "…" on screen with the full title on hover', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PreviousUpdatesContent taskId="t1" />
      </QueryClientProvider>
    );

    const cell = await screen.findByTitle(TITLE);
    expect(cell.tagName).toBe('TD');
    expect(cell).toHaveAttribute('data-export-wrap');
    expect(cell).toHaveClass('truncate', 'max-w-[220px]', 'whitespace-nowrap');
    expect(cell).toHaveTextContent(TITLE);
  });
});
