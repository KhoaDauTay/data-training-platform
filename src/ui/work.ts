import type { SQLNamespace } from '@codemirror/lang-sql';
import type { DbClient } from '../db/client';
import { sqlErrorInfo } from '../db/run';
import type { QueryResult } from '../db/run';
import { compareResults, grade, type GradeResult } from '../grader';
import { loadHistory, pushHistory, writeHistory } from '../history';
import { getLang, isMac, t } from '../i18n';
import { SKILLS } from '../progress';
import { isClosed, isStory, readDraft, workKey, writeDraft } from '../session';
import { app, editorSchema, initialDoc, persist, stepKey, type LastRun } from '../state';
import { localStore } from '../storage';
import { BTN_SUBMIT } from '../theme';
import { BLANK, type Ticket } from '../tickets';
import { celebrate } from './celebrate';
import { h } from './dom';
import { createEditor, type Editor } from './editor';
import { avatar } from './avatar';
import { errorText, errorView, gradeMessage, voiceKey } from './feedback';
import { pageShortcutOf } from './shortcuts';
import type { Panel } from './tabs';

export interface WorkDeps {
  db: DbClient;
  panel: Panel;
  /** Normal ticket solved. */
  onSolved(t: Ticket): void;
  /** A boss step other than the last one solved. */
  onStepSolved(): void;
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
  /** Exactly what Ctrl+Enter would run now (selection or whole editor), to compare with app.lastRun.sql. */
  currentSql(): string;
  focus(): void;
}

/** After a run, these tabs say nothing about the result, so the Result tab opens instead. */
const SCHEMA_TABS = new Set(['erd', 'columns']);

const FEEDBACK: Record<'good' | 'bad', string> = {
  good: 'mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800',
  bad: 'mt-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-800',
};

/**
 * After a wrong result (curriculum §5.4): the author's explanation when the result equals one of the ticket's `wrong:` SQL,
 * else the trap of the skill the ticket teaches. A wrong column count says nothing about which mistake it was (no tip), and an
 * empty result looks like every mistake that filters too much, so it is never matched against `wrong:` (tests/content.test.ts:
 * a `wrong:` SQL always returns rows). Each `wrong:` SQL runs once per ticket+variant (its text has the variant applied).
 */
