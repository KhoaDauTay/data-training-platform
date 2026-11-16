import { t, type Key } from '../i18n';
import { app, unlockedTables } from '../state';
import { coach } from './coach';
import { h } from './dom';
import { errorText, errorView } from './feedback';
import { renderResult } from './resultTable';

export type TabGroup = 'output' | 'query' | 'schema';
export interface TabSpec {
  id: string;
  label: Key;
  group: TabGroup;
  /** Position inside the group. */
  order: number;
  /** Ticket id where this tab gets a "new" badge (e.g. 'ch3-01' for EXPLAIN). */
  newAt?: string;
  render(host: HTMLElement): void | Promise<void>;
}

export interface Panel {
  show(id: string): void;
  /** Re-labels the tabs and re-renders the open one (language switch, new tables). */
  refresh(): void;
  readonly active: string;
}

const GROUPS: TabGroup[] = ['output', 'query', 'schema'];
const specs: TabSpec[] = [];

/** Plan 1b registers its tabs here. Must run before createPanel. */
export function registerTab(spec: TabSpec): void {
  specs.push(spec);
}

/** ARIA tablist: buttons built once, roving tabindex, ←/→/Home/End move focus, Enter/Space opens (manual activation). */
export function createPanel(host: HTMLElement): Panel {
  const tabs = [...specs].sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.order - b.order);
  const body = h('div', { class: 'tab-body', role: 'tabpanel', id: 'tabpanel', tabindex: '0' });
  const buttons = tabs.map((tab, i) =>
    h('button', {
      type: 'button',
      role: 'tab',
      id: `tab-${tab.id}`,
      'aria-controls': 'tabpanel',
      class: i > 0 && tab.group !== tabs[i - 1].group ? 'group-start' : '',
      onclick: () => show(tab.id),
    }));
  const bar = h('div', { class: 'tabs', role: 'tablist', 'data-i18n-aria': 'tab.list', 'aria-label': t('tab.list') }, ...buttons);
  host.replaceChildren(bar, body);
  let active = tabs.some((x) => x.id === 'columns') ? 'columns' : tabs[0].id;

  bar.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const n = buttons.length;
    const j = ({ ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 } as Record<string, number>)[e.key];
    if (j === undefined) return;
    e.preventDefault();
    buttons[j].focus();
  });

  function label(): void {
    tabs.forEach((tab, i) => {
      const on = tab.id === active;
      const b = buttons[i];
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      b.classList.toggle('on', on);
      b.replaceChildren(t(tab.label), tab.newAt === app.selectedId ? h('span', { class: 'new' }, t('tab.new')) : '');
    });
  }

  function show(id: string): void {
    active = tabs.some((x) => x.id === id) ? id : tabs[0].id;
    label();
    body.setAttribute('aria-labelledby', `tab-${active}`);
    // A fresh host per render: a slow async render of a tab left behind writes into a detached node.
    const target = h('div');
    body.replaceChildren(target);
    const tab = tabs.find((x) => x.id === active)!;
    void Promise.resolve()
      .then(() => tab.render(target))
      .catch((e: unknown) => target.replaceChildren(h('pre', { class: 'error' }, errorText(e))));
  }

  show(active);
  return {
    show,
    refresh: () => show(active),
    get active() {
      return active;
    },
  };
}

function schemaList(): HTMLElement {
  const tables = unlockedTables().filter((x) => app.columns[x]);
  if (tables.length === 0) return h('p', { class: 'muted' }, t('cols.loading'));
  return h('div', { class: 'schema-list' }, ...tables.map((table) =>
    h('div', {},
      h('h3', {}, table),
      h('ul', {}, ...app.columns[table].map((c) => h('li', {}, h('code', {}, c.name), ' ', h('span', { class: 'muted' }, c.type)))))));
}

/** Plan 1 tabs. `editorSql` = what Ctrl+Enter would run now, to flag a stale result. */
export function registerCoreTabs(editorSql: () => string): void {
  registerTab({
    id: 'result',
    label: 'tab.result',
    group: 'output',
    order: 10,
    render(host) {
      const run = app.lastRun;
      host.append(coach('panel') ?? '');
      if (!run) {
        host.append(h('p', { class: 'muted' }, t('res.runFirst')));
        return;
      }
      if (editorSql().trim() !== run.sql.trim()) host.append(h('p', { class: 'stale', role: 'note' }, t('res.stale')));
      host.append(run.error !== undefined ? errorView(run.error) : renderResult(run.result!, run.mark));
    },
  });
  registerTab({ id: 'columns', label: 'tab.columns', group: 'schema', order: 20, render: (host) => void host.append(schemaList()) });
}
