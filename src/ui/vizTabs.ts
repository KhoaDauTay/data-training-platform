import type { DbClient } from '../db/client';
import { t } from '../i18n';
import { app, unlockedTables } from '../state';
import { chapterColor } from '../theme';
import { erDefinition, loadErMetadata, tablesInQuery } from '../viz/erd';
import { memoByKey } from '../viz/memo';
import { flattenPlan, type Plan } from '../viz/plan';
import type { StepsResult } from '../viz/steps';
import { renderChart } from './chartView';
import { h } from './dom';
import { renderErd } from './erdView';
import { renderExplain } from './explainView';
import { errorView } from './feedback';
import { renderFlow } from './flowView';
import { renderSteps } from './stepsView';
import { registerTab } from './tabs';

export interface VizDeps {
  db: DbClient;
  /** Switches the bottom panel to a tab (Panel.show). */
  show(id: string): void;
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
  const body = h('div', {}, h('p', { class: 'muted' }, loading));
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

function registerPlanTabs(deps: VizDeps): void {
  const planFor = memoByKey((sql) => deps.db.explain(sql).then(flattenPlan));
  const withPlan = (draw: (host: HTMLElement, plan: Plan) => void) => (host: HTMLElement) => {
    const sql = lastRunSql(host, deps);
    return sql === undefined ? undefined : load(host, t('viz.explaining'), planFor(sql), draw);
  };
  registerTab({ id: 'explain', label: 'tab.explain', group: 'query', order: 20, render: withPlan(renderExplain) }); // newAt: Plan 4 (EXPLAIN is taught in ch11, L30/L35)
  registerTab({ id: 'flow', label: 'tab.flow', group: 'query', order: 30, render: withPlan(renderFlow) });
}

function registerStepsTab(deps: VizDeps): void {
  // Same idea as planFor: re-rendering (language switch, tab switch) never re-runs the sub-queries.
  // The parser download gets its own long budget first, so it never counts toward the steps timeout (L36).
  const stepsFor = memoByKey((sql) => deps.db.loadParser().then(() => deps.db.steps<StepsResult>(sql)));
  registerTab({
    id: 'steps',
    label: 'tab.steps',
    group: 'query',
    order: 10,
    render: (host) => {
      const sql = lastRunSql(host, deps);
      return sql === undefined
        ? undefined
        : load(host, t('steps.running'), stepsFor(sql), (body, r) => renderSteps(body, sql, r, () => deps.show('explain')));
    },
  });
}

function registerChartTab(deps: VizDeps): void {
  registerTab({
    id: 'chart',
    label: 'tab.chart',
    group: 'output',
    order: 20,
    newAt: 'ch2-01',
    render: (host) => {
      if (lastRunSql(host, deps) === undefined) return;
      const result = app.lastRun?.result;
      // Chapter colour of the open ticket; chapterColor(0) is the neutral slate (no ticket).
      const chapter = app.tickets.find((x) => x.id === app.selectedId)?.chapter ?? 0;
      if (result) renderChart(host, result, chapterColor(chapter));
      else host.append(h('p', { class: 'muted' }, t('chart.runError')));
    },
  });
}

function registerErdTab(deps: VizDeps): void {
  // Keyed by schema: Plan Import reuses the same cache with 'sandbox'.
  const erMetadata = memoByKey((schema) => loadErMetadata((sql) => deps.db.run(sql), schema));
  registerTab({
    id: 'erd',
    label: 'tab.erd',
    group: 'schema',
    order: 10,
    render: async (host) => {
      const tables = unlockedTables();
      const { cols, cons } = await erMetadata('public');
      await renderErd(host, erDefinition(cols, cons, tables, tablesInQuery(app.lastRun?.sql ?? '', tables)));
    },
  });
}

/** Called once from main.ts, before the panel is created. */
export function registerVizTabs(deps: VizDeps): void {
  registerChartTab(deps);
  registerStepsTab(deps);
  registerPlanTabs(deps);
  registerErdTab(deps);
}
