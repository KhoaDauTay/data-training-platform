import type { DbClient } from '../db/client';
import { domainSchemaId, domainSchemaName } from '../domains';
import { t } from '../i18n';
import { hashOf } from '../route';
import type { SchemaId } from '../domains';
import { activeSchema, activeTicket, session } from '../session';
import { app, erMeta, selected, showsParents, textValues, unlockedTables } from '../state';
import { chapterColor, THEME_EVENT } from '../theme';
import { erDefinition, relatedTables, tablesInQuery, type ErMetadata } from '../viz/erd';
import { memoByKey } from '../viz/memo';
import { flattenPlan, type Plan } from '../viz/plan';
import type { StepsResult } from '../viz/steps';
import { renderChart } from './chartView';
import { h, loader, nodes } from './dom';
import { drawErd, erdSvg, keyBadges, valuesLine } from './erdView';
import { renderExplain } from './explainView';
import { errorView } from './feedback';
import { renderFlow } from './flowView';
import { sandboxTables, visibleTables } from './myDataView';
import { renderSteps } from './stepsView';
import { tablesIn } from './tryPreview';
import { registerTab } from './tabs';

export interface VizDeps {
  db: DbClient;
  /** Switches the bottom panel to a tab (Panel.show). */
  show(id: string): void;
  /** Id of the open tab (Panel.active). */
  active(): string;
  /** What Ctrl+Enter would run now — only used to flag that lastRun is out of date. */
  editorSql(): string;
}

/** Every viz tab describes the last run, not the editor (same strip as the Result tab). Returns its SQL, or undefined after drawing the empty state. */
function lastRunSql(host: HTMLElement, deps: VizDeps): string | undefined {
  const run = app.lastRun;
  if (!run) {
    host.append(h('p', { class: 'muted' }, t('res.runFirst')));
    return undefined;
  }
  if (deps.editorSql().trim() !== run.sql.trim()) host.append(h('p', { class: 'stale', role: 'note' }, t('res.stale')));
  return run.sql;
}

/** Shows a loading line, then replaces it with draw(value) or the error. The stale strip above stays. */
async function load<T>(host: HTMLElement, loading: string, data: Promise<T>, draw: (body: HTMLElement, value: T) => void): Promise<void> {
  const body = h('div', {}, h('p', { class: 'muted flex items-center gap-2' }, loader(), loading));
  host.append(body);
  try {
    const value = await data;
    body.replaceChildren();
    draw(body, value);
  } catch (e) {
    // Postgres' message unchanged + teaching note; timeout/restart/DB failure translated by class (src/ui/feedback.ts).
    body.replaceChildren(errorView(e));
  }
}

/** Memo key of the last run: its schema, then its SQL. */
const runKey = (sql: string): string => `${app.lastRun?.schema ?? 'game'}|${sql}`;
const splitKey = (key: string): [SchemaId, string] => {
  const i = key.indexOf('|');
  return [key.slice(0, i) as SchemaId, key.slice(i + 1)];
};
/** Plan 8a: the drill workspace reads `lab` in the ER and Columns tabs (L93: its Solution's tables first, a switch to all). */
const inDrill = (): boolean => activeSchema() === 'lab'; // a drill, or a review drill in Practice

function registerPlanTabs(deps: VizDeps): void {
  // Keyed by schema + SQL: the same text means other tables on lab (Plan 8a).
  const planFor = memoByKey((key) => {
    const [schema, sql] = splitKey(key);
    return deps.db.explain(sql, { schema }).then(flattenPlan);
  });
  const withPlan = (draw: (host: HTMLElement, plan: Plan) => void) => (host: HTMLElement) => {
    const sql = lastRunSql(host, deps);
    return sql === undefined ? undefined : load(host, t('viz.explaining'), planFor(runKey(sql)), draw);
  };
  registerTab({ id: 'explain', label: 'tab.explain', group: 'query', order: 20, newAt: 'ch11-01', from: 'ch11-01', render: withPlan(renderExplain) }); // EXPLAIN is taught in ch11 (L30/L35)
  registerTab({ id: 'flow', label: 'tab.flow', group: 'query', order: 30, newAt: 'ch3-01', from: 'ch3-01', render: withPlan(renderFlow) });
}

