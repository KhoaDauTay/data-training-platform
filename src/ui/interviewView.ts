import type * as Content from '../content';
import type * as Home from '../home';
import type * as I18n from '../i18n';
import { ivText, type IvKey } from '../i18n/interview';
import type { InterviewContent, InterviewSet, TakeHome } from '../interview';
import type * as Prefs from '../interviewPrefs';
import type { InterviewPrefs, LiveRun } from '../interviewPrefs';
import type * as Progress from '../progress';
import type * as Route from '../route';
import type * as Session from '../session';
import type { InterviewRun } from '../session';
import type * as State from '../state';
import type * as Storage from '../storage';
import type * as Dom from './dom';
import type * as PaneTabs from './paneTabs';
import { ivTabs } from './ivTabs';

/**
 * Interview room UI (v17 I5, L144, docs/team/interview-room.md): the list page (#/learn/interview) and the left pane of a
 * run in the General workspace (#/learn/play/<question or step id>). A lazy chunk (budget `interview`), loaded by
 * src/ui/modes.ts; every main-bundle value comes in through `InterviewDeps` (Plan 6 U3: only `import type` from main modules).
 * The editor, Run/Submit and the grader are the shared workspace (work.ts), with keepsWork() false. Nothing here writes the
 * Save: results, the run in progress and the written conclusion live in the device pref `cargo-query/interview`.
 */
export interface InterviewDeps {
  h: typeof Dom.h; nodes: typeof Dom.nodes; richText: typeof Dom.richText; announce: typeof Dom.announce;
  getLang: typeof I18n.getLang; locale: typeof I18n.locale;
  app: typeof State.app; actions: typeof State.actions;
  session: typeof Session.session; ivItemId: typeof Session.ivItemId; ivHooks: typeof Session.ivHooks; readDraft: typeof Session.readDraft; today: typeof Session.today;
  readJson: typeof Storage.readJson; writeJson: typeof Storage.writeJson;
  hashOf: typeof Route.hashOf; drillHash: typeof Route.drillHash; interviewTabHash: typeof Route.interviewTabHash; showPane: typeof PaneTabs.showPane;
  /** src/interviewPrefs.ts by value through main: the v16 portfolio may import it from main, so this chunk never does (Plan 6 U3). */
  prefs: { key: typeof Prefs.INTERVIEW_KEY; parse: typeof Prefs.parseInterviewPrefs; textMax: number; elapsed: typeof Prefs.elapsed; setPresence: typeof Prefs.setPresence };
  SKILLS: typeof Progress.SKILLS; knownSkills: typeof Home.knownSkills; loadTickets: typeof Content.loadTickets;
  /** Opens the run in the workspace (session mode + new editor + #/learn/play/<id>). */
  enter(run: InterviewRun): void;
  /** Rebuilds the editor for the run's current question or step (force: a new ticket, the last run dropped). */
  openEditor(force: boolean): void;
  /** Back to the interview room page; the run in progress stays in the pref. */
  leave(): void;
  /** Starts or resumes a run from the list page (seeds `lab` first; the clicked button waits). */
  startRun(id: string, timer: boolean, fresh: boolean): void;
}

let d$: InterviewDeps;
let c$: InterviewContent;
const it = (key: IvKey, params?: I18n.Params): string => ivText(d$.getLang(), d$.locale(), key, params);
/** v21 U24: a list row (text left, its button right from sm), not a tall card per set. */
const ROW = 'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-(--r-card) bg-panel px-5 py-3 ring-1 ring-line';
const TITLE = { id: 'brief-title', tabindex: '-1', class: 'm-0 text-title font-bold' };
/** eye-v47b B-08 (L1116): the numbered disc the engine tabs' rows start with (green once handed in), so all four tabs share one row. */
const disc = (i: number, done: boolean): HTMLElement => d$.h('span', { class: done ? 'grid size-10 shrink-0 place-items-center rounded-full bg-good font-bold text-on-accent' : 'grid size-10 shrink-0 place-items-center rounded-full bg-code font-bold text-ink', 'aria-hidden': 'true' }, String(i + 1));
/** "Run the timer" on the list page: off by default (D-N10), remembered for this page load only. */
let timerPick = false;

