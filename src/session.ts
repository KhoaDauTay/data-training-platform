import { loadTicketTemplates } from './content';
import { learnedSkills } from './home';
import { localDay, reviewQueue, warmupQueue, type PracticeItem } from './practice';
import { currentChapter } from './progress';
import { SANDBOX_DRAFT_MAX } from './save';
import { app, done, draftKey, selected, stepKey } from './state';
import type { Ticket } from './tickets';

export interface PracticeRun {
  /** Unique per run, so a new run never reuses the previous run's editor. */
  id: number;
  items: PracticeItem[];
  /** Ticket with the item's variant applied; same index as `items`. */
  tickets: Ticket[];
  index: number;
  /** Wrong submits on the current item. */
  wrong: number;
  /** Hints opened on the current item. Never written to save.hintsUsed (XP and the chapter summary read that). */
  hints: number;
  passed: number;
  result?: 'ok' | 'weak';
  /** Editor text of the current item. Practice drafts are never saved. */
  draft: string;
  /** Started from the chapter warm-up card. */
  warmup?: boolean;
}

/** Modes inside the #/play route (not routes of their own). `lane`: a lane side task (Plan 5), outside chapter progress. */
export type Mode = { kind: 'story' } | { kind: 'practice'; run: PracticeRun } | { kind: 'sandbox' } | { kind: 'lane'; ticket: Ticket };

export const session: { mode: Mode } = { mode: { kind: 'story' } };
export const isStory = (): boolean => session.mode.kind === 'story';
/** Story tickets and lane side tasks keep their drafts, graded SQL, hints and history; Practice and the Sandbox do not. */
export const keepsWork = (): boolean => session.mode.kind === 'story' || session.mode.kind === 'lane';

/** Real local day for the Leitner schedule (never the in-game date). */
export const today = (): string => localDay(new Date());
/** Today's review queue (L37). Its length is the "Review: N" count whatever `rnd` is: `rnd` only picks variants. */
export function reviewToday(rnd: () => number = Math.random): PracticeItem[] {
  const d = done();
  return reviewQueue(app.save.review, learnedSkills(app.tickets, d), loadTicketTemplates(), d, today(), rnd);
}
export const reviewCount = (): number => reviewToday(() => 0).length;
/** `day#chapter` of the last warm-up run answered to the end: its card stays hidden until the next day. In memory only. */
export const warmupDone = { key: '' };
const warmupKey = (): string => `${today()}#${currentChapter(app.tickets, done())}`;
export const markWarmupDone = (): void => void (warmupDone.key = warmupKey());

/**
 * Chapter warm-up (curriculum §5.2): only while chapter N ≥ 2 has no completed ticket yet, and not again on the day it was
 * finished. Length does not depend on `rnd`.
 */
export function warmupToday(rnd: () => number = Math.random): PracticeItem[] {
  const d = done();
  const chapter = currentChapter(app.tickets, d);
  if (chapter < 2 || warmupDone.key === warmupKey() || app.tickets.some((t) => t.chapter === chapter && d.has(t.id))) return [];
  return warmupQueue(app.save.review, learnedSkills(app.tickets, d), loadTicketTemplates(), d, chapter, today(), rnd);
}
/** All items of the practice run answered: the left pane shows the summary and the editor is hidden (no ticketless editor). */
export const practiceFinished = (): boolean => session.mode.kind === 'practice' && session.mode.run.index >= session.mode.run.items.length;

export function activeTicket(): Ticket | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') return undefined;
  if (m.kind === 'practice') return m.run.index < m.run.tickets.length ? m.run.tickets[m.run.index] : undefined;
  if (m.kind === 'lane') return m.ticket;
  return selected();
}

export const activeStep = (): number => (session.mode.kind === 'story' ? app.stepIndex : 0);

export function workKey(): string {
  const m = session.mode;
  if (m.kind === 'sandbox') return 'sandbox';
  if (m.kind === 'practice') return `practice#${m.run.id}#${m.run.index}`;
  if (m.kind === 'lane') return stepKey(m.ticket.id, 0);
  return draftKey();
}

/** `undefined` lets the caller fall back (initialDoc: the ticket's `starter`). */
export function readDraft(): string | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') return app.save.sandboxDraft;
  if (m.kind === 'practice') return m.run.draft === '' ? undefined : m.run.draft;
  return app.save.drafts[workKey()];
}

export function writeDraft(v: string): void {
  const m = session.mode;
  if (m.kind === 'sandbox') app.save.sandboxDraft = v.slice(0, SANDBOX_DRAFT_MAX);
  else if (m.kind === 'practice') {
    if (!practiceFinished()) m.run.draft = v;
  }
  else app.save.drafts[workKey()] = v;
}

/** Closed = no Submit, Recap shown. Story tickets and lane side tasks close; Practice always grades. */
export const isClosed = (ticketId: string): boolean =>
  (session.mode.kind === 'story' && done().has(ticketId)) || (session.mode.kind === 'lane' && app.save.lanes.includes(ticketId));

export function hintsShown(ticketId: string): number {
  return session.mode.kind === 'practice' ? session.mode.run.hints : app.save.hintsUsed[ticketId] ?? 0;
}

export function useHint(ticketId: string): void {
  if (session.mode.kind === 'practice') session.mode.run.hints++;
  else app.save.hintsUsed[ticketId] = hintsShown(ticketId) + 1;
}