function registerStepsTab(deps: VizDeps): void {
  // Same idea as planFor: re-rendering (language switch, tab switch) never re-runs the sub-queries.
  // The parser download gets its own long budget first, so it never counts toward the steps timeout (L36).
  const stepsFor = memoByKey((key) => {
    const [schema, sql] = splitKey(key);
    return deps.db.loadParser().then(() => deps.db.steps<StepsResult>(sql, { schema }));
  });
  registerTab({
    id: 'steps', from: 'ch1-03', newAt: 'ch1-03', // v4 §B.2: first ORDER BY
    label: 'tab.steps',
    group: 'query',
    order: 10,
    render: (host) => {
      const sql = lastRunSql(host, deps);
      return sql === undefined
        ? undefined
        : load(host, t('steps.running'), stepsFor(runKey(sql)), (body, r) => renderSteps(body, sql, r, () => deps.show('explain')));
    },
  });
}

/** Chapter colour of the open ticket; chapterColor(0) is the neutral slate (no ticket). */
const ticketColor = () => chapterColor(selected()?.chapter ?? 0);

function registerChartTab(deps: VizDeps): void {
  registerTab({
    id: 'chart', from: 'ch2-02', newAt: 'ch2-02', // first task with several groups
    label: 'tab.chart',
    group: 'output',
    order: 20,
    render: (host) => {
      if (lastRunSql(host, deps) === undefined) return;
      const result = app.lastRun?.result;
      if (result) renderChart(host, result, ticketColor());
      else host.append(h('p', { class: 'muted' }, t('chart.runError')));
    },
  });
}

/** Public metadata plus the Sandbox imports (schema `sandbox`). */
const allMeta = (): Promise<ErMetadata> => {
  if (inDrill()) return erMeta('lab');
  const own = sandboxTables().length > 0 ? erMeta('sandbox') : Promise.resolve({ cols: [], cons: [] });
  return Promise.all([erMeta(domainSchemaName()), own]).then(([pub, mine]) => ({ cols: [...pub.cols, ...mine.cols], cons: [...pub.cons, ...mine.cons] }));
};

interface Scoped { tables: string[]; dropped: string[]; switchable: boolean }

/**
 * What the ER and Columns tabs show (ui-ux-v4 §4): with a task, its related tables (or every unlocked table, by the switch);
 * in Sandbox every visible table. Related tables are listed alphabetically, so nothing marks the ones the answer uses.
 */
function scoped(meta: ErMetadata): Scoped {
  const tk = activeTicket();
  if (inDrill()) {
    // L93: like a ticket, a drill opens on the tables its Solution reads (the same ones "Tables used" shows, L84), switch to all of lab.
    const lab = [...new Set(meta.cols.map((c) => c.table))].sort();
    const own = tk ? tablesIn(tk.steps[0].solution, lab) : [];
    const r = relatedTables(own, lab, meta.cons, 10, false);
    if (r.tables.length === 0 || app.schemaScope === 'all') return { tables: lab, dropped: [], switchable: r.tables.length > 0 };
    return { tables: [...r.tables].sort(), dropped: [], switchable: true };
  }
  const all = { tables: visibleTables(), dropped: [], switchable: false };
  if (!tk) return all;
  const r = relatedTables(tk.tables, unlockedTables(), meta.cons, 10, showsParents(tk));
  if (r.tables.length === 0) return all; // no `tables` in the ticket: nothing to scope to
  return app.schemaScope === 'all' ? { ...all, switchable: true } : { tables: [...r.tables].sort(), dropped: [...r.dropped].sort(), switchable: true };
}

/** Switch pressed by keyboard: the redraw replaces it, so the new button takes focus back. */
let refocus: 'task' | 'all' | undefined;
const SCOPE_BTN = 'px-2.5 py-1 text-sm aria-pressed:bg-accent aria-pressed:font-semibold aria-pressed:text-on-accent';

