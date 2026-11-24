import { cue } from './sound';
import type { SQLNamespace } from '@codemirror/lang-sql';
import type { DbClient } from '../db/client';
import { SqlError, sqlErrorInfo } from '../db/run';
import { notePass, noteTry } from '../insights';
import type { QueryResult } from '../db/run';
import { compareResults, grade, type GradeResult } from '../grader';
import { loadHistory, pushHistory, writeHistory } from '../history';
import { checkLab, checkPlan, isCreateIndex, planLine, slowVerdict, type LabSpec, type PlanFail, type SlowVerdict } from '../planCheck';
import { getLang, isMac, t, type Key } from '../i18n';
import { LANE_XP } from '../lanes';
import { SKILLS, xpFor } from '../progress';
import { isClosed, keepsWork, readDraft, schemaOf, session, workKey, writeDraft } from '../session';
import { app, done, editorSchema, initialDoc, persist, stepKey, type LastRun } from '../state';
import { localStore } from '../storage';
import { BTN_SECONDARY, BTN_SUBMIT, cx } from '../theme';
import { blanksIn, fillAction, firstBlank, type Ticket } from '../tickets';
import { DRILL_ID, INTERVIEW_ID } from '../save';
import { diffView, hasDiff, verdictText } from './tryPreview';
import { celebrate, react } from './celebrate';
import { announce, h, kbd, richText } from './dom';
import { createEditor, type Editor } from './editor';
import { avatar } from './avatar';
import { errorNote, errorText, errorView, extraRowsOffer, extraRowsView, gradeMessage, mascotOf, runSummary, voiceKey } from './feedback';
import { markArrived } from './resultTable';
import { mascot, type Mascot, type Pose } from './mascots';
import { showPane } from './paneTabs';
import { pageShortcutOf } from './shortcuts';
import { wordsLine } from './sqlWordsView';
import { boonRegion, guideHooks, guideSlot, refreshGuides, tourSlot } from './coach';
import type { Panel } from './tabs';

export interface WorkDeps {
  db: DbClient;
  panel: Panel;
  /** Normal ticket solved; `sql` = the SQL that was graded (not the editor's text by the time the result arrives). */
  onSolved(t: Ticket, sql: string): void;
  /** A boss step other than the last one solved (`sql` as above). */
  onStepSolved(sql: string): void;
  /** Last boss step solved: the conclusion opens. */
  onConclusion(t: Ticket): void;
  /** After every Run/Submit (the brief redraws its shape card). */
  onRun(): void;
  /** Every wrong submit (Practice counts them for the Leitner result). */
  onWrong?(): void;
}

export interface WorkArea {
  /** Recreates the editor only when ticketId#step changes (or `force`, after importing a save); otherwise keeps cursor, selection and undo. */
  /** `undefined` = Sandbox: no Submit, no history; Run, EXPLAIN, error underline and the tabs work as usual. */
  setTicket(t: Ticket | undefined, stepIndex: number, force?: boolean): void;
  /** Language switch: labels and the last message only, never the editor. */
  relabel(): void;
  setSchema(ns: SQLNamespace): void;
  /** Replaces the editor text, undoable ("Use this example" on a worked ticket). */
  setDoc(sql: string): void;
  /**
   * v13 §3.1/§3.5: puts the hint scaffold (`faded`: the starter again) in the editor, its first ___ selected, and says so with an
   * Undo button. 'ask' = the editor holds the player's own SQL and `force` is not set: the caller asks first. Only 'done' changed anything.
   */
  fill(sql: string, faded: boolean, force: boolean): 'done' | 'ask' | undefined;
  /** Exactly what Ctrl+Enter would run now (selection or whole editor), to compare with app.lastRun.sql. */
  currentSql(): string;
  focus(): void;
}

/** After a run, these tabs say nothing about the result, so the Result tab opens instead. */
const SCHEMA_TABS = new Set(['erd', 'columns']);

/** Chapter 11: why the plan was not accepted. `lab` = after the player's index (index lab), else the prebuilt indexes. */
export function planFailText(f: PlanFail, lab: boolean): string {
  if (f.reason === 'cost') return t('lab.cost', { table: f.table, pct: Math.round(f.ratio * 100) });
  return t(lab ? (f.reason === 'seqScan' ? 'lab.seqScan' : 'lab.noIndex') : (f.reason === 'seqScan' ? 'plan.seqScan' : 'plan.noIndex'), { table: f.table });
}

const FEEDBACK: Record<'good' | 'bad', string> = {
  good: 'mt-2 rounded-(--r-ctl) bg-good-soft px-3 py-1.5 text-body-sm font-semibold text-ink ring-1 ring-good-line',
  bad: 'mt-2 rounded-(--r-ctl) bg-bad-soft p-3 text-body-sm text-ink ring-1 ring-bad-line',
};

