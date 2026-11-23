import { AXES, CMP_ENGINES, FACTS, fill, SCENARIOS, type CmpEngine, type Scenario, type Tier, type Txt } from '../engine/compare';
import type * as I18n from '../i18n';
import { cmpText, type CmpKey } from '../i18n/engineCompare';
import type { EngineDeps } from './engineView';
import type { PageSub } from './homeView';

/**
 * v28 E-CMP (L430): the "Which engine?" page (#/engine/compare): a label table (axis × engine), one card per axis with its
 * cells, evidence lines (measured here, or a docs page) and lessons, then twelve "which engine?" scenarios as questions.
 * Lazy chunk `engineCompare` (budget `engineCompare`), loaded by engineView; types only from main modules (Plan 6 U3).
 * Answers live in this module for the visit (0 XP, nothing saved).
 */
export interface CmpCtx {
  d: EngineDeps;
  inline(text: string): (Node | string)[];
  /** A lesson's title and hash (undefined: no such lesson in the index). */
  lesson(id: string): { title: string; hash: string } | undefined;
}
let c: CmpCtx;
export const initCompare = (ctx: CmpCtx): void => { c = ctx; };

const NAME: Record<CmpEngine, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB' };
const ICON = { postgres: 'engRelational', mongodb: 'engDocument', dynamodb: 'engKeyValue' } as const;
const TIER_CLS: Record<Tier, string> = { run: 'bg-good-soft text-ink', diff: 'bg-warn-soft text-ink', docs: 'bg-info-soft text-ink' };
const TIER_ICON = { run: 'run', diff: 'partial', docs: 'docsOnly' } as const;
const ct = (key: CmpKey, params?: I18n.Params): string => cmpText(c.d.getLang(), c.d.locale(), key, params);
const lang = (): 'vi' | 'en' => c.d.getLang();
/** A fact value as text: numbers in the reader's locale, strings as they are. */
const fmt = (v: string | number): string => (typeof v === 'number' ? v.toLocaleString(c.d.locale()) : v);
const txt = (t: Txt): (Node | string)[] => c.inline(fill(t[lang()], fmt));

const says = new Map<string, { pick?: number; say?: 'right' | 'wrong' | 'pick'; wrongs: number }>();
const stateOf = (id: string) => says.get(id) ?? says.set(id, { wrongs: 0 }).get(id)!;

export const subOf = (): PageSub => ({ title: ct('title'), trail: [{ href: c.d.hashOf('engine'), text: c.d.t('nav.engine') }] });

function tierChip(t: Tier): HTMLElement {
  return c.d.h('span', { class: c.d.cls.cx(c.d.cls.PILL, TIER_CLS[t], 'whitespace-nowrap') }, c.d.icon(TIER_ICON[t], 'size-4 shrink-0'), ct(`tier.${t}`));
}
const extLink = (href: string, text: string): HTMLElement => c.d.h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: 'inline-flex items-center gap-1.5' },
  c.d.icon('external', 'size-4 shrink-0'), text, c.d.h('span', { class: 'sr-only' }, ` (${ct('newTab')})`));
const host = (u: string): string => new URL(u).hostname.replace(/^www\./, '');

function factLine(id: string): HTMLElement | null {
  const f = FACTS[id];
  if (!f?.text) return null;
  const { h } = c.d;
  return h('li', { class: 'flex flex-col gap-1' }, h('span', {}, ...txt(f.text)),
    f.src === 'run' ? h('span', { class: 'flex items-center gap-1.5 text-caption text-muted' }, c.d.icon('run', 'size-4'), ct('measured'))
      : h('span', { class: 'text-caption' }, extLink(f.src, `${ct('fromDocs')}: ${host(f.src)}`)));
}