/** The "Related to this task | All unlocked tables" switch, and the hidden-tables line. */
function scopeBar(s: Scoped, deps: VizDeps): (Node | string)[] {
  if (!s.switchable) return [];
  const btn = (v: 'task' | 'all', label: string) => {
    const b = h('button', {
      type: 'button', class: SCOPE_BTN, 'aria-pressed': String(app.schemaScope === v),
      onclick: () => {
        app.schemaScope = v;
        refocus = v;
        deps.show(deps.active());
      },
    }, label);
    if (refocus === v) {
      refocus = undefined;
      queueMicrotask(() => b.focus()); // appended by the caller in the same task
    }
    return b;
  };
  return [
    h('div', { class: 'mb-2 flex flex-wrap gap-1', role: 'group', 'aria-label': t('erd.scope') }, btn('task', t('erd.scopeTask')), btn('all', t(inDrill() ? 'erd.scopeLab' : 'erd.scopeAll'))),
    ...nodes(s.dropped.length ? h('p', { class: 'text-sm text-muted' }, t('erd.dropped', { n: s.dropped.length, list: s.dropped.join(', ') })) : null),
  ];
}

function registerSchemaTabs(deps: VizDeps): void {
  registerTab({
    id: 'erd', from: 'ch3-01', newAt: 'ch3-01', // first join
    label: 'tab.erd',
    group: 'schema',
    order: 10,
    // Every name reaches Mermaid through mermaidName() (L36). Tables the last run used: bold border in the chapter colour.
    render: (host) => load(host, t('erd.reading'), allMeta(), (body, meta) => {
      const s = scoped(meta);
      body.append(...scopeBar(s, deps));
      const svg = erdSvg(erDefinition(meta.cols, meta.cons, s.tables, tablesInQuery(app.lastRun?.sql ?? '', s.tables), ticketColor().hex));
      const first = s.tables.find((x) => unlockedTables().includes(x));
      return load(body, t('erd.drawing'), svg, (fig, out) => {
        drawErd(fig, out);
        if (first) fig.append(h('p', { class: 'mb-0' }, h('a', { href: `${hashOf('data')}/${first}` }, t('erd.toData'))));
      });
    }),
  });
  registerTab({
    id: 'columns',
    label: 'tab.columns',
    group: 'schema',
    order: 20,
    render: (host) => load(host, t('erd.reading'), allMeta(), (body, meta) => {
      const s = scoped(meta);
      const drill = inDrill();
      const open = new Set(drill ? meta.cols.map((c) => c.table) : visibleTables()); // a drill: every lab table is open, so an FK names its parent
      const game = new Set(drill ? meta.cols.map((c) => c.table) : unlockedTables()); // imported Sandbox tables get no value lists
      body.append(...scopeBar(s, deps), h('div', { class: 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2' }, ...s.tables.map((table) => {
        const values = game.has(table) ? textValues(table, drill ? 'lab' : domainSchemaId()) : undefined;
        return h('div', {},
          h('h3', { class: 'm-0' }, table),
          h('ul', { class: 'mt-1 mb-2 list-none space-y-0.5 pl-2 text-sm' }, ...meta.cols.filter((c) => c.table === table).map((c) =>
            h('li', { class: 'flex flex-wrap items-center gap-1' }, h('code', {}, c.name), h('span', { class: 'muted' }, c.type), ...keyBadges(meta.cons, table, c.name, open),
              valuesLine(values, c.name, 'basis-full pl-2')))));
      })));
    }),
  });
  // Mermaid bakes the theme into the SVG: redraw when the app theme changes (switch or OS, src/theme.ts) while the tab is open.
  document.addEventListener(THEME_EVENT, () => {
    if (deps.active() === 'erd') deps.show('erd');
  });
}

/** Called once from main.ts, before the panel is created. */
export function registerVizTabs(deps: VizDeps): void {
  registerChartTab(deps);
  registerStepsTab(deps);
  registerPlanTabs(deps);
  registerSchemaTabs(deps);
}
