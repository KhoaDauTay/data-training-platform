import type * as Dom from './dom';
import type { IvTab } from '../route';

/**
 * v47 S4 (I5, L982): the one interview room's tab bar, SQL / PostgreSQL / MongoDB / DynamoDB, drawn at the top of both
 * bodies (the SQL sets in the `interview` chunk, the engine banks in `engineInterview`). Tabs are links (each is a hash, so
 * Back and a reload keep the tab), the open one `aria-current=page`. Types only from main modules (Plan 6 U3).
 */
const TABS: [IvTab, string][] = [['sql', 'SQL'], ['pg', 'PostgreSQL'], ['mg', 'MongoDB'], ['dy', 'DynamoDB']];
const LABEL = { vi: 'Chủ đề phỏng vấn', en: 'Interview topics' };

export function ivTabs(h: typeof Dom.h, open: IvTab, href: (tab: IvTab) => string, lang: 'vi' | 'en'): HTMLElement {
  return h('nav', { 'aria-label': LABEL[lang], 'data-iv-tabs': '', class: 'grid grid-cols-2 gap-1 rounded-(--r-ctl) bg-code p-1 sm:grid-cols-4' }, // 2 × 2 on phones, one row from 640
    ...TABS.map(([tab, name]) => h('a', {
      href: href(tab), 'aria-current': tab === open ? 'page' : false, 'data-iv-tab': tab,
      class: 'flex min-h-11 items-center justify-center rounded-(--r-inset) px-3 font-bold text-muted no-underline aria-[current=page]:bg-panel aria-[current=page]:text-ink aria-[current=page]:shadow-(--shadow-1)',
    }, name)));
}
