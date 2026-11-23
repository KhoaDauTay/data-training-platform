import type * as Content from '../content';
import type * as Dash from '../dashboard';
import type { Card } from '../dashboard';
import type { DomainId } from '../domains';
import type * as Domains from '../domains';
import type * as Home from '../home';
import type * as I18n from '../i18n';
import type * as Insights from '../insights';
import type * as Progress from '../progress';
import type * as Route from '../route';
import type * as SaveMod from '../save';
import type * as State from '../state';
import type * as Storage from '../storage';
import type * as Tickets from '../tickets';
import type { Ticket } from '../tickets';
import type * as Dom from './dom';
import type * as Icons from './icons';
import type { QueryResult } from '../db/run';
import type * as IvPrefs from '../interviewPrefs';
import type * as Mastery from '../mastery';
import type { Badge, SkillLevel } from '../mastery';
import { meText, type MeKey } from '../i18n/me';
import {
  calendar, dashFile, importDash as readDashFile, portfolioEntries, portfolioMd, strengths, topErrors, touchesSandbox,
  trySummary, pictureCards, type PortfolioEntry, type PortfolioLevels,
} from '../me';

/**
 * v16 "Của tôi" (I2 + I6, L142): the #/me page, skill map and badges (v24, L323: they replaced the certificates), portfolio
 * and the dashboard's file/picture exports. A lazy chunk
 * (budget `me`): it imports only types from main modules and gets every main value through `initMe` (Plan 6 U3).
 * The page reads the Save and device prefs only: no query, no seed, no domain switch.
 */
export interface MeDeps {
  h: typeof Dom.h; announce: typeof Dom.announce; icon: typeof Icons.icon; skillIcon: typeof Icons.skillIcon;
  t: typeof I18n.t; getLang: typeof I18n.getLang; locale: typeof I18n.locale;
  app: typeof State.app; persist: typeof State.persist; rerender: () => void;
  readJson: typeof Storage.readJson; writeJson: typeof Storage.writeJson;
  readErrors: typeof Insights.readErrors; readAttempts: typeof Insights.readAttempts;
  days: () => string[];
  /** V22-C (L210): this week's tasks and raised review cards, derived (src/goal.ts). */
  week: () => { tasks: number; reviews: number };
  loadTickets: typeof Content.loadTickets; loadDomain: typeof Content.loadDomain;
  chaptersOf: typeof Progress.chaptersOf; rankOf: typeof Progress.rankOf; SKILLS: typeof Progress.SKILLS;
  knownSkills: typeof Home.knownSkills; textOf: typeof Tickets.textOf;
  DOMAINS: typeof Domains.DOMAINS; DOMAIN_ID: typeof Domains.DOMAIN_ID; activeDomain: typeof Domains.activeDomain;
  domainSlot: typeof SaveMod.domainSlot; readDashboard: typeof Dash.readDashboard; MAX_CARDS: number;
  hashOf: typeof Route.hashOf; importedNames: () => Promise<string[]>;
  /** V19-D (L170): portfolio card pictures and take-homes. */
  run: (sql: string, dom: DomainId) => Promise<QueryResult>; cardBody: (c: Card, r: QueryResult) => HTMLElement; ranHere: (c: Card) => boolean;
  loadInterview: typeof Content.loadInterview; interviewPrefs: () => IvPrefs.InterviewPrefs; passedTakeHomes: typeof IvPrefs.passedTakeHomes;
  cls: { CARD: string; BTN_GO: string; BTN_SECONDARY: string; cx: (...p: (string | false | null | undefined)[]) => string };
  /** v24 (L323, L330–L334): skill map and badges (src/mastery.ts, main). */
  mastery: Pick<typeof Mastery, 'masteryOf' | 'badges' | 'engineLevels' | 'skillParts'>; today: () => string;
  moduleTitle: typeof Progress.moduleTitle; startToday: () => void;
  engineTrees: () => Readonly<Record<string, Parameters<typeof Mastery.engineLevels>[0]>> | undefined;
}
let d: MeDeps;
export const initMe = (deps: MeDeps): void => void (d = deps);

const m = (k: MeKey, p?: I18n.Params): string => meText(d.getLang(), k, p);
const NAME_KEY = 'cargo-query/me-name'; // device pref (v7 §5.2), never in the Save
const readName = (): string => {
  const v = d.readJson<unknown>(NAME_KEY);
  return typeof v === 'string' ? v.slice(0, 60) : '';
};
const isDrill = (id: string): boolean => id.startsWith('g-') || id.startsWith('e-'); // ENG-CORE (L220): Database Engine lessons are no tasks either
/** V19-D (L170): card pictures, the zip and the take-home file, a lazy chunk of their own (`me` is near its budget). */
const pngChunk = (): Promise<typeof import('./portfolioPng')> => import('./portfolioPng');

