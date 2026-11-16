import type { SQLNamespace } from '@codemirror/lang-sql';
import type { DbClient } from '../db/client';
import { sqlErrorInfo } from '../db/run';
import { grade, type GradeResult } from '../grader';
import { loadHistory, pushHistory, writeHistory } from '../history';
import { t } from '../i18n';
import { app, done, draftKey, editorSchema, persist, stepKey, type LastRun } from '../state';
import { localStore } from '../storage';
import type { Ticket } from '../tickets';
import { h } from './dom';
import { createEditor, type Editor } from './editor';
import { errorText, errorView, gradeMessage } from './feedback';
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
}

export interface WorkArea {
  /** Recreates the editor only when ticketId#step changes (or `force`, after importing a save); otherwise keeps cursor, selection and undo. */
  setTicket(t: Ticket, stepIndex: number, force?: boolean): void;
  /** Language switch: labels and the last message only, never the editor. */
  relabel(): void;
  setSchema(ns: SQLNamespace): void;
  /** Exactly what Ctrl+Enter would run now (selection or whole editor), to compare with app.lastRun.sql. */
  currentSql(): string;
  focus(): void;
}

/** After a run, these tabs say nothing about the result, so the Result tab opens instead. */
const SCHEMA_TABS = new Set(['erd', 'columns']);

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

  const editorHost = h('div', { class: 'editor' });
  const runBtn = h('button', { type: 'button', onclick: () => void run() });
  const formatBtn = h('button', { type: 'button', onclick: () => void format() });
  const submitBtn = h('button', { type: 'button', class: 'primary', onclick: () => void submit() });
  const feedback = h('div', { class: 'feedback', role: 'status' });
  const historyBox = h('details', { class: 'history' });
  host.replaceChildren(editorHost, h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn), feedback, historyBox);

  function say(kind: 'good' | 'bad', view: () => Node | string): void {
    message = { kind, view };
    drawMessage();
  }
  function drawMessage(): void {
    feedback.className = `feedback ${message?.kind ?? ''}`;
    feedback.replaceChildren(message ? message.view() : '');
  }

  function setButtons(): void {
    runBtn.textContent = busy && app.dbStatus === 'loading' ? t('work.waitingDb') : t(selection ? 'work.runSel' : 'work.run');
    formatBtn.textContent = t('work.format');
    submitBtn.textContent = t('work.submit');
    runBtn.disabled = busy;
    submitBtn.disabled = busy;
    submitBtn.hidden = !ticket || done().has(ticket.id);
  }

  function drawHistory(): void {
    const list = ticket ? history[ticket.id] ?? [] : [];
    historyBox.hidden = list.length === 0;
    historyBox.replaceChildren(
      h('summary', {}, t('hist.title', { n: list.length })),
      h('ul', {}, ...list.map((e) => h('li', {},
        h('button', { type: 'button', class: 'hist', onclick: () => { editor?.setValue(e.sql); editor?.focus(); } },
          h('span', { class: e.ok ? 'good' : 'bad' }, e.ok ? '✓' : '✗'),
          ` ${e.sql.replace(/\s+/g, ' ').slice(0, 60)}`,
          e.rows === undefined ? '' : h('span', { class: 'muted' }, ` · ${t('hist.rows', { n: e.rows })}`))))));
  }

  function record(run: LastRun): void {
    if (!ticket) return;
    history = pushHistory(history, ticket.id, { sql: run.sql, at: Date.now(), ok: run.error === undefined, rows: run.result?.rows.length });
    writeHistory(localStore(), history);
    drawHistory();
  }

  function underline(e: unknown, offset: number): void {
    const info = sqlErrorInfo(e);
    if (info) editor?.showError(info, offset);
  }

  async function run(): Promise<void> {
    if (busy || !editor) return;
    const { sql, offset } = editor.runTarget();
    const k = ticket ? stepKey(ticket, stepIndex) : '';
    editor.clearError();
    busy = true;
    setButtons();
    if (app.dbStatus === 'loading') say('good', () => t('work.queued')); // DbClient queues the query until the DB is ready
    try {
      app.lastRun = { key: k, sql, offset, result: await deps.db.run(sql) };
      message = undefined;
    } catch (e) {
      app.lastRun = { key: k, sql, offset, error: e };
      underline(e, offset);
      say('bad', () => t('work.runFailed'));
    } finally {
      busy = false;
      setButtons();
      drawMessage();
    }
    record(app.lastRun);
    const failed = app.lastRun.error !== undefined;
    deps.panel.show(failed || SCHEMA_TABS.has(deps.panel.active) ? 'result' : deps.panel.active);
    deps.onRun();
  }

  async function submit(): Promise<void> {
    if (busy || !editor || !ticket || submitBtn.hidden) return;
    const tk = ticket;
    const i = stepIndex;
    const k = stepKey(tk, i);
    const sql = editor.getValue(); // Submit always grades the whole editor
    editor.clearError();
    busy = true;
    setButtons();
    // The player's run is recorded in lastRun, so the tabs and the shape card show what was graded,
    // and a timeout/restart keeps its error class (grade() itself only keeps Postgres errors).
    const playerRun = async (s: string) => {
      try {
        const result = await deps.db.run(s);
        app.lastRun = { key: k, sql: s, offset: 0, result };
        return result;
      } catch (e) {
        app.lastRun = { key: k, sql: s, offset: 0, error: e };
        throw e;
      }
    };
    let r: GradeResult | undefined;
    try {
      r = await grade((s) => (s === sql ? playerRun(s) : deps.db.run(s)), tk.steps[i].solution, sql, tk.ordered);
    } catch (e) {
      say('bad', () => t('work.contentBug', { msg: errorText(e) })); // the Solution itself failed
    } finally {
      busy = false;
      setButtons();
    }
    if (app.lastRun?.key === k) record(app.lastRun);
    deps.onRun();
    if (!r) return;
    if (!r.ok) {
      const fail = r;
      const err = app.lastRun?.error;
      if (fail.reason === 'error') {
        underline(err, 0);
        say('bad', () => (err !== undefined ? errorView(err) : gradeMessage(fail)));
      } else {
        if (fail.reason === 'rows' && app.lastRun?.result) app.lastRun.mark = fail.sample;
        say('bad', () => gradeMessage(fail));
      }
      if (fail.reason === 'columns') deps.panel.refresh(); // the shape card already shows the column count
      else deps.panel.show('result');
      return;
    }
    if (i < tk.steps.length - 1) {
      deps.onStepSolved(); // setTicket() for the next step clears the message, so say it afterwards
      say('good', () => t('work.stepDone', { i: i + 1 }));
    } else if (tk.conclusion) {
      say('good', () => t('work.conclusionNext'));
      deps.onConclusion(tk);
    } else {
      say('good', () => t('work.correct'));
      deps.onSolved(tk);
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
      const sameTicket = ticket?.id === tk.id && !force;
      ticket = tk;
      stepIndex = i;
      if (!editor || draftKey() !== key || force) {
        key = draftKey();
        if (!sameTicket) {
          app.lastRun = undefined;
          deps.panel.show('columns'); // nothing run yet: show the tables first
        }
        message = undefined;
        selection = false; // the new editor starts with an empty selection
        editor?.destroy();
        editor = createEditor(editorHost, {
          doc: app.save.drafts[draftKey()] ?? tk.starter ?? '',
          schema: editorSchema(),
          label: t('work.editorLabel'),
          onChange: (v) => {
            app.save.drafts[draftKey()] = v;
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
    currentSql: () => editor?.runTarget().sql ?? '',
    focus: () => editor?.focus(),
  };
}