function axisCard(a: (typeof AXES)[number]): HTMLElement {
  const { h } = c.d;
  const head = `cmp-${a.id.toLowerCase()}`;
  const lessons = a.lessons.map((id) => c.lesson(id)).filter((x) => !!x);
  return h('section', { class: c.d.cls.cx(c.d.cls.CARD, 'flex flex-col gap-3 p-4 sm:p-5'), 'aria-labelledby': head, id: `${head}-card` },
    h('h3', { id: head, tabindex: '-1', class: 'm-0 text-title font-bold' }, `${a.id} · ${a.title[lang()]}`),
    h('p', { class: 'm-0 text-muted' }, a.ask[lang()]),
    h('ul', { class: 'm-0 grid list-none gap-3 p-0 lg:grid-cols-3' }, ...CMP_ENGINES.map((e) => h('li', { class: 'flex flex-col gap-2 rounded-(--r-inset) bg-surface-2 p-3', 'data-cell': `${a.id}-${e}` },
      h('span', { class: 'flex items-center gap-2 font-bold' }, c.d.icon(ICON[e], 'size-5 shrink-0 text-accent'), NAME[e]),
      tierChip(a.cells[e].tier),
      h('span', {}, ...txt(a.cells[e].text))))),
    a.facts.length ? h('div', {}, h('h4', { class: 'm-0 mb-1 text-body-sm font-bold' }, ct('evidence')),
      h('ul', { class: 'm-0 flex list-disc flex-col gap-2 pl-5 text-body-sm' }, ...a.facts.map(factLine))) : null,
    lessons.length ? h('div', {}, h('h4', { class: 'm-0 mb-1 text-body-sm font-bold' }, ct('lessons')),
      h('ul', { class: 'm-0 flex list-none flex-wrap gap-2 p-0' }, ...lessons.map((l) => h('li', {}, h('a', { href: l.hash, class: c.d.cls.cx(c.d.cls.PILL, 'bg-code text-ink no-underline') }, l.title))))) : null,
    h('p', { class: 'm-0 flex flex-wrap gap-x-4 gap-y-1 text-caption' }, h('span', { class: 'text-muted' }, `${ct('sources')}:`), ...a.sources.map((u) => extLink(u, host(u)))));
}

/** Axis × engine, one label per cell: the page's honesty at a glance (scrolls sideways inside its box on a phone). */
function summary(): HTMLElement {
  const { h } = c.d;
  return h('div', { class: 'overflow-x-auto' },
    h('table', { class: 'w-full min-w-[36rem] text-body-sm', 'data-cmp-summary': '' },
      h('caption', { class: 'sr-only' }, ct('summary')),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col', class: 'text-left' }, ct('axis')), ...CMP_ENGINES.map((e) => h('th', { scope: 'col', class: 'text-left' }, NAME[e])))),
      h('tbody', {}, ...AXES.map((a) => h('tr', {},
        h('th', { scope: 'row', class: 'text-left font-normal' }, h('button', { type: 'button', class: 'border-0 bg-transparent p-0 text-left text-accent underline', onclick: () => { const t = document.getElementById(`cmp-${a.id.toLowerCase()}`); t?.scrollIntoView(); t?.focus(); } }, `${a.id} · ${a.title[lang()]}`)),
        ...CMP_ENGINES.map((e) => h('td', {}, tierChip(a.cells[e].tier))))))));
}

