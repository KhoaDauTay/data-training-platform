import { t, type Key } from '../i18n';
import { app } from '../state';
import { cx } from '../theme';
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

/** Underline colour on the open tab (aria-selected): blue-700 on white 6.7:1, blue-300 on the dark panel 9:1. */
const TAB = 'rounded-t-lg rounded-b-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-3 py-1.5 text-muted hover:bg-code aria-selected:border-blue-600 aria-selected:font-semibold aria-selected:text-blue-700 dark:aria-selected:border-blue-400 dark:aria-selected:text-blue-300';
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
      class: cx(TAB, i > 0 && tab.group !== tabs[i - 1].group && 'ml-4'),
      onclick: () => show(tab.id),
    }));
  const bar = h('div', { class: 'mb-2.5 flex flex-wrap gap-1 border-b border-line max-sm:flex-nowrap max-sm:overflow-x-auto', role: 'tablist', 'data-i18n-aria': 'tab.list', 'aria-label': t('tab.list') }, ...buttons);
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
      b.replaceChildren(t(tab.label), tab.newAt === app.selectedId ? h('span', { class: 'ml-1.5 rounded bg-accent px-1 text-[11px] text-on-accent' }, t('tab.new')) : '');
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
}