/**
 * After a wrong result (curriculum §5.4): the author's explanation when the result equals one of the ticket's `wrong:` SQL,
 * else the trap of the skill the ticket teaches (a drill teaches none: no tip). A wrong column count says nothing about which mistake it was (no tip), and an
 * empty result looks like every mistake that filters too much, so it is never matched against `wrong:` (tests/content.test.ts:
 * a `wrong:` SQL always returns rows). Each `wrong:` SQL runs once per ticket+variant (its text has the variant applied).
 */
export type Seen = { run?: object; stale: boolean };
/** v21 E2 (pure): after an edit to `v`, must the panel be redrawn (the editor started or stopped differing from `run`)? */
export function staleFlip(seen: Seen, run: { sql: string } | undefined, v: string): [boolean, Seen] {
  const stale = !!run && v.trim() !== run.sql.trim();
  return [stale !== (seen.run === run ? seen.stale : false), { run, stale }];
}

export function wrongTipper(run: (sql: string, tk: Ticket) => Promise<QueryResult>) {
  const results = new Map<string, Promise<QueryResult | null>>();
  const resultOf = (tk: Ticket, sql: string): Promise<QueryResult | null> => {
    const k = `${tk.id}#${sql}`;
    let p = results.get(k);
    if (!p) results.set(k, p = run(sql, tk).catch(() => { results.delete(k); return null; })); // failure (restart, DB down) is not cached: the next wrong Submit retries
    return p;
  };
  return async (tk: Ticket, result: QueryResult | undefined, fail: GradeResult): Promise<(() => string) | undefined> => {
    if (fail.ok || fail.reason === 'columns') return undefined;
    if (result?.rows.length) {
      for (const w of tk.wrong ?? []) {
        const r = await resultOf(tk, w.sql);
        if (r && compareResults(r, result, tk.ordered).ok) return () => w.why[getLang()];
      }
    }
    // A drill (chapter 0) grants nothing, so no fallback: the skill's general trap was rarely its mistake, and the drill's
    // own feedback already names the columns and rows that differ (L84, L93).
    const skill = SKILLS.find((s) => tk.grants.includes(s.id));
    return skill && (() => t('work.trap', { trap: skill.trap[getLang()] }));
  };
}

