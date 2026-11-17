import { closeCompletion } from '@codemirror/autocomplete';
import { PostgreSQL, sql, type SQLNamespace } from '@codemirror/lang-sql';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { setDiagnostics } from '@codemirror/lint';
import { Compartment, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { basicSetup, EditorView } from 'codemirror';
import type { SqlErrorInfo } from '../db/run';

export interface Editor {
  getValue(): string;
  /** The selection when it is not empty, else the whole document; `offset` = where `sql` starts in the document. */
  runTarget(): { sql: string; offset: number };
  /** Replaces the document in one undoable transaction (history, format). */
  setValue(sql: string): void;
  setSchema(ns: SQLNamespace): void;
  setLabel(label: string): void;
  /** Underlines Postgres' 1-based character `position`, shifted by `offset` for a selection run. */
  showError(e: SqlErrorInfo, offset: number): void;
  clearError(): void;
  /** false when sql-formatter cannot parse the SQL (or its chunk failed to load). */
  format(): Promise<boolean>;
  /** Closes the autocomplete popup (Run/Submit: it would cover the result). */
  closeCompletion(): void;
  focus(): void;
  destroy(): void;
}

export interface EditorOptions {
  doc: string;
  schema: SQLNamespace;
  label: string;
  onChange(v: string): void;
  onRun(): void;
  onSubmit(): void;
  onSelection(nonEmpty: boolean): void;
}

const language = (schema: SQLNamespace) => sql({ dialect: PostgreSQL, schema, upperCaseKeywords: true });
const ariaLabel = (label: string) => EditorView.contentAttributes.of({ 'aria-label': label });

/** L13: colours are CSS variables (style.css, light + [data-theme=dark]), so the in-app theme switch recolours them without JS here. */
const highlight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--syn-keyword)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--syn-string)' },
  { tag: tags.number, color: 'var(--syn-number)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: tags.operator, color: 'var(--syn-operator)' },
  { tag: [tags.typeName, tags.standard(tags.name)], color: 'var(--syn-type)' },
  { tag: [tags.propertyName, tags.special(tags.name)], color: 'var(--syn-property)' },
  { tag: [tags.bool, tags.null], color: 'var(--syn-atom)' },
]));

export function createEditor(parent: HTMLElement, opts: EditorOptions): Editor {
  const schemaConf = new Compartment();
  const labelConf = new Compartment();
  const view = new EditorView({
    parent,
    doc: opts.doc,
    extensions: [
      Prec.highest(keymap.of([
        { key: 'Mod-Enter', run: () => (opts.onRun(), true) },
        { key: 'Mod-Shift-Enter', run: () => (opts.onSubmit(), true) },
        { key: 'Shift-Alt-f', run: () => (void api.format(), true) },
      ])),
      basicSetup, // no indentWithTab: Tab must still leave the editor
      highlight, // non-fallback: replaces basicSetup's defaultHighlightStyle
      schemaConf.of(language(opts.schema)),
      labelConf.of(ariaLabel(opts.label)),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) opts.onChange(u.state.doc.toString());
        if (u.selectionSet) opts.onSelection(!u.state.selection.main.empty);
      }),
    ],
  });

  const api: Editor = {
    getValue: () => view.state.doc.toString(),
    runTarget() {
      const s = view.state.selection.main;
      return s.empty ? { sql: view.state.doc.toString(), offset: 0 } : { sql: view.state.sliceDoc(s.from, s.to), offset: s.from };
    },
    setValue(value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    },
    setSchema(ns) {
      view.dispatch({ effects: schemaConf.reconfigure(language(ns)) });
    },
    setLabel(label) {
      view.dispatch({ effects: labelConf.reconfigure(ariaLabel(label)) });
    },
    showError(e, offset) {
      if (!e.position) return; // e.g. "cannot insert multiple commands" has no position
      const doc = view.state.doc;
      const from = Math.min(offset + e.position - 1, doc.length);
      const word = /^[\w."]+/.exec(doc.sliceString(from, from + 64))?.[0].length ?? 0;
      const to = Math.min(from + Math.max(word, 1), doc.length);
      view.dispatch(setDiagnostics(view.state, [{ from, to, severity: 'error', message: e.hint ? `${e.message}\n${e.hint}` : e.message }]));
    },
    clearError() {
      view.dispatch(setDiagnostics(view.state, []));
    },
    async format() {
      try {
        const { formatDialect, postgresql } = await import('sql-formatter'); // lazy chunk (D5)
        api.setValue(formatDialect(view.state.doc.toString(), { dialect: postgresql, keywordCase: 'upper' }));
        return true;
      } catch {
        return false;
      }
    },
    closeCompletion: () => void closeCompletion(view),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
  return api;
}