export function wrongTipper(run: (sql: string) => Promise<QueryResult>) {
  const results = new Map<string, Promise<QueryResult | null>>();
  const resultOf = (tk: Ticket, sql: string): Promise<QueryResult | null> => {
    const k = `${tk.id}#${sql}`;
    let p = results.get(k);
    if (!p) results.set(k, p = run(sql).catch(() => null)); // a failing `wrong:` is a content bug (tests/content.test.ts): skipped
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
  let message: { kind: 'good' | 'bad'; view: () => Node | string } | undefined;
  let history = loadHistory(localStore());

  const editorHost = h('div', { class: 'editor overflow-hidden rounded-xl ring-1 ring-line' });
  const runBtn = h('button', { type: 'button', onclick: () => void run() });
  // EXPLAIN always describes what was just run: run the editor SQL, and open the tab only if that run succeeded for this editor.
  const explainBtn = h('button', { type: 'button', onclick: () => void run('explain') });
  const formatBtn = h('button', { type: 'button', onclick: () => void format() });
  const submitBtn = h('button', { type: 'button', class: BTN_SUBMIT, onclick: () => void submit() });
  const feedback = h('div', { role: 'status' });
  const historyBox = h('details', { class: 'mt-2 text-sm' });
  host.replaceChildren(editorHost, h('div', { class: 'max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:bg-panel' }, h('div', { class: 'actions' }, runBtn, explainBtn, formatBtn, submitBtn)), feedback, historyBox);

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

  function say(kind: 'good' | 'bad', view: () => Node | string): void {
    message = { kind, view };
    drawMessage();
  }
  function drawMessage(): void {
    feedback.className = message ? FEEDBACK[message.kind] : '';
    feedback.replaceChildren(message ? message.view() : '');
  }

  function setButtons(): void {
    runBtn.textContent = busy && app.dbStatus === 'loading' ? t('work.waitingDb') : t(selection ? 'work.runSel' : 'work.run');
    explainBtn.textContent = t('tab.explain');
    formatBtn.textContent = t('work.format');
    submitBtn.textContent = t('work.submit');
    runBtn.disabled = busy;
    explainBtn.disabled = busy;
    submitBtn.disabled = busy;
    submitBtn.hidden = !ticket || isClosed(ticket.id);
  }

  function drawHistory(): void {
    const list = ticket && isStory() ? history[ticket.id] ?? [] : []; // in Practice it would show the story's passing SQL
    historyBox.hidden = list.length === 0;
    historyBox.replaceChildren(
      h('summary', { class: 'cursor-pointer text-muted' }, t('hist.title', { n: list.length })),
      h('ul', { class: 'my-1 list-none p-0' }, ...list.map((e) => h('li', {},
        h('button', { type: 'button', class: 'w-full border-0 bg-transparent px-1 py-0.5 text-left font-mono text-xs hover:bg-code', onclick: () => { editor?.setValue(e.sql); editor?.focus(); } },
          h('span', { class: e.ok ? 'good' : 'bad' }, e.ok ? '✓' : '✗'),
          ` ${e.sql.replace(/\s+/g, ' ').slice(0, 60)}`,
          e.rows === undefined ? '' : h('span', { class: 'muted' }, ` · ${t('hist.rows', { n: e.rows })}`))))));
  }

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
    const k = tk ? stepKey(tk.id, stepIndex) : '';
    const historyId = isStory() ? tk?.id : undefined; // a practice variant shares the ticket id: keep it out of that history (P5)
    ed.closeCompletion();
    ed.clearError();
    busy = true;
    setButtons();
    if (app.dbStatus === 'loading') say('good', () => t('work.queued')); // DbClient queues the query until the DB is ready
    let r: LastRun;
    try {
      r = { key: k, sql, offset, result: await deps.db.run(sql) };
    } catch (e) {
      r = { key: k, sql, offset, error: e };
    } finally {
      busy = false;
      setButtons();
    }
    record(historyId, r);
    if (editor !== ed) return;
    app.lastRun = r;
    const failed = r.error !== undefined;
    if (failed) {
      underline(r.error, offset);
      say('bad', () => t('work.runFailed'));
    } else {
      message = undefined;
      drawMessage();
    }
    deps.panel.show(failed || (!tab && SCHEMA_TABS.has(deps.panel.active)) ? 'result' : tab ?? deps.panel.active);
    deps.onRun();
  }

  const wrongTip = wrongTipper((sql) => deps.db.run(sql));

  async function submit(): Promise<void> {
    if (busy || !editor || !ticket || submitBtn.hidden) return;
    const ed = editor;
    const tk = ticket;
    const i = stepIndex;
    const k = stepKey(tk.id, i);
    const story = isStory(); // captured at click time, like the ticket
    const sql = ed.getValue(); // Submit always grades the whole editor
    const blanks = tk.format === 'faded' ? sql.split(BLANK).length - 1 : 0; // elsewhere ___ is a valid LIKE pattern
    if (blanks) {
      say('bad', () => t('work.blanks', { n: blanks })); // a faded starter not filled in yet: not graded, not a wrong submit
      return;
    }
    ed.closeCompletion();
    ed.clearError();
    busy = true;
    setButtons();
    // The player's run becomes lastRun, so the tabs and the shape card show what was graded,
    // and a timeout/restart keeps its error class (grade() itself only keeps Postgres errors).
    let played: LastRun | undefined;
    const playerRun = async (s: string) => {
      try {
        const result = await deps.db.run(s);
        played = { key: k, sql: s, offset: 0, result };
        return result;
      } catch (e) {
        played = { key: k, sql: s, offset: 0, error: e };
        throw e;
      }
    };
    let r: GradeResult | undefined;
    let solutionError: unknown;
    let tip: (() => string) | undefined;
    try {
      r = await grade((s) => (s === sql ? playerRun(s) : deps.db.run(s)), tk.steps[i].solution, sql, tk.ordered);
      // Still busy: no newer Run/Submit can start before the tip is ready, so this result can never overwrite a newer one.
      if (!r.ok && r.reason !== 'error') tip = await wrongTip(tk, played?.result, r);
    } catch (e) {
      solutionError = e; // the Solution itself failed
      r = undefined;
    } finally {
      busy = false;
      setButtons();
    }
    if (played) record(story ? tk.id : undefined, played);
    if (editor !== ed) return; // stale: never credit or message a ticket the player has left
    if (played) app.lastRun = played;
    deps.onRun();
    if (!r) {
      say('bad', () => t('work.contentBug', { msg: errorText(solutionError) }));
      return;
    }
    if (!r.ok) {
      deps.onWrong?.();
      const fail = r;
      const err = played?.error;
      // The sender answers in the chat under the grader's facts (re-translated on a language switch like every message).
      const voice = (): HTMLElement => h('p', { class: 'mt-2 mb-0 flex items-start gap-2' },
        avatar(tk.from), h('span', { class: 'rounded-2xl rounded-tl-sm bg-panel px-3 py-1.5 text-ink' }, t(voiceKey(fail))));
      if (fail.reason === 'error') {
        underline(err, 0);
        say('bad', () => h('div', {}, err !== undefined ? errorView(err) : gradeMessage(fail), voice()));
      } else {
        if (fail.reason === 'rows' && played?.result) played.mark = fail.sample;
        say('bad', () => h('div', {}, gradeMessage(fail), tip ? h('p', { class: 'mt-2 mb-0' }, tip()) : null, voice()));
      }
      deps.panel.show('result');
      return;
    }
    deps.panel.show('result'); // the graded run, not the Columns tab left open from before
    if (story) {
      app.save.graded[k] = sql; // the Recap shows what was graded, not the draft edited afterwards
      persist();
    }
    if (i < tk.steps.length - 1) {
      deps.onStepSolved(); // setTicket() for the next step clears the message, so say it afterwards
      say('good', () => t('work.stepDone', { i: i + 1 }));
      celebrate(feedback);
    } else if (tk.conclusion) {
      say('good', () => t(isClosed(tk.id) ? 'work.correct' : 'work.conclusionNext')); // redrawn after the conclusion is submitted
      deps.onConclusion(tk);
    } else {
      say('good', () => t('work.correct'));
      deps.onSolved(tk);
      celebrate(feedback); // after onSolved: its rerender() redraws the message and would reset className
    }
  }

  async function format(): Promise<void> {
    if (editor && !(await editor.format())) say('bad', () => t('work.formatFailed'));
  }

  function relabel(): void {
    setButtons();
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
        selection = false; // the new editor starts with an empty selection
        editor?.destroy();
        editor = createEditor(editorHost, {
          doc: initialDoc(readDraft(), tk?.starter),
          schema: editorSchema(),
          label: t('work.editorLabel'),
          onChange: (v) => {
            writeDraft(v);
            persist();
          },
          onRun: () => void run(),
          onSubmit: () => void submit(),
          onSelection: (nonEmpty) => {
            selection = nonEmpty;
            setButtons();
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
    currentSql: () => editor?.runTarget().sql ?? '',
    focus: () => editor?.focus(),
  };
}