// ---------- domain content: loaded once, only for domains the player has played ----------

const state = new Map<DomainId, 'loading' | 'done' | 'failed'>();
const played = (id: DomainId): boolean => id === 'logistics' || d.app.save.completed.some((x) => d.DOMAIN_ID[id].test(x));
function ticketsOf(id: DomainId): Ticket[] | undefined {
  if (id === 'logistics') return d.loadTickets('logistics');
  if (!played(id)) return [];
  const s = state.get(id);
  if (s === 'done') return d.loadTickets(id);
  if (!s) {
    state.set(id, 'loading');
    d.loadDomain(id).then(() => state.set(id, 'done'), () => state.set(id, 'failed')).finally(() => d.rerender());
  }
  return s === 'failed' ? [] : undefined;
}

type ScopeId = DomainId | 'general';
/** `final`: the domain's last promotion review is passed (its badge, the old certificate's rule); `rank`: that review's step. */
interface Scope { scope: ScopeId; what: string; final: boolean; rank?: string; tickets: Ticket[] }
function scopes(): Scope[] {
  const lang = d.getLang();
  const done = new Set(d.app.save.completed);
  const out: Scope[] = d.DOMAINS.map((x) => {
    const ts = ticketsOf(x.id) ?? [];
    const last = ts.filter((t) => t.beat === 'boss').sort((a, b) => b.chapter - a.chapter)[0];
    return { scope: x.id, what: d.t(x.name), final: !!last && done.has(last.id), tickets: ts, rank: d.chaptersOf(x.id).at(-1)?.career[lang] };
  });
  out.push({ scope: 'general', what: '', final: false, tickets: [] });
  return out;
}

// ---------- pictures and files ----------

function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  d.h('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// ---------- the page ----------

const card = (...kids: (Node | string | null)[]): HTMLElement => d.h('section', { class: d.cls.cx(d.cls.CARD, 'space-y-3 p-5') }, ...kids);
const title = (text: string, icon: Icons.IconName): HTMLElement =>
  d.h('h2', { class: 'm-0 flex items-center gap-2 text-title' }, d.icon(icon, 'size-4 text-accent'), text); // U16: one step under the page's h1

function statsCard(): HTMLElement {
  const save = d.app.save;
  const sum = trySummary(d.readAttempts());
  const stat = (label: string, value: string) => d.h('div', { class: 'rounded-(--r-inset) bg-code p-3' },
    d.h('dt', { class: 'text-body-sm text-muted' }, label), d.h('dd', { class: 'm-0 text-heading font-extrabold tabular-nums' }, value));
  const num = (x: number, digits = 0) => x.toLocaleString(d.locale(), { maximumFractionDigits: digits });
  return card(
    d.h('div', { class: 'flex flex-wrap items-center gap-2' },
      d.h('p', { class: 'm-0 flex-1 text-body text-muted' }, m('intro')),
      d.h('span', { class: 'rounded-full bg-code px-2 py-0.5 text-caption font-semibold' }, m('deviceOnly'))),
    d.h('dl', { class: 'm-0 grid grid-cols-2 gap-3 sm:grid-cols-4' },
      stat(m('stat.done'), num(save.completed.filter((x) => !isDrill(x)).length)),
      stat(m('stat.first'), sum.passed ? `${num(Math.round(sum.first * 100))} %` : m('stat.none')),
      stat(m('stat.runs'), sum.passed ? num(sum.runs, 1) : m('stat.none')),
      stat(m('stat.hints'), num(Object.values(save.hintsUsed).reduce((a, b) => a + b, 0)))));
}

function skillsCard(all: Ticket[]): HTMLElement {
  const lang = d.getLang();
  const ids = d.SKILLS.map((s) => s.id);
  const list = strengths(d.knownSkills(d.app.save, all, ids), d.app.save.review);
  const row = (s: { id: string; box: number }) => {
    const skill = d.SKILLS.find((x) => x.id === s.id);
    return d.h('li', { class: 'grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 max-sm:grid-cols-[minmax(0,8rem)_1fr_4rem]' },
      d.h('a', { href: `${d.hashOf('learn')}/skill/${s.id}`, class: 'truncate text-body-sm', title: skill?.label[lang] ?? s.id }, skill?.label[lang] ?? s.id), // U33: the cut label in full
      d.h('span', { class: 'block h-2.5 rounded-full bg-code', 'aria-hidden': 'true' }, // U33: no card yet = the empty track only
        s.box ? d.h('span', { class: s.box <= 2 ? 'block h-full rounded-full bg-warn' : 'block h-full rounded-full bg-accent', style: `width:${s.box * 20}%` }) : null),
      d.h('span', { class: 'text-right text-body-sm text-muted tabular-nums' }, s.box ? m('skills.box', { box: s.box }) : m('skills.noCard')));
  };
  return card(title(m('skills.title'), 'sigma'),
    list.length
      ? d.h('div', {},
        d.h('p', { class: 'mt-0 mb-3 text-body-sm text-muted' }, m('skills.intro'), ' ',
          m('skills.sum', { solid: list.filter((s) => s.box >= 4).length, weak: list.filter((s) => s.box && s.box <= 2).length, n: list.length })),
        d.h('ul', { class: 'm-0 list-none space-y-2 p-0' }, ...list.slice(0, 8).map(row)),
        list.length > 8 ? d.h('details', { class: 'mt-2' }, d.h('summary', { class: 'cursor-pointer text-body-sm text-muted' }, m('skills.all', { n: list.length })),
          d.h('ul', { class: 'mt-2 mb-0 list-none space-y-2 p-0' }, ...list.slice(8).map(row))) : null)
      : d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('skills.none')));
}

