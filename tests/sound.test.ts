// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREFS_KEY } from '../src/i18n';
import { cue, soundOn } from '../src/ui/sound';

// ui-ux-v7 X2 (D-U6, L148): sound is off by default and, while off, no AudioContext is ever created.
describe('optional sounds', () => {
  const made = vi.fn();
  class FakeCtx {
    currentTime = 0;
    destination = {};
    constructor() { made(); }
    createOscillator() { return { type: '', frequency: { value: 0 }, connect: (g: unknown) => g, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (d: unknown) => d }; }
  }
  afterEach(() => localStorage.removeItem(PREFS_KEY));

  it('off by default: no AudioContext', () => {
    vi.stubGlobal('AudioContext', FakeCtx);
    expect(soundOn()).toBe(false);
    cue('good');
    cue('bad');
    expect(made).not.toHaveBeenCalled();
  });
  it('on: one context, made at the first cue', () => {
    vi.stubGlobal('AudioContext', FakeCtx);
    localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: 'vi', sound: true }));
    cue('promo');
    cue('good');
    expect(made).toHaveBeenCalledTimes(1);
  });
});
