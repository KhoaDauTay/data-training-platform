import { generalNow, loadTicketTemplates } from './content';
import { learnedSkills } from './home';
import { dueSkills, localDay, QUEUE_MAX, reviewQueue, warmupQueue, type PracticeItem } from './practice';
import { currentChapter, SKILLS, xpFor } from './progress';
import { activeDomain, domainSchemaId, type DomainId, type SchemaId } from './domains';
import type { Drill } from './general';
import { domainSlot, DRILL_ID, SANDBOX_DRAFT_MAX } from './save';
import { app, done, draftKey, selected, stepKey } from './state';
import { readJson, writeJson, type KV } from './storage';
import { drillHash, LEARN_PLAY } from './route';
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
  | { kind: 'drill'; ticket: Ticket; drill: Drill; wrong: number; framed?: boolean };

export const session: { mode: Mode } = { mode: { kind: 'story' } };
export const isStory = (): boolean => session.mode.kind === 'story';
/** Story tickets and lane side tasks keep their drafts, graded SQL, hints and history; Practice and the Sandbox do not. */
export const keepsWork = (): boolean => session.mode.kind === 'story' || session.mode.kind === 'lane' || session.mode.kind === 'drill';
/** Schema a ticket's SQL runs on: drills (`g-…`) on `lab`, everything else on the open domain's schema (Plan 8a D8a-4, Plan 9). */
export const schemaOf = (tk: Ticket | undefined): SchemaId => (tk && DRILL_ID.test(tk.id) ? 'lab' : domainSchemaId());
/** A review drill runs as a Practice item (Plan 8a Task 8), so the schema follows the open ticket, not the mode. */
export const activeSchema = (): SchemaId => schemaOf(activeTicket());
/** The workspace's data: the open ticket's schema; a finished practice run keeps its last item's (a review of drills stays on lab). */
export function playSchema(): SchemaId {
  const m = session.mode;
  return m.kind === 'practice' ? schemaOf(m.run.tickets[Math.min(m.run.index, m.run.tickets.length - 1)]) : activeSchema();
}
/** v15 Q1: the workspace holds a drill or a review of drills; it lives on #/learn/play, outside every domain. */
export const generalWork = (): boolean => playSchema() === 'lab';

/**
 * The session mode is never saved (a reload used to be story mode). Only to survive a reload, the Sandbox and a lane task
 * are noted at pagehide in this device pref and read once on the next load (drills keep theirs in the hash, drillHash).
 * Practice runs are a random queue and stay in memory.
 */
export const SESSION_KEY = 'cargo-query/session';
export type SessionNote = { kind: 'sandbox'; domain: DomainId } | { kind: 'lane'; domain: DomainId; id: string };
export function sessionNote(mode: Mode, domain: DomainId): SessionNote | null {
  if (mode.kind === 'sandbox') return { kind: 'sandbox', domain };
  return mode.kind === 'lane' ? { kind: 'lane', domain, id: mode.ticket.id } : null;
}
/** Anything else stored (old, edited, broken) reads as null. */
export function parseSessionNote(v: unknown): SessionNote | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.domain !== 'string') return null;
  if (o.kind === 'sandbox') return { kind: 'sandbox', domain: o.domain as DomainId };
  return o.kind === 'lane' && typeof o.id === 'string' ? { kind: 'lane', domain: o.domain as DomainId, id: o.id } : null;
}
/** The General workspace's hash for what it holds: a drill's own hash (a reload reopens it), LEARN_PLAY for a review of drills, else undefined (v15 Q1). */
export const generalHash = (): string | undefined =>
  !generalWork() ? undefined : session.mode.kind === 'drill' ? drillHash(session.mode.drill.id) : LEARN_PLAY;

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
/** Plan 9: E-commerce and Finance have no `ports`; `products` is open from chapter 1 in both (v9 §6.2). */
export const sandboxStarter = (): string => (activeDomain() === 'logistics' ? SANDBOX_STARTER : 'SELECT * FROM products LIMIT 20');

/** `undefined` lets the caller fall back (initialDoc: the ticket's `starter`). */
/** L5 (v12.0): device pref, the domains whose Sandbox the player has edited; there an empty draft stays empty. Never in Save. */
export const SANDBOX_SEEN_KEY = 'cargo-query/sandbox-seen';
const seenList = (storage?: KV): string[] => {
  const v = readJson<unknown>(SANDBOX_SEEN_KEY, storage);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};
export const sandboxSeen = (d: DomainId, storage?: KV): boolean => seenList(storage).includes(d);
export function markSandboxSeen(d: DomainId, storage?: KV): void {
  if (!sandboxSeen(d, storage)) writeJson(SANDBOX_SEEN_KEY, [...seenList(storage), d], storage);
}

export function readDraft(): string | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') {
    const draft = domainSlot(app.save, activeDomain()).sandboxDraft;
    return draft.trim() ? draft : sandboxSeen(activeDomain()) ? '' : sandboxStarter();
  }
  if (m.kind === 'practice') return m.run.draft === '' ? undefined : m.run.draft;
  return app.save.drafts[workKey()];
}

export function writeDraft(v: string): void {
  const m = session.mode;
  if (m.kind === 'sandbox') {
    domainSlot(app.save, activeDomain()).sandboxDraft = v.slice(0, SANDBOX_DRAFT_MAX);
    if (v !== sandboxStarter()) markSandboxSeen(activeDomain()); // the player's own edit, not the starter loading
  }
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

/**
 * v13 §3.6: what "Fill the scaffold" costs now. Story, lane, E-com and promotion reviews: it opens every hint (`xp` = the
 * XP that costs, 0 in chapter 1 and for a lane task's flat XP → 'free'); Practice: the run is no longer a clean pass
 * (`weak`, a review drill too, though it has one hint); a drill: its pass is weak (`framed`, never saved: D-H4). Once paid: 'free'.
 */
export function framePrice(tk: Ticket): { xp: number; hint: number } | 'weak' | 'free' {
  const m = session.mode;
  const n = tk.hints.length;
  if (m.kind === 'drill') return m.framed ? 'free' : 'weak';
  if (m.kind === 'practice') return m.run.hints >= 2 ? 'free' : 'weak'; // isSuccess: ≤ 1 hint
  const xp = m.kind === 'lane' ? 0 : xpFor(tk, hintsShown(tk.id)) - xpFor(tk, n);
  return xp > 0 ? { xp, hint: n } : 'free';
}

/** Pays the price above, only once the editor really holds the scaffold. */
export function payFrame(tk: Ticket): void {
  const m = session.mode;
  if (m.kind === 'drill') m.framed = true;
  else if (m.kind === 'practice') m.run.hints = Math.max(m.run.hints, 2, tk.hints.length);
  else app.save.hintsUsed[tk.id] = Math.max(hintsShown(tk.id), tk.hints.length);
}