const errLabel = (code: string): string => (ERR[`err.${code}`] ? m(`err.${code}` as MeKey) : m('err.other'));
const ERR: Record<string, true> = Object.fromEntries(['42703', '42P01', '42601', '42803', '42702', '42883', '42804', '22P02', '22012', '22007', '21000', '42P20'].map((c) => [`err.${c}`, true]));

function errorsCard(): HTMLElement {
  const top = topErrors(d.readErrors());
  return card(title(m('err.title'), 'alert'),
    top.length
      ? d.h('ol', { class: 'm-0 list-none space-y-1.5 p-0' }, ...top.map(([code, n]) => d.h('li', { class: 'flex flex-wrap items-baseline gap-x-2 text-body-sm' },
        d.h('span', { class: 'font-semibold' }, errLabel(code)),
        d.h('code', { class: 'rounded-(--r-chip) bg-code px-1.5 text-caption' }, code),
        d.h('span', { class: 'ml-auto text-muted tabular-nums' }, m('err.times', { n })))))
      : d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('err.none')));
}

function daysCard(): HTMLElement {
  const days = d.days();
  const weeks = 8;
  const cells = calendar(days, new Date(), weeks);
  const n = cells.filter((c) => c.on).length;
  return card(title(m('days.title', { w: weeks }), 'calendar'),
    d.h('div', { class: 'grid w-fit grid-flow-col grid-rows-7 gap-1', role: 'img', 'aria-label': m('days.label', { n, w: weeks }) },
      ...cells.map((c) => d.h('span', { class: c.on ? 'block size-3.5 rounded-sm bg-accent' : c.future ? 'block size-3.5 rounded-sm' : 'block size-3.5 rounded-sm bg-code ring-1 ring-line', title: c.day }))),
    d.h('p', { class: 'm-0 text-body-sm' }, m('days.total', { n: days.length })),
    d.h('p', { class: 'm-0 text-body-sm' }, m('days.week', { t: d.week().tasks, r: d.week().reviews })), // V22-C (L210)
    d.h('p', { class: 'm-0 text-caption text-muted' }, m('days.note')));
}

function nextCard(all: Ticket[]): HTMLElement {
  const lang = d.getLang();
  const weak = strengths(d.knownSkills(d.app.save, all, d.SKILLS.map((s) => s.id)), d.app.save.review).find((s) => s.box > 0 && s.box <= 3);
  const err = topErrors(d.readErrors(), 1)[0];
  const skill = weak && d.SKILLS.find((s) => s.id === weak.id);
  const link = (href: string, text: string) => d.h('a', { href, class: d.cls.cx(d.cls.BTN_SECONDARY, 'inline-flex px-4 py-1.5 text-body-sm no-underline') }, text);
  return card(title(m('next.title'), 'route'),
    skill ? d.h('p', { class: 'm-0 text-body-sm' }, m('next.skill', { skill: skill.label[lang], box: weak.box })) : null,
    err ? d.h('p', { class: 'm-0 text-body-sm' }, m('next.err', { what: errLabel(err[0]), code: err[0], n: err[1] })) : null,
    skill ? link(`${d.hashOf('learn')}/skill/${skill.id}`, m('next.go', { skill: skill.label[lang] }))
      : d.h('div', { class: 'space-y-2' }, d.h('p', { class: 'm-0 text-body-sm' }, m('next.none')), link(d.hashOf('learn'), m('next.start'))));
}

// ---------- v24 (L323): skill map and badges, derived on every draw ----------

