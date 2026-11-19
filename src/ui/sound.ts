import { PREFS_KEY, t } from '../i18n';
import { readJson, writeJson } from '../storage';
import { byId, h } from './dom';
import { icon } from './icons';

/**
 * ui-ux-v7 P3 X2 (D-U6, L148): optional sounds, off by default (device pref `sound` in cargo-query/prefs, never the Save).
 * Three synthesized cues (WebAudio, no files): a correct story answer, a wrong story submit, a promotion. Nothing on Run,
 * in Practice/reviews or as background. The AudioContext is created on the first cue after the player turned sound on,
 * which always follows a click (autoplay rules).
 */
export type Cue = 'good' | 'bad' | 'promo';
const NOTES: Record<Cue, [freq: number, at: number, len: number][]> = {
  good: [[660, 0, 0.09], [880, 0.09, 0.09]], // two notes up, 180 ms
  bad: [[220, 0, 0.14]], // one soft low note, 140 ms
  promo: [[523, 0, 0.16], [659, 0.16, 0.16], [784, 0.32, 0.18]], // three notes, 500 ms
};
const GAIN = 0.08;

export const soundOn = (): boolean => readJson<{ sound?: unknown }>(PREFS_KEY)?.sound === true;

let ctx: AudioContext | undefined;
export function cue(kind: Cue): void {
  if (!soundOn() || typeof AudioContext !== 'function') return;
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    for (const [f, at, len] of NOTES[kind]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + at);
      g.gain.linearRampToValueAtTime(GAIN, now + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      o.connect(g).connect(ctx.destination);
      o.start(now + at);
      o.stop(now + at + len + 0.02);
    }
  } catch { /* no audio on this device: silent */ }
}

/** The ⋯ menu's switch (added here, not in index.html); relabelled by rerender(). */
let btn: HTMLButtonElement | undefined;
export function initSound(): void {
  btn = h('button', {
    type: 'button', id: 'sound-btn', class: 'flex w-full items-center gap-2 rounded-(--r-inset) border-0 bg-transparent px-3 py-2 text-left hover:bg-code',
    onclick: () => {
      writeJson(PREFS_KEY, { ...readJson<object>(PREFS_KEY), sound: !soundOn() });
      relabelSound();
      cue('good'); // a sample right away when turned on (silent when off)
    },
  }) as HTMLButtonElement;
  byId('replay-btn').before(btn);
  relabelSound();
}
export function relabelSound(): void {
  if (!btn) return;
  const on = soundOn();
  btn.setAttribute('aria-pressed', String(on));
  btn.replaceChildren(icon(on ? 'soundOn' : 'soundOff', 'size-4'), h('span', {}, t(on ? 'sound.on' : 'sound.off')));
}