/** Called once by modes.ts right after this chunk and the content load. */
export function initInterview(deps: InterviewDeps, content: InterviewContent): void {
  d$ = deps;
  c$ = content;
  deps.ivHooks.changed = saveLive; // every draft change: a reload keeps the place and the text
  // eye-v47b B-06 (L1114): an ask's Submit waits until the right reading is picked (the task it grades is not shown before)
  deps.ivHooks.blocked = (): boolean => {
    const m = d$.session.mode;
    if (m.kind !== 'interview' || m.run.kind !== 'th' || m.run.phase !== 'work') return false;
    return !!thOf(m.run.id)?.clarify && !m.run.hints.includes(pickMark(m.run));
  };
}

const read = (): InterviewPrefs => d$.prefs.parse(d$.readJson<unknown>(d$.prefs.key));
const write = (p: InterviewPrefs): void => void d$.writeJson(d$.prefs.key, p);
const withLive = (p: InterviewPrefs, run: InterviewRun): InterviewPrefs => ({ ...p, live: { ...p.live, [run.id]: liveOf(run) } });
const runNow = (): InterviewRun | undefined => (d$.session.mode.kind === 'interview' ? d$.session.mode.run : undefined);
function liveOf(run: InterviewRun): LiveRun {
  const { kind: _k, tickets: _t, minutes: _m, ...live } = run;
  return live;
}
function saveLive(): void {
  const run = runNow();
  if (run) write(withLive(read(), run));
}
const setOf = (id: string): InterviewSet | undefined => c$.sets.find((s) => s.id === id);
const thOf = (id: string): TakeHome | undefined => c$.takeHomes.find((x) => x.id === id);
/** mm:ss (h:mm:ss past an hour). */
function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const two = (n: number): string => String(n).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}` : `${Math.floor(s / 60)}:${two(s % 60)}`;
}
const range = (m: number[]): { from: number; to: number } => ({ from: Math.min(...m), to: Math.max(...m) });

/**
 * A run for `id` (a set or a take-home): the one in progress in the pref unless `fresh`, else a new one. With the timer on,
 * trap questions lose their `wrong:` explanations (they would be hints).
 */
function build(id: string, timer: boolean, fresh: boolean): InterviewRun {
  const tickets = c$.ticketsOf(id);
  if (!tickets) throw new Error(`unknown interview ${id}`);
  const set = setOf(id);
  const old = fresh ? undefined : read().live[id];
  if (old?.phase === 'work') d$.prefs.setPresence(old, true, Date.now()); // FIX-1: the time away (even a closed tab) is not counted
  if (fresh) {
    toldUp.delete(id);
    picks.delete(id); // v47: a fresh ask starts with no option pressed
  }
  const live: LiveRun = old ?? {
    id, timer: !!set && timer, start: Date.now(), index: 0, step: 0, solved: [], drafts: {}, passed: {}, hints: [], phase: 'work', text: '', checks: [],
  };
  const last = set ? set.questions.length - 1 : thOf(id)!.steps.length - 1;
  live.index = Math.min(live.index, set ? last : 0);
  live.step = Math.min(live.step, set ? 0 : last);
  return {
    ...live, kind: set ? 'set' : 'th', minutes: set?.minutes ?? 0,
    tickets: live.timer ? tickets.map(({ wrong: _w, ...tk }) => tk) : tickets,
  };
}

/** List page buttons: start (or resume) a set or a take-home. */
export function start(id: string, timer: boolean, fresh: boolean): void {
  const run = build(id, timer, fresh);
  d$.enter(run);
  saveLive();
}

/** A reload on #/learn/play/<g-iv-…>: that run, at that question (a take-home never past the step reached). */
export function reopen(item: string): void {
  const place = c$.placeOf(item);
  if (!place) throw new Error(`unknown interview item ${item}`);
  const run = build(place.run, false, false);
  if (run.kind === 'set') run.index = place.index;
  else run.step = Math.min(place.step, run.step);
  syncHash(run); // FIX-1: a clamped take-home step replaces the hash, so enter() → go('play') adds no history entry
  d$.enter(run);
  saveLive();
}

/** The hash follows the question or step on screen (replaced, so Back leaves the run instead of walking its questions). */
function syncHash(run: InterviewRun): void {
  if (thOf(run.id)?.domain) return; // v47: a case runs on its domain's /play hash (a reload resumes from the Overview card)
  const to = d$.drillHash(d$.ivItemId(run));
  if (location.hash !== to) history.replaceState(history.state, '', to);
}
function markPassed(run: InterviewRun, sql: string): void {
  const id = d$.ivItemId(run);
  run.passed[id] = sql; // what Submit graded (FIX-1: not the editor's text, which may have changed while it ran)
  if (!run.solved.includes(id)) run.solved.push(id);
}

/** work.ts onSolved in interview mode: a set question is marked right; a take-home's last step opens the written conclusion. 0 XP. */
export function solved(sql: string): void {
  const run = runNow();
  if (!run || run.phase !== 'work') return;
  markPassed(run, sql);
  if (run.kind === 'th') run.phase = 'write';
  saveLive();
  d$.actions.rerender();
  if (run.kind === 'th') {
    d$.showPane('ticket'); // phone: the editor pane is about to hide; the conclusion is in the brief pane
    d$.announce(it('iv.thDone'));
    document.getElementById('iv-text')?.focus();
  }
}

/** work.ts onStepSolved in interview mode: the next take-home step, starting from the SQL that just passed. */
export function stepSolved(sql: string): void {
  const run = runNow();
  if (!run || run.kind !== 'th') return;
  markPassed(run, sql);
  run.step++;
  saveLive();
  syncHash(run);
  d$.actions.rerender();
  d$.openEditor(false);
  d$.showPane('ticket'); // like a promotion review's next step: the new step's words first (phone)
  window.setTimeout(() => document.getElementById('brief-step')?.scrollIntoView({ block: 'nearest' }), 150);
}

function goTo(run: InterviewRun, index: number): void {
  run.index = index;
  saveLive();
  syncHash(run);
  d$.actions.rerender();
  d$.openEditor(true);
  document.getElementById('brief-title')?.focus();
}

function finishSet(run: InterviewRun): void {
  run.phase = 'done';
  run.ms = d$.prefs.elapsed(run, Date.now());
  const p = read();
  p.sets[run.id] = { at: d$.today(), solved: run.solved.length, total: run.tickets.length, ms: run.ms, timer: run.timer };
  write(withLive(p, run));
  d$.actions.rerender();
  d$.showPane('ticket'); // phone: the summary replaces the editor
  d$.announce(it('iv.finished', { solved: run.solved.length, total: run.tickets.length }));
  document.getElementById('brief-title')?.focus();
}

/** A take-home handed in: the steps passed, the text and the rubric lines ticked (the v16 portfolio reads them: passedTakeHomes). */
function recordTakeHome(run: InterviewRun, th: TakeHome): void {
  const p = read();
  p.takeHomes[run.id] = { at: d$.today(), steps: run.solved.length, total: th.steps.length, text: run.text, checks: run.checks, rubric: th.rubric.length };
  write(withLive(p, run));
}

// ---- the clock: one text node updated every second, never a rerender() ----
let ticker: number | undefined;
/** Runs (by set id) whose "time's up" was already announced: once per run (a fresh start clears it). */
const toldUp = new Set<string>();

/**
 * FIX-1 (L147): the player left the room (`here` false: another page or mode, a hidden or closed tab) or came back. The run's
 * clock stops while away; the pause is stored, so a closed tab reopened tomorrow resumes where it stood.
 */
export function presence(here: boolean): void {
  const run = runNow();
  if (!run || run.phase !== 'work' || !d$.prefs.setPresence(run, here, Date.now())) return;
  saveLive();
  if (here) tick();
}
function tick(): void {
  const run = runNow();
  const el = document.getElementById('iv-clock');
  if (!run || !run.timer || run.phase !== 'work' || !el) {
    window.clearInterval(ticker);
    ticker = undefined;
    return;
  }
  const left = run.minutes * 60_000 - d$.prefs.elapsed(run, Date.now());
  el.textContent = left > 0 ? it('iv.clock', { time: clock(left) }) : it('iv.timeUp');
  el.classList.toggle('font-bold', left <= 0);
  if (left <= 0 && run.away === undefined && !toldUp.has(run.id)) {
    toldUp.add(run.id); // by run id: a resume moves `start`, which would announce it again
    d$.announce(it('iv.timeUpSay'));
  }
}

// ---- left pane ----

/** Left pane of the workspace in interview mode (renderLeft, src/ui/modes.ts). */
export function pane(host: HTMLElement, run: InterviewRun): void {
  host.replaceChildren(run.kind === 'set' ? setPane(run) : thPane(run));
  if (run.timer && run.phase === 'work' && run.kind === 'set') {
    tick();
    ticker ??= window.setInterval(tick, 1000);
  }
}

function hintBox(run: InterviewRun, text: string): HTMLElement | null {
  const { h } = d$;
  if (run.timer) return h('p', { class: 'text-body-sm text-muted' }, it('iv.noHint'));
  const id = d$.ivItemId(run);
  if (!run.hints.includes(id)) {
    return h('div', { class: 'actions' }, h('button', {
      type: 'button',
      onclick: () => {
        run.hints.push(id);
        saveLive();
        d$.actions.rerender();
        document.getElementById('iv-hint')?.focus();
      },
    }, it('iv.hint')));
  }
  return h('section', { id: 'iv-hint', tabindex: '-1', class: 'my-3 rounded-(--r-card) rounded-tl-sm bg-sun px-4 py-2 text-sun-ink [&_p]:my-1', 'aria-label': it('iv.hintTitle') },
    h('p', { class: 'text-body-sm font-semibold' }, it('iv.hintTitle')), d$.richText(text));
}

function setPane(run: InterviewRun): HTMLElement {
  const { h, nodes } = d$;
  const lang = d$.getLang();
  const set = setOf(run.id)!;
  if (run.phase !== 'work') return setSummary(run, set);
  const q = set.questions[run.index];
  const n = set.questions.length;
  const right = run.solved.includes(q.id);
  const all = run.solved.length === n;
  const nav = h('nav', { 'aria-label': it('iv.nav'), class: 'my-3 flex flex-wrap gap-2' }, ...set.questions.map((x, i) => {
    const ok = run.solved.includes(x.id);
    return h('button', {
      type: 'button', class: i === run.index ? 'min-w-11 rounded-full px-3 ring-2 ring-accent' : 'min-w-11 rounded-full px-3',
      'aria-current': i === run.index ? 'step' : false, 'aria-label': ok ? it('iv.qDone', { i: i + 1 }) : it('iv.qBtn', { i: i + 1 }),
      onclick: () => { if (i !== run.index) goTo(run, i); },
    }, String(i + 1), ok ? h('span', { class: 'font-bold text-good', 'aria-hidden': 'true' }, ' ✓') : null);
  }));
  return h('div', {}, ...nodes(
    h('header', {},
      h('h2', TITLE, set.title[lang]),
      h('p', { class: 'mt-1 mb-0 text-body-sm text-muted' }, `${it(`iv.level.${set.level}`)} · ${it('iv.question', { i: run.index + 1, n })}`)),
    run.timer
      ? h('p', { id: 'iv-clock', role: 'timer', class: 'mt-2 mb-0 inline-block rounded-full bg-accent-soft px-3 py-1 text-body-sm tabular-nums' })
      : h('p', { class: 'mt-2 mb-0 text-body-sm text-muted' }, it('iv.practiceMode')),
    nav,
    h('div', { class: 'text-[15px] leading-relaxed' }, d$.richText(q.task[lang])),
    h('p', { class: 'text-body-sm text-muted' }, it('iv.data')),
    right ? h('p', { class: 'good font-semibold', role: 'status' }, it('iv.solved')) : null,
    hintBox(run, q.hint[lang]),
    h('div', { class: 'actions' },
      run.index > 0 ? h('button', { type: 'button', onclick: () => goTo(run, run.index - 1) }, it('iv.prev')) : null,
      run.index < n - 1 ? h('button', { type: 'button', class: right ? 'primary' : '', onclick: () => goTo(run, run.index + 1) }, it('iv.next')) : null,
      h('button', { type: 'button', class: all ? 'primary' : '', onclick: () => finishSet(run) }, it('iv.finish')),
      h('button', { type: 'button', onclick: () => d$.leave() }, it('iv.exit'))),
  ));
}

function setSummary(run: InterviewRun, set: InterviewSet): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const ms = run.ms ?? d$.prefs.elapsed(run, Date.now());
  return h('div', {},
    h('h2', TITLE, it('iv.result', { solved: run.solved.length, total: set.questions.length })),
    h('p', { class: 'mt-1 text-body-sm text-muted' }, set.title[lang]),
    h('p', { class: 'mb-1' }, run.timer ? it('iv.timeOn', { time: clock(ms), min: set.minutes }) : it('iv.timeOff', { time: clock(ms) })),
    h('p', { class: 'mt-0 text-body-sm text-muted' }, it('iv.saved')),
    h('ol', { class: 'my-3 space-y-2 pl-5' }, ...set.questions.map((q, i) => {
      const ok = run.solved.includes(q.id);
      return h('li', {},
        h('details', {},
          h('summary', { class: 'cursor-pointer' }, `${it('iv.qBtn', { i: i + 1 })}: `, h('span', { class: ok ? 'font-semibold text-good' : 'font-semibold text-muted' }, ok ? it('iv.right') : it('iv.notYet'))),
          h('div', { class: 'mt-1 text-body-sm' }, d$.richText(q.task[lang])),
          ok && run.passed[q.id] ? h('div', {}, h('p', { class: 'mb-1 text-body-sm text-muted' }, it('iv.yourSql')), h('pre', { class: 'sql' }, run.passed[q.id])) : null));
    })),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'primary', onclick: () => start(run.id, run.timer, true) }, it('iv.again')),
      h('button', { type: 'button', onclick: () => d$.leave() }, it('iv.toRoom'))));
}

/** v47: a domain case or ask leaves to its Overview and reads its own data line; the room's take-homes keep their words. */
const exitKey = (th: TakeHome): IvKey => (th.domain ? 'cs.exit' : 'iv.exit');
const backKey = (th: TakeHome): IvKey => (th.domain ? 'cs.back' : 'iv.toRoom');
/** v47 D2 (L931): the last option picked per ask, this page load only (a right pick is kept in the run, see pickMark). */
const picks = new Map<string, number>();
// ponytail: the right pick rides in run.hints (persisted with the run, ITEM_ID-shaped), so no new pref field.
const pickMark = (run: InterviewRun): string => `${run.id}-pick`;

function thPane(run: InterviewRun): HTMLElement {
  const { h, nodes } = d$;
  const lang = d$.getLang();
  const th = thOf(run.id)!;
  const head = h('h2', TITLE, th.title[lang]);
  if (run.phase === 'write') return writePane(run, th, head);
  if (run.phase === 'done') return rubricPane(run, th, head);
  const brief = h('section', { class: 'my-3 rounded-(--r-ctl) bg-accent-soft p-3', 'aria-labelledby': 'iv-brief' },
    h('h3', { id: 'iv-brief', class: 'mt-0 mb-1 text-body font-bold' }, it('iv.brief')), d$.richText(th.brief[lang]));
  const c = th.clarify;
  if (c && !run.hints.includes(pickMark(run))) return clarifyPane(run, th, head, brief);
  const s = th.steps[run.step];
  return h('div', {}, ...nodes(
    h('header', {}, head, h('p', { class: 'mt-1 mb-0 text-body-sm text-muted' }, it('iv.step', { i: run.step + 1, n: th.steps.length, title: s.title[lang] }))),
    brief,
    c ? h('section', { class: 'my-3 rounded-(--r-ctl) bg-good-soft p-3 [&_p]:my-1', 'aria-label': it('cs.understood') },
      h('p', { class: 'font-semibold' }, `${it('cs.understood')}: ${c.options[c.answer][lang]}`), d$.richText(c.options[c.answer].why[lang])) : null,
    h('ol', { class: 'my-2 space-y-1 pl-5 text-body-sm', 'aria-label': it('iv.steps') }, ...th.steps.map((x, i) => h('li', {
      class: i === run.step ? 'font-bold' : 'text-muted', 'aria-current': i === run.step ? 'step' : false,
    }, x.title[lang], run.solved.includes(x.id) ? h('span', { class: 'text-good' }, ' ✓') : null))),
    h('h3', { id: 'brief-step', tabindex: '-1', class: 'mb-1 text-body font-bold' }, s.title[lang]),
    h('div', { class: 'text-[15px] leading-relaxed' }, d$.richText(s.task[lang])),
    h('p', { class: 'text-body-sm text-muted' }, it(th.domain ? 'cs.data' : 'iv.data')),
    hintBox(run, s.hint[lang]),
    h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => d$.leave() }, it(exitKey(th)))),
  ));
}

/** v47 D2 (L931): the vague request, then one clarifying choice; each pick shows why, a right pick opens the step. */
function clarifyPane(run: InterviewRun, th: TakeHome, head: HTMLElement, brief: HTMLElement): HTMLElement {
  const { h, nodes } = d$;
  const lang = d$.getLang();
  const c = th.clarify!;
  const picked = picks.get(run.id);
  const pick = (i: number): void => {
    picks.set(run.id, i);
    if (i === c.answer) {
      run.hints.push(pickMark(run));
      saveLive();
    }
    d$.actions.rerender();
    document.getElementById(i === c.answer ? 'brief-step' : 'cs-why')?.focus();
  };
  return h('div', {}, ...nodes(
    h('header', {}, head),
    brief,
    h('section', { class: 'my-3', 'aria-labelledby': 'cs-clarify' },
      h('h3', { id: 'cs-clarify', class: 'mt-0 mb-1 text-body font-bold' }, it('cs.clarify')),
      h('p', { class: 'mt-0 text-body-sm text-muted' }, it('cs.clarifyHelp')),
      h('p', { class: 'font-semibold' }, c.q[lang]),
      h('div', { class: 'flex flex-col items-stretch gap-2' }, ...c.options.map((o, i) => h('button', {
        type: 'button', class: 'min-h-11 text-left', 'aria-pressed': picked === i ? 'true' : 'false', onclick: () => pick(i),
      }, o[lang])))),
    picked !== undefined && picked !== c.answer
      ? h('div', { id: 'cs-why', tabindex: '-1', role: 'status', class: 'my-3 rounded-(--r-ctl) bg-warn-soft p-3 [&_p]:my-1' },
        h('p', { class: 'font-semibold' }, it('cs.notThis')), d$.richText(c.options[picked].why[lang]))
      : null,
    h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => d$.leave() }, it(exitKey(th)))),
  ));
}

const wordsIn = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

function writePane(run: InterviewRun, th: TakeHome, head: HTMLElement): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const count = h('p', { class: 'mt-1 mb-0 text-body-sm text-muted tabular-nums' }, it('iv.words', { n: wordsIn(run.text) }));
  const msg = h('p', { role: 'status', class: 'bad min-h-6' });
  const area = h('textarea', {
    id: 'iv-text', rows: '7', maxlength: String(d$.prefs.textMax), 'aria-describedby': 'iv-write-help',
    class: 'block w-full rounded-(--r-ctl) bg-panel p-3 text-body ring-1 ring-line', oninput: (e: Event) => {
      run.text = (e.target as HTMLTextAreaElement).value;
      count.textContent = it('iv.words', { n: wordsIn(run.text) });
      msg.textContent = '';
      saveLive();
    },
  });
  area.value = run.text;
  return h('div', {},
    head,
    h('p', { class: 'good mt-1 font-semibold' }, it('iv.thDone')),
    h('div', { class: 'my-3 rounded-(--r-ctl) bg-accent-soft p-3' }, d$.richText(th.conclusion[lang])),
    h('label', { for: 'iv-text', class: 'mb-1 block font-bold' }, it('iv.write')),
    h('p', { id: 'iv-write-help', class: 'mt-0 mb-2 text-body-sm text-muted' }, it('iv.writeHelp')),
    area, count, msg,
    h('div', { class: 'actions' },
      h('button', {
        type: 'button', class: 'primary', onclick: () => {
          if (!run.text.trim()) return void (msg.textContent = it('iv.empty'));
          run.phase = 'done';
          recordTakeHome(run, th);
          d$.actions.rerender();
          document.getElementById('brief-title')?.focus();
        },
      }, it('iv.toRubric')),
      h('button', { type: 'button', onclick: () => d$.leave() }, it(exitKey(th)))));
}

function rubricPane(run: InterviewRun, th: TakeHome, head: HTMLElement): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const score = h('p', { role: 'status', class: 'font-semibold' }, it('iv.rubricScore', { k: run.checks.length, m: th.rubric.length }));
  return h('div', {},
    head,
    h('h3', { class: 'mb-1 text-body font-bold' }, it('iv.yourText')),
    h('blockquote', { class: 'm-0 rounded-(--r-ctl) bg-code p-3 whitespace-pre-wrap' }, run.text),
    h('p', { class: 'mt-1 text-body-sm text-muted' }, it('iv.private')),
    h('fieldset', { class: 'my-3 space-y-2 rounded-(--r-ctl) p-3 ring-1 ring-line' },
      h('legend', { class: 'px-1 font-bold' }, it('iv.rubric')),
      h('p', { class: 'mt-0 text-body-sm text-muted' }, it('iv.rubricNote')),
      ...th.rubric.map((r, i) => h('label', { class: 'flex min-h-6 items-start gap-2' },
        h('input', {
          type: 'checkbox', class: 'mt-1 size-4 shrink-0', checked: run.checks.includes(i), onchange: (e: Event) => {
            const on = (e.target as HTMLInputElement).checked;
            run.checks = on ? [...new Set([...run.checks, i])].sort((a, b) => a - b) : run.checks.filter((x) => x !== i);
            score.textContent = it('iv.rubricScore', { k: run.checks.length, m: th.rubric.length });
            recordTakeHome(run, th);
          },
        }),
        h('span', {}, r[lang])))),
    score,
    h('details', { class: 'my-2' },
      h('summary', { class: 'cursor-pointer' }, it('iv.yourSql')),
      ...th.steps.map((s) => h('div', {}, h('p', { class: 'mb-1 text-body-sm font-semibold' }, s.title[lang]), run.passed[s.id] ? h('pre', { class: 'sql' }, run.passed[s.id]) : null))),
    h('div', { class: 'actions' },
      h('button', {
        type: 'button', onclick: () => {
          run.phase = 'write';
          saveLive();
          d$.actions.rerender();
          document.getElementById('iv-text')?.focus();
        },
      }, it('iv.edit')),
      h('button', { type: 'button', class: 'primary', onclick: () => d$.leave() }, it(backKey(th)))));
}

// ---- #/learn/interview ----

/** The interview room page: drawn from content and the pref only (no DB wait). */
export function listPage(): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const p = read();
  const ids = d$.SKILLS.map((s) => s.id);
  const known = d$.knownSkills(d$.app.save, d$.loadTickets('logistics'), ids); // General pages follow Logistics (Plan 9 D9-12)
  const resumable = (id: string): boolean => !!p.live[id] && p.live[id].phase !== 'done';
  // v21 U24 (v7 T1): one main button on the page: the run in progress, else the first set whose skills are all learned, else the first set.
  const ready = (modules: number[]): boolean => d$.SKILLS.filter((s) => modules.includes(s.chapter)).every((s) => known.has(s.id));
  const takeHomes = c$.takeHomes.filter((x) => !x.domain); // v47 (L82): domain cases live on their Overview, never here
  const all = [...c$.sets, ...takeHomes];
  const main = (all.find((x) => resumable(x.id)) ?? c$.sets.find((x) => ready(x.modules)) ?? c$.sets[0])?.id;
  const actions = (id: string): HTMLElement => h('div', { class: 'actions mb-0 shrink-0' }, ...(resumable(id)
    ? [h('button', { type: 'button', class: id === main ? 'primary' : '', onclick: () => void d$.startRun(id, false, false) }, it('iv.resume')),
      h('button', { type: 'button', onclick: () => void d$.startRun(id, timerPick, true) }, it('iv.restart'))]
    : [h('button', { type: 'button', class: id === main ? 'primary' : '', onclick: () => void d$.startRun(id, timerPick, true) },
      timerPick && setOf(id) ? it('iv.startTimed', { min: setOf(id)!.minutes }) : it('iv.start'))]));
  const knownLine = (modules: number[]): string => {
    const skills = d$.SKILLS.filter((s) => modules.includes(s.chapter));
    return it('iv.known', { k: skills.filter((s) => known.has(s.id)).length, m: skills.length });
  };
  const pick = h('input', {
    id: 'iv-timer', type: 'checkbox', class: 'size-4', checked: timerPick,
    onchange: (e: Event) => {
      timerPick = (e.target as HTMLInputElement).checked;
      d$.actions.rerender();
      document.getElementById('iv-timer')?.focus();
    },
  });
  return h('div', { class: 'flex flex-col gap-6' },
    // v21 U18: the breadcrumb and the h1 "Phòng phỏng vấn" are drawn above by homeView; v47 S4 (L982): the room's tabs, SQL open
    ivTabs(h, 'sql', d$.interviewTabHash, d$.getLang()),
    h('p', { class: 'm-0 text-[15px]' }, it('iv.intro')),
    h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': 'iv-sets' },
      h('h2', { id: 'iv-sets', class: 'm-0 text-title font-bold' }, it('iv.sets')),
      h('p', { class: 'm-0 text-body-sm text-muted' }, it('iv.setsIntro')),
      h('label', { class: 'flex min-h-6 items-center gap-2' }, pick, it('iv.timerPick')),
      h('ul', { class: 'm-0 flex list-none flex-col gap-3 p-0' }, ...c$.sets.map((s, i) => {
        const last = p.sets[s.id];
        return h('li', { class: ROW }, disc(i, !!last), h('div', { class: 'flex min-w-0 flex-1 flex-col gap-1' },
          h('h3', { class: 'm-0 text-body font-bold' }, s.title[lang]),
          h('p', { class: 'm-0 text-body-sm text-muted' }, `${it(`iv.level.${s.level}`)} · ${it('iv.setLine', { ...range(s.modules), n: s.questions.length, min: s.minutes })}`),
          h('p', { class: 'm-0 text-body-sm' }, knownLine(s.modules)),
          last ? h('p', { class: 'm-0 text-body-sm' }, it('iv.lastSet', { day: last.at, solved: last.solved, total: last.total, time: clock(last.ms) })) : null),
          actions(s.id));
      }))),
    h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': 'iv-th' },
      h('h2', { id: 'iv-th', class: 'm-0 text-title font-bold' }, it('iv.takeHomes')),
      h('p', { class: 'm-0 text-body-sm text-muted' }, it('iv.thIntro')),
      h('ul', { class: 'm-0 flex list-none flex-col gap-3 p-0' }, ...takeHomes.map((x, i) => {
        const last = p.takeHomes[x.id];
        return h('li', { class: ROW }, disc(i, !!last), h('div', { class: 'flex min-w-0 flex-1 flex-col gap-1' },
          h('h3', { class: 'm-0 text-body font-bold' }, x.title[lang]),
          h('p', { class: 'm-0 text-body-sm text-muted' }, `${it('iv.thLine', { ...range(x.modules), n: x.steps.length })}`),
          h('p', { class: 'm-0 text-body-sm' }, knownLine(x.modules)),
          last ? h('p', { class: 'm-0 text-body-sm' }, it('iv.lastTh', { day: last.at, k: last.checks.length, m: last.rubric })) : null),
          actions(x.id));
      }))));
}

/** "Opening…" line while the chunk or lab loads (also used by modes.ts before this chunk is in: it passes its own text). */
export const loadingText = (): string => it('iv.loading');
