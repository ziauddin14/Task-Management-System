import { useEffect, useRef, useState } from 'react';

const FIRST_RUN_MS = 750;
const UPDATE_MS = 250;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function decimalsOf(value) {
  const text = String(value);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

// Whether a number may be animated at all here. Not where there is no browser to ask (server
// rendering, the test environment — no matchMedia / requestAnimationFrame), and not for a person
// who has asked their device to reduce motion.
export function canAnimateNumbers() {
  if (typeof window === 'undefined' || !window.matchMedia || !window.requestAnimationFrame) return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// A number that counts up to `value`: from 0 on its first appearance (about three quarters of a
// second, easing out), and by a quick 250ms tween from whatever is showing when the value later
// changes (a filter was applied). What it settles on is always exactly `value` — the animation
// only ever passes through rounded in-between figures, with the same number of decimals.
//
// Where numbers may not be animated (see canAnimateNumbers) it returns `value` at once, on the
// first render, with no intermediate state at all.
export function useCountUp(value) {
  const animate = useRef(canAnimateNumbers()).current;
  const isNumber = typeof value === 'number' && Number.isFinite(value);
  const [shown, setShown] = useState(animate && isNumber ? 0 : value);
  const shownRef = useRef(shown);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!animate || !isNumber) {
      shownRef.current = value;
      setShown(value);
      return undefined;
    }

    const from = typeof shownRef.current === 'number' ? shownRef.current : 0;
    // The first count-up is the long one. It only counts as done once it has actually reached its
    // value: an effect that is torn down and re-run before then (React's development double-mount, or
    // a value that changes mid-way) starts the long run again rather than a short tween from ~0.
    const duration = hasRunRef.current ? UPDATE_MS : FIRST_RUN_MS;
    if (from === value) {
      hasRunRef.current = true;
      setShown(value);
      return undefined;
    }

    const factor = 10 ** decimalsOf(value);
    const startedAt = window.performance.now();
    let frame;
    function step(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const next = progress >= 1 ? value : Math.round((from + (value - from) * easeOutCubic(progress)) * factor) / factor;
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = window.requestAnimationFrame(step);
      else hasRunRef.current = true;
    }
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [animate, isNumber, value]);

  return shown;
}