const ENGINES = ['postgres', 'mongodb', 'dynamodb', 'design'];
const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];
const ENGINE_ICON: Record<string, Icons.IconName> = { postgres: 'engRelational', mongodb: 'engDocument', dynamodb: 'engKeyValue', design: 'engDesign' };
const DOMAIN_ICON: Record<string, Icons.IconName> = { logistics: 'anchor', ecommerce: 'box', finance: 'percent' };
const ENGINE_NAME: Record<string, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB' };
const engineName = (e: string): string => ENGINE_NAME[e] ?? m('eng.design');
const phone = (): boolean => typeof matchMedia === 'function' && !matchMedia('(min-width: 640px)').matches;

/** Four dots, filled vs ring (shape, not colour alone); the words are in the row's label. */
const dots = (level: number): HTMLElement => d.h('span', { class: 'flex shrink-0 gap-1', 'aria-hidden': 'true' },
  ...[1, 2, 3, 4].map((i) => d.h('span', { class: i <= level ? 'block size-2.5 rounded-full bg-accent' : 'block size-2.5 rounded-full ring-1 ring-line-strong ring-inset' })));
const dueChip = (): HTMLElement => d.h('span', { class: 'inline-flex shrink-0 items-center gap-1 rounded-(--r-chip) bg-warn-soft px-2 text-caption font-semibold text-ink normal-case tracking-normal' },
  d.icon('clockAlert', 'size-3.5'), m('map.due'));

interface Measured { levels: Map<string, SkillLevel>; parts: { n: number; skills: string[] }[]; engines?: Record<string, Mastery.EngineLevel[]>; badges: Badge[] }

/** NoSQL path drill ids: its chunk loads only once the player passed a path drill (else the badge is plainly not held). */
let pathIds: string[] | 'loading' | undefined;
function pathDrills(): string[] | undefined {
  if (Array.isArray(pathIds)) return pathIds;
  if (pathIds === undefined && d.app.save.completed.some((id) => id.startsWith('e-mg-d-'))) {
    pathIds = 'loading';
    import('../engineMongoPath').then((p) => { pathIds = p.path.drills.map((x) => x.id); }, () => { pathIds = undefined; }).finally(() => d.rerender());
  }
  return undefined;
}

function measure(list: Scope[]): Measured {
  const ids = d.SKILLS.map((s) => s.id);
  const trees = d.engineTrees();
  const completed = new Set(d.app.save.completed);
  const levels = d.mastery.masteryOf(d.app.save, d.loadTickets('logistics'), ids, d.today()); // L332: the learning path's tickets
  const parts = d.mastery.skillParts(d.SKILLS); // L330: route.yml's Parts replace this at integration
  const engines = trees && Object.fromEntries(Object.entries(trees).map(([e, t]) => [e, d.mastery.engineLevels(t, completed)]));
  const badges = d.mastery.badges({
    parts, levels, foundation: ids, perf: [], completed, engines: engines ?? {}, path: pathDrills(),
    domains: list.filter((s) => s.scope !== 'general').map((s) => ({ id: s.scope, done: s.final })),
  });
  return { levels, parts, engines, badges };
}

