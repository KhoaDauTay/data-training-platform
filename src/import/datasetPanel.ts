// V20-B (L176): the "Sample datasets" block of Sandbox → My data, its own lazy chunk (`datasetPanel-*`, with datasets.yml).
// Imports only types from main modules: every main value comes in through PanelDeps (a value import would make Rolldown split main, Plan 6 U3).
import raw from '../../content/general/datasets.yml';
import type { GradeResult, Runner } from '../grader';
import type { Lang } from '../i18n';
import type { h as H } from '../ui/dom';
import type { AddOutcome, MyData } from './myData';
import { fetchDataset, parseDatasets, type Bi, type Dataset, type Datasets } from './datasets';

type Fail = Extract<GradeResult, { ok: false }>;
export interface PanelDeps {
  h: typeof H;
  cx: (...c: (string | false | null | undefined)[]) => string;
  lang: Lang;
  my: MyData;
  grade: (run: Runner, solution: string, player: string, ordered: boolean) => Promise<GradeResult>;
  verdictText: (r: Fail) => string;
  errorText: (e: unknown) => string;
  outcomeText: (r: AddOutcome) => string;
  rerender: () => void;
  busy: () => boolean;
  setBusy: (b: boolean) => void;
  setStatus: (text: string) => void;
}

let sets: Datasets | undefined;
const drafts = new Map<string, string>();
const verdicts = new Map<string, { ok: boolean; text: string }>();
/** Dataset id → the table its copy lives in (`penguins`, or `penguins_2` when the player owns `penguins`); re-read when the table list changes. */
const tableOf = new Map<string, string | undefined>();
let tablesSig: string | undefined;
/** Stored file name of a sample copy: a `/` never appears in a real file's name, so a player's own file never matches. */
const markerOf = (d: Dataset): string => `sample/${d.file}`;
/** The Solution, on the copy's table name (`d.table` is a plain identifier, so it is safe inside the pattern). */
export const onTable = (sql: string, d: Pick<Dataset, 'table'>, table: string): string => sql.replace(new RegExp(String.raw`\b${d.table}\b`, 'g'), table);

async function loadSample(d: Dataset, ui: Datasets['ui'], x: PanelDeps): Promise<void> {
  if (x.busy()) return;
  x.setBusy(true);
  x.setStatus(ui.loading[x.lang]);
  let line: string;
  try {
    // Same origin only (datasetUrl); then the player's own import path: D3 limits, `_my` names, IndexedDB.
    const blob = await fetchDataset(d.file);
    // Never over a table the player imported: a free name, or the previous copy of this same sample.
    const table = await x.my.sampleName(d.table, markerOf(d));
    const r = await x.my.add(blob, markerOf(d), `${table}.csv`);
    if (r.ok) tableOf.set(d.id, r.table.table);
    line = x.outcomeText(r);
  } catch {
    line = ui.failed[x.lang];
  }
  x.setBusy(false);
  x.setStatus(`${d.file}: ${line}`);
}

function question(d: Dataset, table: string, i: number, ui: Datasets['ui'], x: PanelDeps): HTMLElement {
  const { h, cx } = x;
  const tx = (b: Bi): string => b[x.lang];
  const key = `${d.id}#${i}`;
  const q = d.questions[i];
  const area = h('textarea', { rows: '3', lang: 'en', spellcheck: 'false', class: 'mt-1 w-full rounded-(--r-inset) p-2 font-mono text-body-sm ring-1 ring-line', 'aria-label': `${tx(ui.answer)} ${i + 1}` });
  area.value = drafts.get(key) ?? '';
  area.addEventListener('input', () => drafts.set(key, area.value));
  const verdict = h('p', { role: 'status' });
  const draw = (): void => {
    const v = verdicts.get(key);
    verdict.className = cx('mb-0 min-h-[1.5em] whitespace-pre-wrap text-body-sm', v && (v.ok ? 'good' : 'bad'));
    verdict.textContent = v?.text ?? '';
  };
  draw();
  const check = h('button', {
    type: 'button',
    onclick: async () => {
      if (!area.value.trim()) verdicts.set(key, { ok: false, text: tx(ui.empty) });
      else {
        check.disabled = true;
        try {
          // The real grader against the dataset's answer, 0 XP, nothing saved (like "Thử ngay").
          const r = await x.grade((sql) => x.my.query(sql), onTable(q.solution, d, table), area.value, q.ordered);
          verdicts.set(key, r.ok ? { ok: true, text: tx(ui.ok) } : { ok: false, text: x.verdictText(r) });
        } catch (e) {
          verdicts.set(key, { ok: false, text: x.errorText(e) });
        }
        check.disabled = false;
      }
      draw();
      if (!verdict.isConnected) x.rerender();
    },
  }, tx(ui.check));
  return h('li', { class: 'mb-3' }, h('p', { class: 'my-0 text-body-sm' }, tx(q.task)), area, h('div', { class: 'flex items-center gap-2' }, check, verdict));
}

export function datasetPanel(x: PanelDeps): HTMLElement {
  const { h } = x;
  sets ??= parseDatasets(raw);
  const { ui } = sets;
  const tx = (b: Bi): string => b[x.lang];
  const sig = x.my.tables.map((t) => t.table).join(',');
  if (sig !== tablesSig) {
    tablesSig = sig;
    for (const d of sets.datasets) void x.my.sampleTable(markerOf(d)).then((t) => { if (t !== tableOf.get(d.id)) { tableOf.set(d.id, t); x.rerender(); } });
  }
  const link = (href: string, text: string, rel: string): HTMLElement => h('a', { href, target: '_blank', rel }, text);
  return h('section', { class: 'mt-4 border-t border-line pt-3', 'aria-labelledby': 'datasets-title' },
    h('h3', { id: 'datasets-title', class: 'mt-0' }, tx(ui.title)),
    h('p', { class: 'mt-1 text-body-sm text-muted' }, tx(ui.intro)),
    ...sets.datasets.map((d) => h('article', { class: 'mt-2 rounded-(--r-ctl) p-3 ring-1 ring-line' },
      h('h4', { class: 'mt-0' }, tx(d.title)),
      h('p', { class: 'my-1 text-body-sm' }, tx(d.about)),
      h('p', { class: 'my-1 text-body-sm text-muted' },
        `${tx(ui.source)}: `, link(d.source_url, d.credit, 'noopener noreferrer'), ` ${tx(ui.licence)}: `, link(d.licence_url, d.licence, 'noopener noreferrer license')),
      h('button', { type: 'button', class: 'primary', disabled: x.busy(), onclick: () => void loadSample(d, ui, x) }, tx(ui.load)),
      h('h4', { class: 'mb-1' }, tx(ui.questions)),
      ...questions(d, ui, x))),
  );
}

/** The copy's table and its questions, or a hint to load the set first. */
function questions(d: Dataset, ui: Datasets['ui'], x: PanelDeps): HTMLElement[] {
  const { h } = x;
  const table = tableOf.get(d.id);
  if (!table || !x.my.tables.some((t) => t.table === table)) return [h('p', { class: 'text-body-sm text-muted' }, ui.loadFirst[x.lang])];
  return [h('p', { class: 'my-1 text-body-sm' }, `${ui.table[x.lang]}: `, h('code', {}, table)),
    h('ol', { class: 'pl-5' }, ...d.questions.map((_, i) => question(d, table, i, ui, x)))];
}
