import { t, type Key } from '../i18n';
import { app, done } from '../state';
import { localStore, readJson, writeJson, type KV } from '../storage';
import { h } from './dom';

export const COACH_KEY = 'cargo-query/coach-done';
export type CoachSpot = 'brief' | 'panel' | 'recap' | 'hints';

const TEXT: Record<CoachSpot, Key> = { brief: 'coach.brief', panel: 'coach.panel', recap: 'coach.recap', hints: 'coach.hints' };
/**
 * Where focus goes when a coach mark removes itself (its own button had focus and would leave it on <body>):
 * what the mark points at, else the brief heading.
 */
const FOCUS_NEXT: Record<CoachSpot, string> = {
  brief: '#work .cm-content',
  panel: '#work .cm-content',
  recap: '.recap button.primary',
  hints: '.hints button',
};
const dismissed = new Set<CoachSpot>();

/** Only a stored `true` means "skipped"; anything else (missing, corrupt, other JSON) shows the coach. */
export const coachDone = (storage: KV | undefined = localStore()): boolean => readJson<unknown>(COACH_KEY, storage) === true;

/** Onboarding (first two tickets only), derived from progress so nothing is stored but "done". */
function spotNow(): CoachSpot | undefined {
  if (coachDone()) return undefined;
  const [first, second] = app.tickets;
  if (first && app.selectedId === first.id) return done().has(first.id) ? 'recap' : app.lastRun ? 'panel' : 'brief';
  if (second && app.selectedId === second.id && !done().has(second.id)) return 'hints';
  return undefined;
}

/** A coach mark placed inside its region (no floating popover), or null. */
export function coach(spot: CoachSpot): HTMLElement | null {
  if (spotNow() !== spot || dismissed.has(spot)) return null;
  const close = (e: Event) => {
    (e.currentTarget as HTMLElement).closest('.coach')?.remove();
    (document.querySelector<HTMLElement>(FOCUS_NEXT[spot]) ?? document.getElementById('brief-title'))?.focus();
  };
  return h('aside', { class: 'coach my-3 rounded-xl bg-accent-soft p-3 ring-1 ring-accent', role: 'note' },
    h('p', { class: 'mt-0 mb-2' }, t(TEXT[spot])),
    h('button', { type: 'button', class: 'mr-1.5', onclick: (e) => { dismissed.add(spot); close(e); } }, t('coach.ok')),
    h('button', { type: 'button', onclick: (e) => { writeJson(COACH_KEY, true); close(e); } }, t('coach.skip')));
}
