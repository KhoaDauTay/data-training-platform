// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import css from '../src/style.css?raw';
import { tick } from '../src/ui/celebrate';

// ui-ux-v7 X4 (L166): small motion that never needs a keyframe and stops under reduced motion.
describe('micro-motion', () => {
  afterEach(() => vi.useRealTimers());

  it('a copy button shows one check mark for 1 s, a second click restarts it', () => {
    vi.useFakeTimers();
    const btn = document.createElement('button');
    btn.textContent = 'Copy';
    tick(btn);
    vi.advanceTimersByTime(600);
    tick(btn);
    expect(btn.querySelectorAll('[data-tick]')).toHaveLength(1);
    vi.advanceTimersByTime(900);
    expect(btn.querySelector('[data-tick]')).not.toBeNull();
    vi.advanceTimersByTime(200);
    expect(btn.querySelector('[data-tick]')).toBeNull();
    expect(btn.textContent).toBe('Copy');
  });

  it('one shared focus ring, and reduced motion drops every transition (the sliding tab underline included)', () => {
    expect(css).toMatch(/:focus-visible \{ outline: 2px solid var\(--accent\); outline-offset: 2px; \}/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\* \{ transition: none !important;/);
  });
});