function skillMapCard(x: Measured): HTMLElement {
  const lang = d.getLang();
  const due = [...x.levels.values()].filter((s) => s.review).length;
  const row = (id: string): HTMLElement => {
    const s = x.levels.get(id)!;
    const label = d.SKILLS.find((k) => k.id === id)?.label[lang] ?? id;
    const words = m(s.review ? 'map.dueAria' : 'map.aria', { skill: label, level: m(`lv.${s.level}` as MeKey), n: s.level });
    return d.h('li', { class: 'flex min-h-8 items-center gap-2 max-sm:min-h-11', 'data-skill': id, 'data-level': String(s.level) },
      d.skillIcon(id, 'size-[18px] shrink-0 text-accent'),
      d.h('a', { href: `${d.hashOf('learn')}/skill/${id}`, class: d.cls.cx('min-w-0 flex-1 truncate text-body-sm', s.level ? 'font-semibold' : 'text-muted'), 'aria-label': words, title: words }, label),
      s.review ? dueChip() : null, dots(s.level));
  };
  const part = (p: { n: number; skills: string[] }): HTMLElement => {
    const k = p.skills.filter((id) => (x.levels.get(id)?.level ?? 0) >= 2).length;
    return d.h('details', { class: 'mb-3 break-inside-avoid', open: !phone() },
      d.h('summary', { class: 'flex min-h-8 cursor-pointer items-center gap-2 text-caption font-bold tracking-wide text-muted uppercase max-sm:min-h-11' },
        d.h('span', { class: 'flex-1' }, m('map.part', { n: p.n, title: d.moduleTitle(p.n, lang) })),
        p.skills.some((id) => x.levels.get(id)?.review) ? dueChip() : d.h('span', { class: 'font-normal tracking-normal normal-case tabular-nums' }, m('map.partSum', { k, n: p.skills.length }))),
      d.h('ul', { class: 'm-0 list-none p-0' }, ...p.skills.map(row)));
  };
  const cell = (e: string, lv: string): HTMLElement => {
    const l = x.engines?.[e]?.find((y) => y.level === lv);
    const state = !l?.n ? m('eng.empty') : l.done ? m('eng.done') : l.started ? m('eng.doing', { k: l.k, n: l.n }) : m('eng.none');
    const words = m('eng.cell', { engine: engineName(e), level: lv, state });
    return d.h('li', {
      class: d.cls.cx('flex min-w-0 items-center gap-1 rounded-(--r-inset) px-2 py-1 text-caption max-sm:size-[22px] max-sm:justify-center max-sm:p-0',
        l?.done ? 'bg-good-soft ring-1 ring-good ring-inset' : l?.started ? 'bg-accent-soft' : 'bg-surface-2'),
      'aria-label': words, title: words,
    }, d.h('b', { 'aria-hidden': 'true' }, d.h('span', { class: 'max-sm:hidden' }, 'L'), lv.slice(1)),
    d.h('span', { class: 'truncate text-muted max-sm:hidden', 'aria-hidden': 'true' }, state));
  };
  return d.h('section', { class: d.cls.cx(d.cls.CARD, 'space-y-3 p-5'), 'aria-labelledby': 'me-map', 'data-me': 'skill-map' },
    d.h('div', { class: 'flex flex-wrap items-center gap-3' },
      d.h('h2', { id: 'me-map', class: 'm-0 flex flex-1 items-center gap-2 text-title' }, d.icon('skillMap', 'size-4 text-accent'), m('map.title')),
      due ? d.h('button', { type: 'button', class: d.cls.cx(d.cls.BTN_GO, 'px-4 py-1.5 text-body-sm'), onclick: () => d.startToday() }, m('map.review', { n: due })) : null),
    d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('map.intro')),
    d.h('ul', { class: 'm-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-caption text-muted', 'aria-hidden': 'true' },
      ...[0, 1, 2, 3, 4].map((lv) => d.h('li', { class: 'flex items-center gap-1.5' }, dots(lv), m(`lv.${lv}` as MeKey))),
      d.h('li', { class: 'flex items-center gap-1.5' }, dueChip(), m('map.dueNote'))),
    d.h('div', { class: 'lg:columns-2 lg:gap-6 xl:columns-3' }, ...x.parts.map(part)),
    d.h('div', { class: 'space-y-2 border-t border-line pt-3' },
      d.h('h3', { class: 'm-0 text-caption font-bold tracking-wide text-muted uppercase' }, m('map.engines')),
      x.engines
        ? d.h('ul', { class: 'm-0 list-none space-y-2 p-0' }, ...ENGINES.map((e) => d.h('li', { class: 'flex flex-wrap items-center gap-2' },
          d.h('span', { class: 'flex w-40 items-center gap-2 text-body-sm font-semibold' }, d.icon(ENGINE_ICON[e], 'size-4 shrink-0 text-accent'), engineName(e)),
          d.h('ol', { class: 'm-0 grid min-w-0 flex-1 list-none grid-cols-5 gap-1 p-0 max-sm:flex max-sm:flex-none' }, ...LEVELS.map((lv) => cell(e, lv))))))
        : d.h('p', { class: 'm-0 text-body-sm text-muted', 'aria-live': 'polite' }, m('map.engineLoading'))));
}

function badgeName(b: Badge, list: Scope[]): { name: string; cond: string; icon: Icons.IconName } {
  switch (b.kind) {
    case 'part': return { name: m('badge.part', { n: b.n }), cond: m('badge.partIf', { n: b.n }), icon: 'badgePart' };
    case 'fast': return { name: m('badge.fast'), cond: m('badge.fastIf'), icon: 'badgeFast' };
    case 'foundation': return { name: m('badge.foundation'), cond: m('badge.foundationIf', { n: d.SKILLS.length }), icon: 'badgeFoundation' };
    case 'path': return { name: m('badge.path'), cond: m('badge.pathIf'), icon: 'nosqlPath' };
    case 'engine': return { name: m('badge.eng', { engine: engineName(b.engine), level: b.level }), cond: m('badge.engIf', { engine: engineName(b.engine), level: b.level }), icon: ENGINE_ICON[b.engine] };
    case 'domain': {
      const s = list.find((x) => x.scope === b.domain);
      const what = s?.what ?? b.domain;
      return { name: s?.rank ? m('badge.dom', { domain: what, rank: s.rank }) : what, cond: m('badge.domIf', { domain: what }), icon: DOMAIN_ICON[b.domain] ?? 'trophy' };
    }
  }
}

