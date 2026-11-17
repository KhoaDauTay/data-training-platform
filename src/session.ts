import { generalNow, loadTicketTemplates } from './content';
import { learnedSkills } from './home';
import { dueSkills, localDay, QUEUE_MAX, reviewQueue, warmupQueue, type PracticeItem } from './practice';
import { currentChapter, SKILLS } from './progress';
import { activeDomain, domainSchemaId, type SchemaId } from './domains';
import type { Drill } from './general';
import { domainSlot, DRILL_ID, SANDBOX_DRAFT_MAX } from './save';
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
export type Mode = { kind: 'story' } | { kind: 'practice'; run: PracticeRun } | { kind: 'sandbox' } | { kind: 'lane'; ticket: Ticket }
  /** Plan 8a: a General drill on `lab` (drillTicket(drill)); `wrong` = wrong submits this visit (Leitner result). */
  | { kind: 'drill'; ticket: Ticket; drill: Drill; wrong: number };

export const session: { mode: Mode } = { mode: { kind: 'story' } };
export const isStory = (): boolean => session.mode.kind === 'story';
/** Story tickets and lane side tasks keep their drafts, graded SQL, hints and history; Practice and the Sandbox do not. */
export const keepsWork = (): boolean => session.mode.kind === 'story' || session.mode.kind === 'lane' || session.mode.kind === 'drill';
/** Schema a ticket's SQL runs on: drills (`g-…`) on `lab`, everything else on the open domain's schema (Plan 8a D8a-4, Plan 9). */
export const schemaOf = (tk: Ticket | undefined): SchemaId => (tk && DRILL_ID.test(tk.id) ? 'lab' : domainSchemaId());
/** A review drill runs as a Practice item (Plan 8a Task 8), so the schema follows the open ticket, not the mode. */
export const activeSchema = (): SchemaId => schemaOf(activeTicket());

/** Real local day for the Leitner schedule (never the in-game date). */
export const today = (): string => localDay(new Date());
/** Today's review queue (L37). Its length is the "Review: N" count whatever `rnd` is: `rnd` only picks variants. */
export function reviewToday(rnd: () => number = Math.random, drills = generalNow()?.bySkill): PracticeItem[] {
  const d = done();
  return reviewQueue(app.save.review, reviewSkills(), loadTicketTemplates(), d, today(), rnd, drills, reviewedDrills);
}
/** Skills under review: learned through tickets, or holding a card (a drill passed in the General area creates one, D8a-11). */
const reviewSkills = (): Set<string> =>
  new Set([...learnedSkills(app.tickets, done()), ...Object.keys(app.save.review).filter((s) => SKILLS.some((k) => k.id === s))]);
/** Drills reviewed this session (memory only): the next review of the same skill picks another one. */
export const reviewedDrills = new Set<string>();
/** Every skill has drills (tests/general.test.ts), so the drill queue holds one item per due skill: countable without the General chunk. */
export const reviewCount = (): number => Math.min(dueSkills(app.save.review, reviewSkills(), today()).length, QUEUE_MAX);
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
  if (m.kind === 'lane' || m.kind === 'drill') return m.ticket;
  return selected();
}

export const activeStep = (): number => (session.mode.kind === 'story' ? app.stepIndex : 0);

export function workKey(): string {
  const m = session.mode;
  if (m.kind === 'sandbox') return 'sandbox';
  if (m.kind === 'practice') return `practice#${m.run.id}#${m.run.index}`;
  if (m.kind === 'lane' || m.kind === 'drill') return stepKey(m.ticket.id, 0);
  return draftKey();
}

/** v4 §B.3: the first Sandbox visit starts from a small query instead of an empty editor (ports is open from chapter 1). */
export const SANDBOX_STARTER = 'SELECT * FROM ports LIMIT 20';
/** Plan 9: E-commerce has no `ports`; products is open from its chapter 1. */
export const sandboxStarter = (): string => (activeDomain() === 'logistics' ? SANDBOX_STARTER : 'SELECT * FROM products LIMIT 20');

/** `undefined` lets the caller fall back (initialDoc: the ticket's `starter`). */
export function readDraft(): string | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') {
    const draft = domainSlot(app.save, activeDomain()).sandboxDraft;
    return draft.trim() ? draft : sandboxStarter();
  }
  if (m.kind === 'practice') return m.run.draft === '' ? undefined : m.run.draft;
  return app.save.drafts[workKey()];
}

export function writeDraft(v: string): void {
  const m = session.mode;
  if (m.kind === 'sandbox') domainSlot(app.save, activeDomain()).sandboxDraft = v.slice(0, SANDBOX_DRAFT_MAX);
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
