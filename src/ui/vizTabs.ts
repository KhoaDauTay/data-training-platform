import type { DbClient } from '../db/client';
import { t } from '../i18n';
import { app } from '../state';
import { memoByKey } from '../viz/memo';
import { flattenPlan, type Plan } from '../viz/plan';
import { h } from './dom';
import { renderExplain } from './explainView';
import { errorView } from './feedback';
import { renderFlow } from './flowView';
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

/** Called once from main.ts, before the panel is created. */
export function registerVizTabs(deps: VizDeps): void {
  registerPlanTabs(deps);
}