/** The sentence of the last badge pressed (role=status): its condition, held or not. */
let badgeSay = '';
function badgesCard(x: Measured, list: Scope[]): HTMLElement {
  const held = x.badges.filter((b) => b.have);
  const tile = (b: Badge, pre = ''): HTMLElement => { // pre: the phone's "held" row repeats a tile, ids stay unique
    const t = badgeName(b, list);
    const state = b.have ? m('badge.have') : m('badge.not');
    return d.h('li', {}, d.h('button', {
      type: 'button', 'aria-describedby': `badge-${pre}${b.id}`, title: `${t.cond} (${state})`, 'data-badge': b.id, 'data-have': String(b.have),
      class: d.cls.cx('flex h-full min-h-20 w-full flex-col items-center gap-1 rounded-(--r-inset) p-2 text-center text-caption', b.have ? 'bg-accent-soft font-semibold text-ink' : 'text-muted ring-1 ring-line ring-inset'),
      onclick: () => { badgeSay = `${t.name}: ${t.cond} (${state})`; d.rerender(); },
    }, d.icon(t.icon, d.cls.cx('size-6', b.have ? 'text-accent' : 'text-muted')), d.h('span', {}, t.name),
    d.h('span', { id: `badge-${pre}${b.id}`, class: 'sr-only' }, `${t.cond} (${state})`)));
  };
  const grid = (bs: Badge[], pre = ''): HTMLElement => d.h('ul', { class: 'm-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-[repeat(auto-fill,minmax(5rem,1fr))]' }, ...bs.map((b) => tile(b, pre)));
  const group = (key: MeKey, kinds: Badge['kind'][]): HTMLElement => d.h('div', { class: 'space-y-2' },
    d.h('h3', { class: 'm-0 text-caption font-bold tracking-wide text-muted uppercase' }, m(key)), grid(x.badges.filter((b) => kinds.includes(b.kind))));
  const groups = [group('badge.sql', ['part', 'fast', 'foundation']), group('badge.engine', ['engine', 'path']), group('badge.domain', ['domain'])];
  return d.h('section', { class: d.cls.cx(d.cls.CARD, 'space-y-3 p-5'), 'aria-labelledby': 'me-badges', 'data-me': 'badges' },
    d.h('h2', { id: 'me-badges', class: 'm-0 flex items-center gap-2 text-title' }, d.icon('badgePart', 'size-4 text-accent'), m('badge.title', { k: held.length, n: x.badges.length })),
    d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('badge.note')),
    ...(phone() // ux-route-v24 §6.3: on a phone the held ones first, the full list in place behind one button
      ? [held.length ? grid(held.slice(0, 8), 'held-') : d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('badge.none')),
        d.h('details', { class: 'space-y-3' }, d.h('summary', { class: d.cls.cx(d.cls.BTN_SECONDARY, 'inline-flex min-h-11 cursor-pointer items-center px-4 text-body-sm') }, m('badge.all', { n: x.badges.length })), ...groups)]
      : groups),
    d.h('p', { class: 'm-0 text-body-sm', role: 'status' }, badgeSay),
    d.h('p', { class: 'm-0 text-caption text-muted' }, m('badge.replaced')));
}

/** The portfolio's "current skill levels" section: skills at Can do or above, badges held (already worded). */
function levelsForPortfolio(x: Measured, list: Scope[]): PortfolioLevels {
  const lang = d.getLang();
  return {
    skills: d.SKILLS.flatMap((s) => {
      const l = x.levels.get(s.id);
      return l && l.level >= 2 ? [{ label: s.label[lang], level: m(`lv.${l.level}` as MeKey) }] : [];
    }),
    badges: x.badges.filter((b) => b.have).map((b) => badgeName(b, list).name),
  };
}

/** The portfolio line being built (one at a time) and the last sentence about it (role=status). */
let pfBusy: ScopeId | undefined;
let pfMsg = '';
function pfSay(msg: string): void {
  pfMsg = msg;
  d.announce(msg);
  d.rerender();
}

/**
 * V19-D (L170): a domain portfolio is a zip, README.md + cards/<id>.png (GitHub strips `data:` images in Markdown). Only
 * cards that ran on this device, are not marked slow and read no imported data are run again for a picture (imported SQL
 * never runs by itself, review-log Plan 5); the others keep their SQL only.
 */