function scenarioCard(s: Scenario, n: number): HTMLElement {
  const { h, cls } = c.d;
  const v = stateOf(s.id);
  const name = `cmp-${s.id}`;
  const showWhy = v.say === 'right' || (v.say === 'wrong' && v.wrongs >= 2);
  const status = h('p', { role: 'status', class: cls.cx('m-0 text-body-sm', v.say === 'right' ? 'good' : v.say ? 'bad' : '') },
    v.say === 'right' ? ct('right') : v.say === 'wrong' ? ct(showWhy ? 'wrongWhy' : 'wrong') : v.say === 'pick' ? ct('pick') : '');
  return h('li', { class: cls.cx(cls.CARD, 'p-4 sm:p-5'), 'data-scenario': s.id },
    h('fieldset', { class: 'm-0 flex flex-col gap-2 border-0 p-0' },
      h('legend', { class: 'mb-2 p-0' }, h('span', { class: 'block text-caption font-bold tracking-wider text-muted uppercase' }, ct('scenario', { n })),
        h('span', { class: 'font-bold' }, ...txt(s.q))),
      ...c.d.optionOrder(`cmp#${s.id}`, s.options.length).map((i) => h('label', {
        class: cls.cx('flex min-h-11 cursor-pointer items-center gap-2 rounded-(--r-ctl) px-3 py-1 hover:bg-accent-soft has-[:checked]:bg-accent-soft has-[:checked]:ring-2 has-[:checked]:ring-accent',
          v.say === 'right' && v.pick === i ? 'bg-good-soft ring-1 ring-good' : v.say === 'wrong' && v.pick === i ? 'bg-bad-soft ring-1 ring-line' : 'ring-1 ring-line'),
      }, h('input', { type: 'radio', name, value: String(i), 'data-ek': `${name}-${i}`, checked: v.pick === i, onchange: () => { v.pick = i; } }),
      h('span', {}, ...txt(s.options[i])))),
      h('div', { class: 'flex flex-wrap items-center gap-3' },
        h('button', {
          type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${name}-check`,
          onclick: () => {
            v.say = v.pick === undefined ? 'pick' : v.pick === s.answer ? 'right' : 'wrong';
            if (v.say === 'wrong') v.wrongs++;
            c.d.rerender();
          },
        }, ct('check')), status),
      showWhy ? h('div', { class: 'flex flex-col gap-2 rounded-(--r-inset) bg-surface-2 p-3 text-body-sm' }, h('p', { class: 'm-0' }, ...txt(s.why)),
        s.facts.length ? h('ul', { class: 'm-0 flex list-disc flex-col gap-2 pl-5' }, ...s.facts.map(factLine)) : null) : null));
}

export function comparePage(): HTMLElement {
  const { h } = c.d;
  const right = SCENARIOS.filter((s) => says.get(s.id)?.say === 'right').length;
  const tiers: Tier[] = ['run', 'diff', 'docs'];
  return h('div', { class: 'flex flex-col gap-8', 'data-cmp': '' },
    h('div', { class: 'flex flex-col gap-3' },
      h('p', { class: 'm-0 text-muted' }, ct('intro')),
      h('p', { class: 'm-0 text-body-sm' }, ct('dataset', { n: Number(FACTS.shop.values[0]) })),
      h('section', { 'aria-labelledby': 'cmp-legend' },
        h('h2', { id: 'cmp-legend', class: c.d.ui.GROUP_TITLE }, ct('legend')),
        h('ul', { class: 'm-0 flex list-none flex-col gap-2 p-0 text-body-sm' }, ...tiers.map((t) => h('li', { class: 'flex flex-wrap items-center gap-2' }, tierChip(t), h('span', {}, ct(`tier.${t}.line`))))))),
    h('section', { 'aria-labelledby': 'cmp-sum' }, h('h2', { id: 'cmp-sum', class: c.d.ui.GROUP_TITLE }, ct('summary')), summary()),
    h('section', { 'aria-labelledby': 'cmp-axes', class: 'flex flex-col gap-4' },
      h('h2', { id: 'cmp-axes', class: c.d.ui.GROUP_TITLE }, ct('axes')), ...AXES.map(axisCard)),
    h('section', { 'aria-labelledby': 'cmp-quiz', class: 'flex flex-col gap-3' },
      h('h2', { id: 'cmp-quiz', class: c.d.ui.GROUP_TITLE }, ct('quiz')),
      h('p', { class: 'm-0 text-muted' }, ct('quizIntro')),
      h('p', { class: 'm-0 text-body-sm font-bold', 'data-cmp-score': '' }, ct('score', { k: right, n: SCENARIOS.length })),
      h('ol', { class: 'm-0 flex list-none flex-col gap-4 p-0' }, ...SCENARIOS.map((s, i) => scenarioCard(s, i + 1)))),
    h('section', { 'aria-labelledby': 'cmp-bridge', class: 'flex flex-col gap-2' },
      h('h2', { id: 'cmp-bridge', class: c.d.ui.GROUP_TITLE }, ct('bridge')),
      h('p', { class: 'm-0' }, ct('bridgeLine')),
      h('p', { class: 'm-0' }, h('a', { href: c.d.hashOf('learn'), class: c.d.cls.cx(c.d.cls.BTN_SECONDARY, 'inline-flex px-4 py-1.5 no-underline') }, ct('back')))));
}