export function mountWork(host: HTMLElement, deps: WorkDeps): WorkArea {
  let ticket: Ticket | undefined;
  let stepIndex = 0;
  let key = '';
  let editor: Editor | undefined;
  let busy = false;
  let selection = false;
  /** Last message under the editor, as a function so relabel() re-translates it. */
  let message: { kind: 'good' | 'bad'; view: () => Node | string; who?: [Mascot, Pose]; detail?: () => Node | null } | undefined;
  let history = loadHistory(localStore());
  /** The message under the buttons is the scaffold note with its Undo button (v13 §3.1). */
  let fillNote = false;

  const editorHost = h('div', { lang: 'en', class: 'editor overflow-hidden rounded-(--r-ctl) ring-1 ring-line' });
  // ui-ux-v7 W1/M1: Run is the second level, Submit the main button (right); 44 px targets on phones.
  const runBtn = h('button', { type: 'button', class: cx(BTN_SECONDARY, 'px-4 max-md:min-h-11'), onclick: () => void run() });
  // EXPLAIN always describes what was just run: run the editor SQL, and open the tab only if that run succeeded for this editor.
  // Format and EXPLAIN show inline when the pane is ≥ 640 px wide, else in the "⋯ Tools" menu (a container query on the row).
  const tool = (onclick: () => void, menu: boolean) => h('button', {
    type: 'button',
    class: menu ? 'w-full rounded-(--r-inset) border-0 bg-transparent px-3 py-2 text-left whitespace-nowrap hover:bg-code' : '@max-[640px]:hidden',
    onclick: () => {
      if (menu) tools.open = false;
      onclick();
    },
  });
  const explainBtn = tool(() => void run('explain'), false);
  const formatBtn = tool(() => void format(), false);
  const explainItem = tool(() => void run('explain'), true);
  const formatItem = tool(() => void format(), true);
  const toolsLabel = h('span');
  const tools = h('details', { class: 'relative @min-[640px]:hidden' },
    h('summary', { class: 'flex min-h-6 cursor-pointer list-none items-center gap-1 rounded-full border border-line bg-panel px-3 py-1.5 font-semibold hover:bg-code max-md:min-h-11 [&::-webkit-details-marker]:hidden' }, h('span', { 'aria-hidden': 'true' }, '⋯'), toolsLabel),
    h('div', { class: 'absolute bottom-full left-0 z-20 mb-1 flex min-w-40 flex-col rounded-(--r-ctl) bg-panel p-1 shadow-(--shadow-2) ring-1 ring-line' }, explainItem, formatItem));
  const submitBtn = h('button', { type: 'button', class: cx(BTN_SUBMIT, 'max-md:min-h-11'), onclick: () => void submit() });
  /** M1: after a Run/Submit on a phone, one chip says what came back and opens the Result pane (never switched to by itself). */
  const resultChip = h('button', { type: 'button', class: 'mb-1 block min-h-11 w-full rounded-(--r-chip) md:hidden border border-line bg-surface-2 px-3 text-body-sm font-semibold text-ink', hidden: true, onclick: () => showPane('panel') });
  const chip = (r?: LastRun): void => {
    resultChip.hidden = !r;
    resultChip.textContent = !r ? '' : r.result ? `${t('work.resultChip', { n: r.result.rows.length })} →` : `${t('work.errorChip')} →`;
  };
  const feedback = h('div', { role: 'status' });
  /** A drill's wrong answer (L84): the rows that differ, outside the status line so a screen reader reads one sentence. */
  const detailBox = h('div');
  guideHooks.diff = () => !!message?.detail && !!ticket && DRILL_ID.test(ticket.id); // v13 G6: the diff of a wrong drill submit (not a story's extra rows) is showing
  /** L151: wrong submits per step this session (the extra rows open from the second), and steps that already had a row-count miss (A7). */
  const wrongs = new Map<string, number>();
  const rowsMissed = new Set<string>();
  /** The extra-rows <details> stays open across a redraw (rerender → relabel) until the next message. */
  let extraOpen = false;
  const historyBox = h('details', { class: 'mt-2 text-body-sm' });
  /** V19-A (L162): the last run read in words, under the buttons; redrawn with relabel() and on every edit (its "changed" mark). */
  const words = wordsLine(() => editor?.runTarget().sql ?? '', deps.db, () => !!ticket?.steps[stepIndex]?.lab);
  void import('./bpTip').then((m) => m.mountBp(detailBox, deps, () => [ticket, stepIndex], { h, richText, announce, getLang, app, store: localStore, keeps: keepsWork, region: boonRegion })).catch(() => undefined); // BP-LINT (L273): Boon's best-practice tip, lazy chunk
  // The tour's mark sits under the buttons, never over the editor (v4 §B.2); main.ts refreshTour() refills it.
  host.replaceChildren(editorHost, h('div', { class: '@container max-md:sticky max-md:bottom-14 max-md:z-10 max-md:bg-panel max-md:pt-2 max-md:shadow-[0_-8px_12px_-10px_rgb(0_0_0/0.3)]' }, resultChip, h('div', { class: 'actions' }, runBtn, explainBtn, formatBtn, tools, submitBtn)), words.el, tourSlot('work'), guideSlot('work'), feedback, detailBox, guideSlot('diff'), historyBox);

  // The buttons advertise Mod+Enter / Mod+Shift+Enter: honour them when focus is outside the editor too
  // (on a button after a click, the brief heading after picking a ticket). Inside the editor CodeMirror's
  // keymap handles them first and calls preventDefault, so they never fire twice.
  document.addEventListener('keydown', (e) => {
    const action = pageShortcutOf(e, isMac, {
      workspaceHidden: !!host.closest('[hidden]'), // Home route
      conclusionOpen: !!ticket && app.conclusionFor === ticket.id,
    });
    if (!action) return;
    e.preventDefault();
    void (action === 'run' ? run() : submit());
  });

  /** `who`: a mascot beside the words (V7), at most one, in this line under the buttons only. */
  function say(kind: 'good' | 'bad', view: () => Node | string, who?: [Mascot, Pose], detail?: () => Node | null): void {
    message = { kind, view, who, detail };
    extraOpen = false;
    fillNote = false;
    drawMessage();
    refreshGuides(); // v13 G6: a drill's diff may call Boon's guide
    // ui-ux-v5 A2: the mascot reacts once, after the event's synchronous rerender() (solved → complete(), fill → brief) redrew the line.
    if (who) queueMicrotask(() => react(feedback));
    queueMicrotask(reveal);
    setTimeout(reveal, 400); // again once the lines above it (the query summary, Lily's line) have settled
  }
  /**
   * v21 E2: the tabs describe app.lastRun; when an edit makes the editor differ from it (or match it again), the open tab is redrawn
   * once, so its "SQL changed" strip and Pin's "Run again before pinning" show while typing, not only after the next run.
   * A new run redraws the panel with the editor matching it, so `seen` starts over (not stale) for each run.
   */
  let seen: Seen = { stale: false };
  function staleCheck(v: string): void {
    const [redraw, next] = staleFlip(seen, app.lastRun, v);
    seen = next;
    if (redraw) deps.panel.refresh();
  }
  /**
   * v21 U10: the SQL pane scrolls (never the page) just enough to show the new feedback, its top kept in view. Only where the pane
   * is its own scroll box (the one-screen shell); a phone page is left where it is.
   */
  function reveal(): void {
    const pane = feedback.closest?.<HTMLElement>('#work');
    if (!pane || pane.scrollHeight <= pane.clientHeight || !feedback.firstChild) return;
    const f = feedback.getBoundingClientRect();
    const p = pane.getBoundingClientRect();
    if (f.bottom > p.bottom) pane.scrollTop += Math.min(f.bottom - p.bottom + 8, f.top - p.top - 8);
  }
  function drawMessage(): void {
    feedback.className = message ? FEEDBACK[message.kind] : '';
    detailBox.replaceChildren(message?.detail?.() ?? '');
    const who = boonRegion() === 'work' ? undefined : message?.who; // Boon's tour or guide mark is already in this pane
    feedback.replaceChildren(!message ? '' : who
      ? message.kind === 'good' // one compact line: a small cheering Lily beside it (v10 critic #6); a solve reads larger (v10 F3)
        ? h('div', { class: 'flex items-center gap-2' }, mascot(who[0], who[1], who[1] === 'cheer' ? 'size-10 shrink-0' : 'size-8 shrink-0'),
          h('div', { class: cx('min-w-0 flex-1', who[1] === 'cheer' && 'text-title font-bold') }, message.view()))
        : h('div', { class: 'flex items-start gap-3' }, mascot(who[0], who[1], 'size-12'), h('div', { class: 'min-w-0 flex-1' }, message.view()))
      : message.view());
  }

  /** v12.0 U8 (L80 #9), ui-ux-v7 T1: the shortcut chip beside a short label, hidden on touch screens; aria-keyshortcuts keeps it for screen readers. */
  const keys = (k: Key): HTMLElement => kbd(t(k));
  runBtn.setAttribute('aria-keyshortcuts', isMac ? 'Meta+Enter' : 'Control+Enter');
  submitBtn.setAttribute('aria-keyshortcuts', isMac ? 'Meta+Shift+Enter' : 'Control+Shift+Enter');

  function setButtons(): void {
    runBtn.replaceChildren(t(selection ? 'work.runSel' : 'work.run'), keys('work.runKeys'));
    for (const b of [explainBtn, explainItem]) b.textContent = t('tab.explain');
    for (const b of [formatBtn, formatItem]) b.replaceChildren(t('work.format'), b === formatBtn ? keys('work.formatKeys') : '');
    toolsLabel.textContent = t('work.tools');
    submitBtn.replaceChildren(t('work.submit'), keys('work.submitKeys'));
    // Plan 8b 8.7: a running query says so (spinner stops under reduced motion). Waiting for the DB is said in the line under the buttons (work.queued), never in the label (U8).
    if (busy) runBtn.replaceChildren(h('span', { class: 'mr-1.5 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent align-[-1px]', 'aria-hidden': 'true' }), t('work.running'));
    runBtn.setAttribute('aria-busy', String(busy));
    submitBtn.setAttribute('aria-busy', String(busy));
    runBtn.disabled = busy;
    explainBtn.disabled = busy;
    explainItem.disabled = busy;
    explainBtn.hidden = explainItem.hidden = !!ticket?.steps[stepIndex]?.lab; // a lab editor holds CREATE INDEX: Run already shows both plans
    submitBtn.disabled = busy;
    submitBtn.hidden = !ticket || isClosed(ticket.id);
  }

  function drawHistory(): void {
    const list = ticket && keepsWork() ? history[ticket.id] ?? [] : []; // in Practice it would show the story's passing SQL
    historyBox.hidden = !ticket || !keepsWork(); // v4 §B.3: an empty history says what will appear there
    historyBox.replaceChildren(
      h('summary', { class: 'cursor-pointer text-muted' }, list.length ? t('hist.title', { n: list.length }) : t('hist.empty')),
      h('ul', { class: 'my-1 list-none p-0' }, ...list.map((e) => h('li', {},
        h('button', { type: 'button', class: 'min-h-6 max-lg:min-h-11 w-full border-0 bg-transparent px-1 py-0.5 text-left font-mono text-caption hover:bg-code', onclick: () => { editor?.setValue(e.sql); editor?.focus(); } },
          h('span', { class: e.ok ? 'good' : 'bad' }, e.ok ? '✓' : '✗'),
          ` ${e.sql.replace(/\s+/g, ' ').slice(0, 60)}`,
          e.rows === undefined ? '' : h('span', { class: 'muted' }, ` · ${t('hist.rows', { n: e.rows })}`))))));
  }

  const codeOf = (e: unknown): string | undefined => (e instanceof SqlError ? e.code : undefined);

  /** History belongs to the ticket the query was started for, even if the player has moved on since. */
  function record(ticketId: string | undefined, run: LastRun): void {
    if (!ticketId) return;
    history = pushHistory(history, ticketId, { sql: run.sql, at: Date.now(), ok: run.error === undefined, rows: run.result?.rows.length });
    writeHistory(localStore(), history);
    drawHistory();
  }

  function underline(e: unknown, offset: number): void {
    const info = sqlErrorInfo(e);
    if (info) editor?.showError(info, offset);
  }

  /**
   * Everything is captured at click time. If the editor was replaced while the query ran (other ticket or step,
   * or an imported save), the run is only added to its ticket's history: no lastRun, message, underline or credit.
   * `tab`: the tab to open after a successful run (the EXPLAIN button); a failed or stale run never switches to it.
   */
  async function run(tab?: string): Promise<void> {
    if (busy || !editor) return;
    const ed = editor;
    const tk = ticket;
    const { sql, offset } = ed.runTarget();
    if (!sql.trim()) return say('bad', () => t('work.empty')); // nothing to run: never logged as a ✓ with 0 rows
    const lab = tk?.steps[stepIndex].lab;
    if (lab && tk) return labRun(ed, sql, tk, stepIndex, lab);
    const k = tk ? stepKey(tk.id, stepIndex) : '';
    const historyId = keepsWork() ? tk?.id : undefined; // a practice variant shares the ticket id: keep it out of that history (P5)
    const schema = schemaOf(tk); // a drill runs on lab (Plan 8a); captured at click time like the ticket
    ed.closeCompletion();
    ed.clearError();
    busy = true;
    setButtons();
    if (app.dbStatus === 'loading') say('good', () => t('work.queued')); // DbClient queues the query until the DB is ready
    let r: LastRun;
    try {
      r = { key: k, sql, offset, result: await deps.db.run(sql, { schema }) };
    } catch (e) {
      r = { key: k, sql, offset, error: e };
    } finally {
      busy = false;
      setButtons();
    }
    if (schema !== 'game') r.schema = schema;
    record(historyId, r);
    noteTry(historyId, 'runs', codeOf(r.error)); // v16 I2: device-only statistics (src/insights.ts)
    if (editor !== ed) return;
    app.lastRun = r;
    if (r.result) markArrived(r.result); // L153: its rows fade in once in the Result tab
    announce(runSummary(r, ed.getValue()));
    const failed = r.error !== undefined;
    if (failed) {
      underline(r.error, offset);
      const err = r.error;
      say('bad', () => {
        const note = errorNote(err, sql);
        return note ? h('div', {}, h('p', { class: 'm-0' }, t('work.runFailed')), h('p', { class: 'mt-1 mb-0' }, note)) : t('work.runFailed');
      }, mascotOf(err, sql));
    } else {
      message = undefined;
      drawMessage();
    }
    deps.panel.show(failed || (!tab && SCHEMA_TABS.has(deps.panel.active)) ? 'result' : tab ?? deps.panel.active);
    chip(r); // phone: a chip to the result, never a pane switch (the player may be editing; ui-ux-v7 M1)
    deps.onRun();
  }

  const wrongTip = wrongTipper((sql, tk) => deps.db.run(sql, { schema: schemaOf(tk), check: tk.steps[0]?.check })); // v26 R2: a write drill (one step) compares its read

  /**
   * Index lab (chapter 11): the editor holds one CREATE INDEX; the step's Solution is the slow query. Shows its plan before
   * and after the index (rolled back). Returns the check result (null = passes; only when `grading`), or undefined when
   * nothing was run (not an index, error, stale). Every lab run goes into the ticket's history (the DDL, ok = it ran).
   * A lab run has no result table, so it clears lastRun: the tabs never describe an older run as if it were this one.
   */
  async function labPlans(ed: Editor, ddl: string, tk: Ticket, i: number, lab: LabSpec, grading: boolean): Promise<PlanFail | null | undefined> {
    if (!isCreateIndex(ddl)) {
      say('bad', () => t('lab.notIndex'));
      return undefined;
    }
    const historyId = keepsWork() ? tk.id : undefined;
    busy = true;
    setButtons();
    let plans: Awaited<ReturnType<DbClient['lab']>> | undefined;
    let error: unknown;
    try {
      plans = await deps.db.lab(ddl, tk.steps[i].solution, lab.table);
    } catch (e) {
      error = e;
    } finally {
      busy = false;
      setButtons();
    }
    record(historyId, { key: stepKey(tk.id, i), sql: ddl, offset: 0, error });
    if (editor !== ed) return undefined;
    app.lastRun = undefined;
    deps.panel.refresh(); // rerender() does not redraw the tabs
    deps.onRun();
    if (!plans) {
      underline(error, 0);
      say('bad', () => errorView(error), mascotOf(error));
      return undefined;
    }
    const { before, after } = plans;
    const fail = grading ? checkLab(before, after, lab) ?? null : null;
    const lines = () => h('div', {}, h('p', { class: 'm-0' }, t('lab.before', { plan: planLine(before) })), h('p', { class: 'm-0' }, t('lab.after', { plan: planLine(after) })),
      fail ? h('p', { class: 'mt-2 mb-0' }, planFailText(fail, true)) : null);
    say(fail ? 'bad' : 'good', lines);
    return fail;
  }

  async function labRun(ed: Editor, ddl: string, tk: Ticket, i: number, lab: LabSpec): Promise<void> {
    ed.closeCompletion();
    ed.clearError();
    await labPlans(ed, ddl, tk, i, lab, false);
  }

  async function submit(): Promise<void> {
    if (busy || !editor || !ticket || submitBtn.hidden) return;
    const ed = editor;
    const tk = ticket;
    const i = stepIndex;
    const k = stepKey(tk.id, i);
    const story = keepsWork(); // captured at click time, like the ticket (a lane side task keeps its graded SQL too)
    const schema = schemaOf(tk);
    const sql = ed.getValue(); // Submit always grades the whole editor
    if (!sql.trim()) return say('bad', () => t('work.empty')); // an empty editor is not graded and not a wrong submit (end-user test v10 B1)
    const blanks = blanksIn(sql, tk.format === 'faded'); // every exercise (v13 D-H7); outside faded, LIKE '___' is not a blank
    if (blanks) {
      say('bad', () => t('work.blanks', { n: blanks })); // a starter or frame not filled in yet: not graded, not a wrong submit
      return;
    }
    ed.closeCompletion();
    ed.clearError();
    const lab = tk.steps[i].lab;
    if (lab) {
      const fail = await labPlans(ed, sql, tk, i, lab, true);
      if (fail === undefined || editor !== ed) return;
      if (fail) {
        deps.onWrong?.();
        return;
      }
      return void solved(tk, i, k, sql, story);
    }
    busy = true;
    setButtons();
    // The player's run becomes lastRun, so the tabs and the shape card show what was graded,
    // and a timeout/restart keeps its error class (grade() itself only keeps Postgres errors).
    let played: LastRun | undefined;
    const check = tk.steps[i].check; // v26 R2: a write drill is graded on this read, after the write, in the same transaction
    const playerRun = async (s: string) => {
      try {
        const result = await deps.db.run(s, { schema, check });
        played = { key: k, sql: s, offset: 0, result, ...(schema !== 'game' ? { schema } : {}) };
        return result;
      } catch (e) {
        played = { key: k, sql: s, offset: 0, error: e, ...(schema !== 'game' ? { schema } : {}) };
        throw e;
      }
    };
    let r: GradeResult | undefined;
    let solutionError: unknown;
    let tip: (() => string) | undefined;
    let planFail: PlanFail | undefined;
    let planError: unknown; // the player's EXPLAIN failed: a DB/SQL error, not a content bug
    let slow: SlowVerdict | undefined; // v24 (L340): right but slow; blocks only on a `perf:` step
    let plans: [unknown, unknown] | undefined;
    try {
      r = await grade((s) => (s === sql ? playerRun(s) : deps.db.run(s, { schema, check })), tk.steps[i].solution, sql, tk.ordered, tk.steps[i].precision);
      // Still busy: no newer Run/Submit can start before the tip is ready, so this result can never overwrite a newer one.
      if (!r.ok && r.reason !== 'error') tip = await wrongTip(tk, played?.result, r);
      // Chapter 11: a right result must also read the table through an index. EXPLAIN without ANALYZE: costs, no run.
      const plan = tk.steps[i].plan;
      if (r.ok && plan) {
        try {
          planFail = checkPlan((await deps.db.run(`EXPLAIN (FORMAT JSON) ${sql}`, { schema })).rows[0]?.[0], plan.index);
        } catch (e) {
          planError = e ?? new Error();
        }
      }
      // v24: right but slow. Two planner-only EXPLAINs (Solution, answer) on the same DB; never milliseconds.
      const perf = tk.steps[i].perf;
      if (r.ok && !planFail && planError === undefined && !check) { // a write's cost is not what Part 9 grades
        try {
          const explain = async (s: string) => (await deps.db.run(`EXPLAIN (FORMAT JSON) ${s.trim().replace(/;\s*$/, '')}`, { schema })).rows[0]?.[0];
          plans = [await explain(tk.steps[i].solution), await explain(sql)];
          slow = slowVerdict(plans[0], plans[1], perf);
        } catch (e) {
          if (perf) planError = e ?? new Error(); // outside `perf:` a failed EXPLAIN never blocks a pass
        }
      }
    } catch (e) {
      solutionError = e; // the Solution itself failed
      r = undefined;
    } finally {
      busy = false;
      setButtons();
    }
    if (played) record(story ? tk.id : undefined, played);
    noteTry(story ? tk.id : undefined, 'submits', codeOf(played?.error));
    if (editor !== ed) return; // stale: never credit or message a ticket the player has left
    if (played) app.lastRun = played;
    if (played?.result) markArrived(played.result);
    chip(played);
    deps.onRun();
    if (!r) {
      say('bad', () => t('work.contentBug', { msg: errorText(solutionError) }));
      return;
    }
    if (!r.ok) {
      deps.onWrong?.();
      if (story) cue('bad'); // X2 (L148): never in Practice or reviews; silent unless the player turned sound on
      const fail = r;
      const n = (wrongs.get(k) ?? 0) + 1;
      wrongs.set(k, n);
      const err = played?.error;
      // The sender answers in the chat under the grader's facts (re-translated on a language switch like every message).
      // A drill (Plan 8a) has no sender: no voice line.
      const voice = (): HTMLElement | null => (tk.from.name ? h('p', { class: 'mt-2 mb-0 flex items-start gap-2' },
        avatar(tk.from), h('span', { class: 'rounded-(--r-card) rounded-tl-sm bg-panel px-3 py-1.5 text-ink' }, t(voiceKey(fail)))) : null);
      if (fail.reason === 'error') {
        underline(err, 0);
        say('bad', () => h('div', {}, err !== undefined ? errorView(err, true, sql) : gradeMessage(fail), voice()), mascotOf(err));
      } else {
        if (fail.reason === 'rows' && played?.result) played.mark = fail.sample;
        // A General drill (practice, L84) says which columns differ and shows the rows; story, lane and E-com tickets keep L25.
        // v17: an interview question shows no expected rows (that would be the answer), only the story's facts
        const drill = DRILL_ID.test(tk.id) && !INTERVIEW_ID.test(tk.id);
        // v10 A7 (L87 roles): no row left = Boon explains (a filter or join removes them all); the step's first row-count miss = Lily wonders.
        const empty = fail.reason === 'rows' && fail.actualRows === 0;
        const who: [Mascot, Pose] | undefined = empty ? ['boon', 'think'] : fail.reason === 'rows' && !rowsMissed.has(k) ? ['lily', 'think'] : undefined;
        if (fail.reason === 'rows') rowsMissed.add(k);
        const extras = extraRowsOffer(fail, n, tk);
        const mine = played?.result;
        const detail = drill && hasDiff(fail) ? () => diffView(fail) // detail set = G6's tables show
          : extras && mine && fail.reason === 'rows' ? () => extraRowsView(mine, extras, fail.extra, extraOpen, (o) => { extraOpen = o; })
          : undefined;
        say('bad', () => h('div', {}, drill ? verdictText(fail) : gradeMessage(fail), empty ? h('p', { class: 'mt-2 mb-0' }, t('work.noRows')) : null,
          tip ? h('div', { class: 'mt-2' }, richText(tip())) : null, voice()), who, detail);
      }
      deps.panel.show('result');
      return;
    }
    if (planError !== undefined) {
      const e = planError;
      say('bad', () => errorView(e), mascotOf(e)); // timeout/restart/DB failure: errorText; Postgres error: its message and note
      return;
    }
    if (planFail) {
      deps.onWrong?.();
      const f = planFail;
      say('bad', () => planFailText(f, false));
      deps.panel.show('explain'); // the plan that was refused
      return;
    }
    const v = slow;
    const lines = plans;
    const slowView = (): HTMLElement | null => v && lines ? h('div', { class: 'mt-2' },
      h('p', { class: 'm-0' }, t(v.indexLost ? 'perf.indexLost' : v.block ? 'perf.slow' : 'perf.weak', { cost: v.cost, sol: v.solution, ratio: v.ratio, table: v.indexLost ?? '' })),
      h('p', { class: 'm-0 text-body-sm text-muted' }, t('perf.lines', { mine: planLine(lines[1]), want: planLine(lines[0]) }))) : null;
    if (v?.block) {
      // L324: on a `perf:` step right-but-slow is not passed; not a wrong submit either (the logic is right)
      say('bad', () => slowView() ?? '', ['boon', 'think']);
      deps.panel.show('explain');
      return;
    }
    if (v && session.mode.kind === 'drill') session.mode.framed = true; // weak pass, the same rule as a used scaffold (D-H4)
    deps.panel.show('result'); // the graded run, not the Columns tab left open from before
    solved(tk, i, k, sql, story);
    if (v && message?.kind === 'good') { // full XP; Boon's note and both plan lines under "Correct"
      const base = message.view;
      message.view = () => h('div', {}, base(), slowView());
      drawMessage();
    }
  }

  /** Credit for a correct step: graded SQL for the Recap, next step / conclusion / solved, message and celebration. */
  function solved(tk: Ticket, i: number, k: string, sql: string, story: boolean): void {
    if (story) {
      app.save.graded[k] = sql; // the Recap shows what was graded, not the draft edited afterwards
      persist();
      if (i === tk.steps.length - 1) notePass(tk.id);
    }
    if (i < tk.steps.length - 1) {
      deps.onStepSolved(sql); // setTicket() for the next step clears the message, so say it afterwards
      say('good', () => t('work.stepDone', { i: i + 1 }), ['lily', 'cheer']);
      celebrate(feedback);
    } else if (tk.conclusion) {
      say('good', () => t(isClosed(tk.id) ? 'work.correct' : 'work.conclusionNext')); // redrawn after the conclusion is submitted
      deps.onConclusion(tk);
    } else {
      // XP of this first solve (story: complete() adds it; lane: LANE_XP once); a re-solve, Practice or a drill (chapter 0, its Recap says its XP) shows none.
      const xp = !story || tk.chapter === 0 ? 0 : tk.lane ? (app.save.lanes.includes(tk.id) ? 0 : LANE_XP) : done().has(tk.id) ? 0 : xpFor(tk, app.save.hintsUsed[tk.id] ?? 0);
      say('good', () => (xp ? t('work.correctXp', { n: xp }) : t('work.correct')), ['lily', 'cheer']);
      deps.onSolved(tk, sql);
      celebrate(feedback); // after onSolved: its rerender() redraws the message and would reset className
    }
  }

  async function format(): Promise<void> {
    if (editor && !(await editor.format())) say('bad', () => t('work.formatFailed'));
  }

  function relabel(): void {
    setButtons();
    words.draw();
    drawMessage();
    drawHistory();
    editor?.setLabel(t('work.editorLabel'));
  }

  return {
    setTicket(tk, i, force = false) {
      const sameTicket = ticket?.id === tk?.id && !force;
      ticket = tk;
      stepIndex = i;
      if (!editor || workKey() !== key || force) {
        key = workKey();
        if (!sameTicket) {
          app.lastRun = undefined;
          deps.panel.show('columns'); // nothing run yet: show the tables first
        }
        message = undefined;
        chip();
        selection = false; // the new editor starts with an empty selection
        editor?.destroy();
        editor = createEditor(editorHost, {
          // A promotion review step starts from the SQL that passed the step before ("from the list in step 1…", v10 B4); never into or out of an index lab.
          doc: initialDoc(readDraft(), (tk && i > 0 && !tk.steps[i].lab && !tk.steps[i - 1].lab ? app.save.graded[stepKey(tk.id, i - 1)] : undefined) ?? tk?.starter),
          schema: editorSchema(),
          label: t('work.editorLabel'),
          onChange: (v) => {
            words.draw();
            staleCheck(v);
            writeDraft(v);
            persist();
            if (fillNote) { // the first edit after "Fill the scaffold": its Undo would now only undo that edit (like the Try-it box)
              fillNote = false;
              message = undefined;
              drawMessage();
            }
          },
          onRun: () => void run(),
          onSubmit: () => void submit(),
          onSelection: (nonEmpty) => {
            selection = nonEmpty;
            setButtons();
            words.draw();
          },
        });
      }
      relabel();
    },
    relabel,
    setSchema: (ns) => editor?.setSchema(ns),
    setDoc: (sql) => {
      editor?.setValue(sql);
      editor?.focus();
    },
    fill(sql, faded, force) {
      const ed = editor;
      if (!ed || !ticket) return undefined;
      const act = force ? 'replace' : fillAction(ed.getValue(), sql, ticket.starter);
      if (act === 'ask') return 'ask';
      const doc = act === 'replace' ? sql : ed.getValue(); // already the scaffold: only select its first blank again
      const at = firstBlank(doc, faded);
      ed.fill(act === 'replace' ? sql : undefined, at < 0 ? [0, 0] : [at, 3]);
      ed.focus();
      showPane('work');
      const n = blanksIn(sql, faded);
      const key: Key = faded ? 'frame.resetDone' : 'frame.filled';
      say('good', () => h('div', { class: 'flex flex-wrap items-center gap-2' }, h('p', { class: 'm-0 font-normal' }, t(key, { n })),
        act === 'replace' ? h('button', {
          type: 'button',
          onclick: () => {
            if (editor !== ed) return;
            ed.undo();
            ed.focus();
            message = undefined;
            drawMessage();
          },
        }, t('frame.undo')) : null), ['boon', 'point']);
      fillNote = act === 'replace';
      return 'done';
    },
    currentSql: () => editor?.runTarget().sql ?? '',
    focus: () => editor?.focus(),
  };
}
