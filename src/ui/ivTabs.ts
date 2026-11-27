import type * as Dom from './dom';
import type { IvTab } from '../route';

/**
 * v47 S4 (I5, L982): the one interview room's tab bar, SQL / PostgreSQL / MongoDB / DynamoDB, drawn at the top of both
 * bodies (the SQL sets in the `interview` chunk, the engine banks in `engineInterview`). Tabs are links (each is a hash, so
 * Back and a reload keep the tab), the open one `aria-current=page`. Types only from main modules (Plan 6 U3).
 */
/** v48 (L1145): a fifth tab "Khác / More" holds the seven tracks' banks (Redis, Time-series, OLAP, Search, Telemetry, Streaming, Graph). */
const TABS: [IvTab, string | { vi: string; en: string }][] = [['sql', 'SQL'], ['pg', 'PostgreSQL'], ['mg', 'MongoDB'], ['dy', 'DynamoDB'], ['more', { vi: 'Khác', en: 'More' }]];
const LABEL = { vi: 'Chủ đề phỏng vấn', en: 'Interview topics' };

export function ivTabs(h: typeof Dom.h, open: IvTab, href: (tab: IvTab) => string, lang: 'vi' | 'en'): HTMLElement {
  return h('nav', { 'aria-label': LABEL[lang], 'data-iv-tabs': '', class: 'grid grid-cols-2 gap-1 rounded-(--r-ctl) bg-code p-1 sm:grid-cols-5' }, // 2 + 2 + 1 wide on phones, one row from 640
    ...TABS.map(([tab, name]) => h('a', {
      href: href(tab), 'aria-current': tab === open ? 'page' : false, 'data-iv-tab': tab,
      class: 'flex min-h-11 items-center justify-center rounded-(--r-inset) px-2 font-bold text-muted no-underline last:max-sm:col-span-2 aria-[current=page]:bg-panel aria-[current=page]:text-ink aria-[current=page]:shadow-(--shadow-1)',
    }, typeof name === 'string' ? name : name[lang])));
}
