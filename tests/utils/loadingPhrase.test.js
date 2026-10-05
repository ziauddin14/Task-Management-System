import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  LOADING_PHRASE,
  LOADING_PHRASE_FIRST,
  LOADING_PHRASE_GAP,
  LOADING_PHRASE_SECOND,
} from '../../src/utils/loadingPhrase.js';

// The loading phrase was supplied by the client verbatim and must never be retyped, "corrected" or
// normalized. It is deliberately NOT repeated in this file: the tests lock it by fingerprint and by
// code-point shape instead, so an accidental edit, a stripped diacritic, a collapsed gap or an
// editor's Unicode normalization all fail here.
const countOf = (codePoint) => [...LOADING_PHRASE].filter((ch) => ch.codePointAt(0) === codePoint).length;

describe('LOADING_PHRASE', () => {
  it('is byte-for-byte the phrase the client supplied', () => {
    const fingerprint = createHash('sha256').update(LOADING_PHRASE, 'utf8').digest('hex');
    expect(fingerprint).toBe('a8c2938a1d99f6f8bfe295d3376c198f2f3fda3f8976129b8f1479f4a897bb71');
    expect([...LOADING_PHRASE]).toHaveLength(80);
  });

  it('keeps every diacritic', () => {
    expect(countOf(0x064e)).toBe(11); // zabar
    expect(countOf(0x064f)).toBe(3); // pesh
    expect(countOf(0x0650)).toBe(1); // zer
    expect(countOf(0x0651)).toBe(3); // shadda
    expect(countOf(0x0652)).toBe(4); // jazm
    expect(countOf(0x0670)).toBe(2); // khari zabar
  });

  it('keeps the wide gap between the two halves, and splits cleanly around it', () => {
    expect(LOADING_PHRASE_GAP).toBe(' '.repeat(17));
    expect([...LOADING_PHRASE_FIRST]).toHaveLength(27);
    expect([...LOADING_PHRASE_SECOND]).toHaveLength(36);
    expect(LOADING_PHRASE_FIRST + LOADING_PHRASE_GAP + LOADING_PHRASE_SECOND).toBe(LOADING_PHRASE);
    // Neither half carries stray whitespace at the edge that meets the gap.
    expect(LOADING_PHRASE_FIRST).toBe(LOADING_PHRASE_FIRST.trim());
    expect(LOADING_PHRASE_SECOND).toBe(LOADING_PHRASE_SECOND.trim());
  });
});
