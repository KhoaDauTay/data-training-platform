import { DbRestartError, QueryTimeoutError } from '../db/client';
import type { ImportedTable } from '../db/import';
import { SqlError } from '../db/run';
import { t } from '../i18n';
import { IMPORT_LIMITS, MEMORY_WARN_CELLS, type ImportProblem } from '../import/csv';
import { importedCells, type AddOutcome, type MyData } from '../import/myData';
import { session } from '../session';
import { schemaHooks, unlockedTables, type Column } from '../state';
import { cx } from '../theme';
import { h } from './dom';
import { errorText } from './feedback';

const MB = 1024 * 1024;
let my: MyData | undefined;
let rerender: () => void = () => {};
let status = '';
let busy = false;

/** Imported tables count only in Sandbox (spec §7b "Hiển thị", I4). */
export const sandboxTables = (): ImportedTable[] => (session.mode.kind === 'sandbox' && my ? my.tables : []);

/** v16 (L142): every imported table name, whatever the mode: exports leave out SQL that reads them. */
export const importedNames = (): string[] => (my ? my.tables.map((x) => x.table) : []);
/** Unlocked game tables, plus imported ones in Sandbox: what the ER tab draws. */
export const visibleTables = (): string[] => [...unlockedTables(), ...sandboxTables().map((x) => x.table)];

const sandboxColumns = (): Record<string, Column[]> => Object.fromEntries(sandboxTables().map((x) => [x.table, x.columns]));

/** Called once from main.ts after the MyData instance exists. */
export function initMyData(m: MyData, onRerender: () => void): void {
  my = m;
  rerender = onRerender;
  schemaHooks.extra = sandboxColumns; // editorSchema() adds imported tables in Sandbox (I1)
}

/** In memory only (I6). */
export function setMyDataStatus(text: string): void {
  status = text;
  rerender();
}

function problemText(p: ImportProblem): string {
  switch (p.kind) {
    case 'empty': return t('mydata.empty');
    case 'tooLarge': return t('mydata.tooLarge', { mb: Math.ceil(p.bytes / MB), max: IMPORT_LIMITS.maxBytes / MB });
    case 'tooManyRows': return t('mydata.tooManyRows', { n: p.rows, max: IMPORT_LIMITS.maxRows });
    case 'tooManyColumns': return t('mydata.tooManyColumns', { n: p.columns, max: IMPORT_LIMITS.maxColumns });
    case 'tooManyTables': return t('mydata.tooManyTables', { max: IMPORT_LIMITS.maxTables });
  }
}

/** Postgres' own message is shown unchanged under the explanation; other failures reuse the app's error text. */
export function importErrorText(e: unknown): string {
  if (e instanceof QueryTimeoutError) return t('mydata.timeout', { s: e.timeoutMs / 1000 });
  if (e instanceof DbRestartError) return t('mydata.restarted');
  if (e instanceof SqlError) return `${t('mydata.copyError')}\n${e.message}`;
  return errorText(e); // WorkerTaskError, DbFailedError, anything else
}

function outcomeText(r: AddOutcome): string {
  if (!r.ok) return 'problem' in r ? problemText(r.problem) : importErrorText(r.error);
  const done = t('mydata.done', { table: r.table.table, rows: r.table.rows, cols: r.table.columns.length });
  return r.persisted ? done : `${done} ${t('mydata.notPersisted')}`;
}

/** One file after another (I5); the file input is disabled meanwhile. */
async function addFiles(files: FileList | null | undefined): Promise<void> {
  if (!my || busy || !files || files.length === 0) return;
  busy = true;
  const lines: string[] = [];
  try {
    for (const f of Array.from(files)) {
      setMyDataStatus(t('mydata.loading', { name: f.name }));
      lines.push(`${f.name}: ${outcomeText(await my.add(f, f.name))}`);
    }
  } finally {
    busy = false;
    setMyDataStatus(lines.join('\n'));
  }
}

async function act(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    setMyDataStatus(importErrorText(e));
  }
}

/** Tables whose column list is open: rerender() (every Run) rebuilds the pane, so the open state lives here. */
const openTables = new Set<string>();