async function savePortfolio(s: Scope & { scope: DomainId }, entries: PortfolioEntry[], levels: PortfolioLevels): Promise<void> {
  const dom = s.scope;
  const lang = d.getLang();
  pfBusy = dom;
  try {
    const imported = await d.importedNames(); // FIX-1: stored imports too, even before restore ends
    const cards = d.domainSlot(d.app.save, dom).dashboard.cards;
    const shoot = pictureCards(cards, imported, d.ranHere);
    const pp = await pngChunk();
    const pics = await pp.cardPictures(dom, shoot, {
      run: d.run, cardBody: d.cardBody, cardClass: d.cls.cx(d.cls.CARD, 'flex flex-col gap-3 p-4'), footer: m('png.footer'),
      onCard: (i) => pfSay(m('pf.shooting', { i: i + 1, n: shoot.length })),
    });
    const at = new Date();
    const md = portfolioMd({
      lang, scope: dom, what: s.what, name: readName(), date: at.toLocaleDateString(d.locale()), entries, cards, imported, pics: new Set(pics.keys()), levels,
    });
    download(`boondata-${dom}-portfolio.zip`, pp.portfolioZip(md, pics, at));
    pfBusy = undefined;
    pfSay(m('pf.saved', { n: entries.length, p: pics.size }));
  } catch {
    pfBusy = undefined;
    pfSay(m('pf.failed'));
  }
}

/** V19-D (L170): the take-homes the learner handed in, as one Markdown file; only on their own click (interviewPrefs). */
async function saveTakeHomes(): Promise<void> {
  const lang = d.getLang();
  pfBusy = 'general';
  try {
    const [content, pp, imported] = await Promise.all([d.loadInterview(), pngChunk(), d.importedNames()]);
    const prefs = d.interviewPrefs();
    const entries = d.passedTakeHomes(prefs).flatMap((r) => {
      const th = content.takeHomes.find((x) => x.id === r.id);
      if (!th) return [];
      const live = prefs.live[r.id]?.phase === 'done' ? prefs.live[r.id] : undefined; // a run started again holds drafts, not passed SQL
      return [{
        title: th.title[lang], brief: th.brief[lang], text: r.text,
        steps: th.steps.map((st) => {
          const sql = live?.passed[st.id];
          return { title: st.title[lang], ...(sql && !touchesSandbox(sql, imported) ? { sql } : {}) };
        }),
        rubric: th.rubric.map((line, i) => ({ line: line[lang], ticked: r.checks.includes(i) })),
      }];
    });
    const md = pp.takeHomeMd({ lang, name: readName(), date: new Date().toLocaleDateString(d.locale()), entries });
    download('boondata-take-home-portfolio.md', new Blob([md], { type: 'text/markdown' }));
    pfBusy = undefined;
    pfSay(m('pf.th.saved', { n: entries.length }));
  } catch {
    pfBusy = undefined;
    pfSay(m('pf.failed'));
  }
}

function portfolioCard(list: Scope[], x: Measured, waiting: boolean): HTMLElement {
  const lang = d.getLang();
  const go = (label: string, onclick: () => void, busy: boolean): HTMLElement =>
    d.h('button', { type: 'button', class: d.cls.cx(d.cls.BTN_GO, 'flex items-center gap-1.5 px-4 py-1.5 text-body-sm'), onclick, disabled: !!pfBusy, 'aria-busy': busy ? 'true' : false },
      d.icon('download', 'size-4'), label);
  const item = (s: Scope): HTMLElement | null => {
    if (s.scope === 'general') {
      const n = d.passedTakeHomes(d.interviewPrefs()).length;
      return n
        ? d.h('li', { class: 'flex flex-wrap items-center gap-3' }, go(m('pf.th.download'), () => void saveTakeHomes(), pfBusy === 'general'),
          d.h('span', { class: 'text-body-sm text-muted' }, m('pf.th.count', { n })))
        : d.h('li', { class: 'flex items-start gap-2 text-body-sm text-muted' }, d.icon('lock', 'mt-0.5 size-4 shrink-0'), // v21 U17: the icon stays beside its sentence
          d.h('span', {}, m('pf.th.none'), ' ', d.h('a', { href: `${d.hashOf('learn')}/interview` }, m('pf.th.go'))));
    }
    // v24 (L323): opens with one graded task of the domain, no final review needed
    const entries = portfolioEntries(s.tickets, d.app.save, (tk) => d.textOf(tk, lang));
    if (!entries.length) return d.h('li', { class: 'flex items-start gap-2 text-body-sm text-muted' }, d.icon('lock', 'mt-0.5 size-4 shrink-0'), d.h('span', {}, m('pf.locked', { domain: s.what })));
    const dom = { ...s, scope: s.scope };
    return d.h('li', { class: 'flex flex-wrap items-center gap-3' },
      go(m('pf.download', { domain: s.what }), () => void savePortfolio(dom, entries, levelsForPortfolio(x, list)), pfBusy === s.scope),
      d.h('span', { class: 'text-body-sm text-muted' }, m('pf.count', { n: entries.length })));
  };
  const name = d.h('input', {
    id: 'me-name', type: 'text', maxlength: '60', autocomplete: 'name', value: readName(),
    class: 'w-full max-w-sm rounded-(--r-ctl) border border-line bg-panel px-3 py-2 text-body text-ink',
    oninput: (e: Event) => d.writeJson(NAME_KEY, (e.target as HTMLInputElement).value.slice(0, 60)),
  });
  return card(title(m('pf.title'), 'book'),
    d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('pf.intro')),
    d.h('div', { class: 'space-y-1' },
      d.h('label', { for: 'me-name', class: 'block text-body-sm font-semibold' }, m('pf.name')), name,
      d.h('p', { class: 'm-0 text-caption text-muted' }, m('pf.nameNote'))),
    waiting ? d.h('p', { class: 'm-0 text-body-sm text-muted', 'aria-live': 'polite' }, m('loadingDomains')) : null,
    d.h('ul', { class: 'm-0 list-none space-y-2 p-0' }, ...list.map(item).filter((x): x is HTMLElement => !!x)),
    d.h('p', { class: 'm-0 text-body-sm', role: 'status' }, pfMsg));
}

