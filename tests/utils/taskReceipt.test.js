import { describe, it, expect } from 'vitest';
import {
  RECEIPT_TEXT,
  canAcknowledge,
  isAcknowledged,
  partialLabel,
  receiptFilterOptions,
  receiptSummary,
  receiptsSupported,
  summaryLabel,
} from '../../src/utils/taskReceipt.js';
import { describeActiveFilters, SHEET_FILTER_KEYS } from '../../src/utils/taskFilters.js';

const person = (acknowledgedAt = null) => ({ id: Math.random().toString(36), user: { id: 'u', name: 'X' }, assignedAt: '2026-10-14T05:00:00.000Z', acknowledgedAt });

describe('utils/taskReceipt — the approved wording', () => {
  it('uses exactly the approved strings', () => {
    expect(RECEIPT_TEXT).toEqual({ column: 'وصولی', acknowledge: 'وصول کر لیا', done: '✓ وصول شدہ', pending: 'وصول نہیں ہوا' });
    expect(partialLabel(2, 1)).toBe('2 میں سے 1 نے وصول کیا');
  });

  it('filter labels, and partial only for an admin', () => {
    expect(receiptFilterOptions(true)).toEqual([
      { value: 'received', label: 'وصول شدہ' },
      { value: 'not_received', label: 'وصول نہیں ہوا' },
      { value: 'partial', label: 'جزوی' },
    ]);
    expect(receiptFilterOptions(false).map((o) => o.value)).toEqual(['received', 'not_received']);
  });
});

describe('utils/taskReceipt — admin summary', () => {
  it('received / not_received / partial, each with its label', () => {
    const summary = (people) => receiptSummary({ receipt: { required: people.length, acknowledged: people.filter((p) => p.acknowledgedAt).length, people } });

    expect(summaryLabel(summary([person('t'), person('t')]))).toBe('✓ وصول شدہ');
    expect(summary([person(), person()]).state).toBe('not_received');
    expect(summaryLabel(summary([person(), person()]))).toBe('وصول نہیں ہوا');
    expect(summary([person('t'), person()]).state).toBe('partial');
    expect(summaryLabel(summary([person('t'), person()]))).toBe('2 میں سے 1 نے وصول کیا');
  });

  it('nothing to show for an old task, a backend without receipts, or nobody to confirm', () => {
    expect(receiptSummary({ receipt: null })).toBeNull();
    expect(receiptSummary({})).toBeNull();
    expect(receiptSummary({ receipt: { required: 0, acknowledged: 0, people: [] } })).toBeNull();
  });
});

describe('utils/taskReceipt — the signed-in person\'s own receipt', () => {
  it('can confirm only an open, unconfirmed receipt of their own', () => {
    const mine = (acknowledgedAt, status = 'ongoing') => ({ status, myReceipt: { assignedAt: 'x', acknowledgedAt } });
    expect(canAcknowledge(mine(null))).toBe(true);
    expect(canAcknowledge(mine(null, 'pending'))).toBe(true);
    expect(canAcknowledge(mine(null, 'closed'))).toBe(false);
    expect(canAcknowledge(mine(null, 'complete'))).toBe(false);
    expect(canAcknowledge(mine('2026-10-14T05:00:00.000Z'))).toBe(false);
    expect(canAcknowledge({ status: 'ongoing', myReceipt: null })).toBe(false);
    expect(canAcknowledge({ status: 'ongoing' })).toBe(false);
    expect(isAcknowledged(mine('2026-10-14T05:00:00.000Z', 'closed'))).toBe(true);
    expect(isAcknowledged({})).toBe(false);
  });

  it('knows whether the backend sends receipts at all (the key is there, null or not)', () => {
    expect(receiptsSupported([{ id: 1 }])).toBe(false);
    expect(receiptsSupported([{ id: 1, myReceipt: null }])).toBe(true);
    expect(receiptsSupported(undefined)).toBe(false);
  });
});

describe('utils/taskFilters — the receipt filter as a chip and in the sheet', () => {
  it('the active filter is a chip labelled with its value, which clears only itself', () => {
    const chips = describeActiveFilters({ receipt: 'not_received', status: 'pending' });
    const chip = chips.find((c) => c.key === 'receipt');
    expect(chip.label).toBe('وصول نہیں ہوا');
    expect(chip.clear).toEqual({ receipt: undefined });
  });

  it('is one of the filters the sheet edits', () => {
    expect(SHEET_FILTER_KEYS).toContain('receipt');
  });
});