function tableItem(x: ImportedTable): HTMLElement {
  const toggle = (e: Event): void => {
    if ((e.currentTarget as HTMLDetailsElement).open) openTables.add(x.table);
    else openTables.delete(x.table);
  };
  return h('li', { class: 'flex items-start justify-between gap-2 border-b border-line py-1' },
    h('details', { class: 'min-w-0', open: openTables.has(x.table), ontoggle: toggle },
      h('summary', { class: 'cursor-pointer' }, h('code', {}, x.table), ' ', h('span', { class: 'text-body-sm text-muted' }, t('mydata.rows', { n: x.rows }))),
      h('ul', { class: 'mt-1 mb-0 list-none pl-4' },
        ...x.columns.map((c) => h('li', {}, h('code', {}, c.name), ' ', h('span', { class: 'text-body-sm text-muted' }, c.type))))),
    h('button', {
      type: 'button',
      'aria-label': t('mydata.deleteAria', { table: x.table }),
      onclick: () => void act(() => my!.remove(x.table)),
    }, t('mydata.delete')));
}

/** "My data" section of the Sandbox pane. Everything from the file (names, types, Postgres messages) is rendered as text. */
export function renderMyData(): HTMLElement {
  // `peer` + sr-only: the input keeps keyboard focus, the label shows the focus ring.
  const input = h('input', { type: 'file', accept: '.csv,text/csv', multiple: true, class: 'peer sr-only', id: 'mydata-file' });
  input.disabled = busy;
  input.addEventListener('change', () => void addFiles(input.files));
  const drop = h('label', {
    for: 'mydata-file',
    class: cx('block rounded-(--r-ctl) border-2 border-dashed border-line p-4 text-center',
      busy ? 'cursor-wait opacity-60' : 'cursor-pointer hover:border-accent',
      'peer-focus-visible:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent'),
  }, t('mydata.drop'));
  drop.addEventListener('dragover', (e) => e.preventDefault());
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    void addFiles(e.dataTransfer?.files);
  });
  const tables = my?.tables ?? [];
  return h('section', { class: 'mt-4 border-t border-line pt-3', 'aria-labelledby': 'mydata-title' },
    h('h3', { id: 'mydata-title', class: 'mt-0' }, t('mydata.title')),
    h('p', { class: 'mt-1 text-body-sm text-muted' }, t('mydata.intro', { mb: IMPORT_LIMITS.maxBytes / MB, rows: IMPORT_LIMITS.maxRows, cols: IMPORT_LIMITS.maxColumns, tables: IMPORT_LIMITS.maxTables })),
    importedCells(tables) >= MEMORY_WARN_CELLS
      ? h('p', { class: 'rounded-(--r-inset) bg-accent-soft p-2 text-body-sm ring-1 ring-accent', role: 'note' }, t('mydata.memoryWarn'))
      : null,
    input,
    drop,
    h('p', { class: 'min-h-[1.5em] whitespace-pre-wrap text-body-sm', role: 'status' }, status),
    tables.length
      ? h('ul', { class: 'my-2 list-none p-0' }, ...tables.map(tableItem))
      : h('p', { class: 'text-body-sm text-muted' }, t('mydata.none')),
    tables.length
      ? clearButton()
      : null,
  );
}

/** Two-step "delete all": the first click asks inline (no native confirm(), which blocks the page). */
let confirmingClear = false; // module-level: a rerender (import replay, language switch, Run) keeps the question open
function clearButton(): HTMLElement {
  const box = h('div', { class: 'flex flex-wrap items-center gap-2' });
  const first = h('button', { type: 'button', onclick: () => { confirmingClear = true; draw(); (box.querySelector('[data-yes]') as HTMLElement).focus(); } }, t('mydata.clear'));
  const draw = (): void => {
    if (!confirmingClear) return void box.replaceChildren(first);
    const yes = h('button', {
      type: 'button', 'data-yes': '', class: 'rounded-(--r-inset) bg-bad px-3 py-1 font-semibold text-on-accent',
      onclick: () => {
        yes.disabled = true; // no double clear
        confirmingClear = false;
        void act(() => my!.clear()).then(() => document.getElementById('mydata-file')?.focus());
      },
    }, t('mydata.clearYes'));
    const no = h('button', { type: 'button', onclick: () => { confirmingClear = false; draw(); first.focus(); } }, t('mydata.clearNo'));
    box.replaceChildren(h('p', { class: 'w-full text-body-sm', role: 'alert' }, t('mydata.clearConfirm')), yes, no);
  };
  draw();
  return box;
}