/** The #/me page body (section `me` of <main id="home">), redrawn by rerender(). */
export function mePage(): HTMLElement {
  const list = scopes();
  const waiting = d.DOMAINS.some((x) => ticketsOf(x.id) === undefined);
  const all = list.flatMap((s) => s.tickets);
  const x = measure(list);
  return d.h('div', { class: 'space-y-6' },
    statsCard(),
    nextCard(all),
    skillsCard(all),
    d.h('div', { class: 'grid gap-6 md:grid-cols-2' }, errorsCard(), daysCard()),
    skillMapCard(x),
    badgesCard(x, list),
    portfolioCard(list, x, waiting),
    d.h('p', { class: 'm-0 text-caption text-muted' }, m('data.note')));
}

// ---------- dashboard: file export/import and card pictures (v7 §5.1) ----------

/** Downloads the open domain's cards (title, kind, SQL); cards on imported data stay out. Returns the sentence to show. */
export async function exportDash(): Promise<string> {
  const dom = d.activeDomain();
  const { file, dropped } = dashFile(dom, d.domainSlot(d.app.save, dom).dashboard.cards, await d.importedNames());
  if (file.cards.length) download(`boondata-${dom}.boondash.json`, new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
  return [file.cards.length ? m('dash.exported', { n: file.cards.length }) : m('dash.nothing'), dropped ? m('dash.dropped', { n: dropped }) : ''].join(' ').trim();
}

/** Opens the file picker; `done` gets the sentence to show (cards added at the end, never run by themselves). */
export function importDashFile(done: (msg: string) => void): void {
  const input = d.h('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    input.remove();
    if (!f || f.size > 1e6) return void (f && done(m('dash.badFile')));
    const dom = d.activeDomain();
    const slot = d.domainSlot(d.app.save, dom).dashboard;
    const r = readDashFile(await f.text(), dom, slot.cards, d.readDashboard, d.DOMAINS.map((x) => x.id));
    if ('error' in r) {
      const other = r.error === 'domain' ? d.t(d.DOMAINS.find((x) => x.id === r.domain)!.name) : '';
      return done(r.error === 'domain' ? m('dash.otherDomain', { domain: other }) : m('dash.badFile'));
    }
    slot.cards = r.cards;
    d.persist(true);
    done([m('dash.imported', { n: r.added }), r.skipped ? m('dash.full', { n: r.skipped, max: d.MAX_CARDS }) : ''].join(' ').trim());
  });
  document.body.append(input);
  input.click();
}

/** FIX-1 (L147): a share link never carries SQL that reads the player's imported tables (stored ones too) or `sandbox.`. */
export const readsImported = async (sql: string): Promise<boolean> => touchesSandbox(sql, await d.importedNames());

/** One card as a PNG (title, what the card shows, "BoonData · fictional data"); refused for cards on imported data. */
export async function cardPng(article: HTMLElement, c: Card): Promise<string> {
  if (touchesSandbox(c.sql, await d.importedNames())) return m('dash.pngSandbox');
  const blob = await (await pngChunk()).cardBlob(article, c, m('png.footer')); // V19-D: the drawing lives in the portfolioPng chunk
  if (!blob) return m('dash.pngWait');
  download(`boondata-${d.activeDomain()}-${c.id}.png`, blob);
  return m('dash.pngDone', { title: c.title });
}
