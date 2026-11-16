import { PostgreSQL, sql, type SQLNamespace } from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { basicSetup, EditorView } from 'codemirror';

export interface Editor {
  getValue(): string;
  setSchema(ns: SQLNamespace): void;
  setLabel(label: string): void;
  focus(): void;
  destroy(): void;
}

export interface EditorOptions {
  doc: string;
  schema: SQLNamespace;
  label: string;
  onChange(v: string): void;
}

const language = (schema: SQLNamespace) => sql({ dialect: PostgreSQL, schema, upperCaseKeywords: true });
const ariaLabel = (label: string) => EditorView.contentAttributes.of({ 'aria-label': label });

export function createEditor(parent: HTMLElement, opts: EditorOptions): Editor {
  const schemaConf = new Compartment();
  const labelConf = new Compartment();
  const view = new EditorView({
    parent,
    doc: opts.doc,
    extensions: [
      basicSetup, // no indentWithTab: Tab must still leave the editor
      schemaConf.of(language(opts.schema)),
      labelConf.of(ariaLabel(opts.label)),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) opts.onChange(u.state.doc.toString());
      }),
    ],
  });

  return {
    getValue: () => view.state.doc.toString(),
    setSchema(ns) {
      view.dispatch({ effects: schemaConf.reconfigure(language(ns)) });
    },
    setLabel(label) {
      view.dispatch({ effects: labelConf.reconfigure(ariaLabel(label)) });
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
