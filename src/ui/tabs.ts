import { t, type Key } from '../i18n';
import { gated, readTour, tabOpen } from '../onboarding';
import { visibleTickets } from '../progress';
import { app, done } from '../state';
import { cx } from '../theme';
import { markTabOpened, tourSlot } from './coach';
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
  /** v4 D-O4 (V9): for a beginner from the welcome screen the tab appears once this ticket is reached. */
  from?: string;
  render(host: HTMLElement): void | Promise<void>;
}

export interface Panel {
  show(id: string): void;
  /** Re-labels the tabs and re-renders the open one (language switch, new tables). */
  refresh(): void;
  readonly active: string;
}

/** Open tab (aria-selected): --text with a --accent underline, so the state is not colour alone (L23). */
const TAB = 'rounded-t-lg rounded-b-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-3 py-1.5 text-muted hover:bg-code aria-selected:border-accent aria-selected:font-bold aria-selected:text-ink';
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
      onclick: () => {
        markTabOpened(tab.id); // tour step 5: a tab opened by hand (setTicket's own show('columns') does not count)
        show(tab.id);
      },
    }));
  const bar = h('div', { class: 'mb-2.5 flex flex-wrap gap-1 border-b border-line max-sm:flex-nowrap max-sm:overflow-x-auto', role: 'tablist', 'data-i18n-aria': 'tab.list', 'aria-label': t('tab.list') }, ...buttons);
  host.replaceChildren(bar, tourSlot('panel'), body); // tour steps 3 and 5: above the tab body, never inside the result (v10 review)
  let active = tabs.some((x) => x.id === 'columns') ? 'columns' : tabs[0].id;

  bar.addEventListener('keydown', (e) => {
    const shown = buttons.filter((b) => !b.hidden); // tabs not open yet (D-O4) are skipped
    const i = shown.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const n = shown.length;
    const j = ({ ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 } as Record<string, number>)[e.key];
    if (j === undefined) return;
    e.preventDefault();
    shown[j].focus();
  });

  function label(): void {
    const reached = new Set(visibleTickets(app.tickets, done()).map((x) => x.id));
    const isGated = gated(readTour());
    tabs.forEach((tab, i) => {
      buttons[i].hidden = !tabOpen(tab.from, reached, isGated) && tab.id !== active; // a chip may still open it on purpose
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

/** Plan 1 tabs. `editorSql` = what Ctrl+Enter would run now, to flag a stale result. `bar`: the line above the result (Plan 5: run time, Pin). */
export function registerCoreTabs(editorSql: () => string, bar: () => Node | null = () => null): void {
  registerTab({
    id: 'result',
    label: 'tab.result',
    group: 'output',
    order: 10,
    render(host) {
      const run = app.lastRun;
      if (!run) {
        host.append(h('p', { class: 'muted' }, t('res.runFirst')));
        return;
      }
      if (editorSql().trim() !== run.sql.trim()) host.append(h('p', { class: 'stale', role: 'note' }, t('res.stale')));
      host.append(bar() ?? '', run.error !== undefined ? errorView(run.error) : renderResult(run.result!, run.mark));
    },
  });
}
