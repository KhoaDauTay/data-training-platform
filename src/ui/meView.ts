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
import type { Drill } from '../general';
import { meText, type MeKey } from '../i18n/me';
import { calendar, portfolioEntries, nextSkill, topErrors, trySummary, type PortfolioEntry, type PortfolioLevels } from '../me';

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
  mastery: Pick<typeof Mastery, 'masteryOf' | 'badges' | 'engineLevels' | 'perfDrills' | 'FAST_PART' | 'DRILL_KINDS'>; today: () => string;
  /** v24 integration (L330): the skill map's Parts and skills come from content/general/route.yml; perf drills from the General chunk. */
  ROUTE_PARTS: typeof Progress.PARTS; ALL_PARTS: typeof Progress.ALL_PARTS; ROUTE_SKILLS: typeof Progress.ROUTE_SKILLS;
  generalNow: typeof Content.generalNow; loadGeneral: typeof Content.loadGeneral;
  moduleTitle: typeof Progress.moduleTitle; startToday: () => void;
  engineTrees: () => Readonly<Record<string, Parameters<typeof Mastery.engineLevels>[0]>> | undefined;
  /** v43 (L722): the PostgreSQL Extensions shelf, a plain k/n line (no level, no badge). */
  engineExt: () => { done: number; total: number } | undefined;
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
/**
 * v33 (L536): the exports (portfolio, take-home file, dashboard card file, card pictures, the share guard) are their own lazy
 * chunk (`meExport`), loaded on the first click that needs one; a failed load is retried by the next click, never in a loop.
 */
type Exp = typeof import('./meExport');
let exp: Promise<Exp> | undefined;
const exporter = (): Promise<Exp> => (exp ??= import('./meExport').then((x) => (x.initExport(d, readName), x), (e: unknown) => {
  exp = undefined;
  throw e;
}));

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

const ERR = ['42703', '42P01', '42601', '42803', '42702', '42883', '42804', '22P02', '22012', '22007', '21000', '42P20'] as const;
const errLabel = (code: string): string => (ERR.includes(code as (typeof ERR)[number]) ? m(`err.${code as (typeof ERR)[number]}`) : m('err.other'));

function errorsCard(): HTMLElement {
  const top = topErrors(d.readErrors());
  const wrong = trySummary(d.readAttempts()).wrong;
  return card(title(m('err.title'), 'alert'),
    top.length
      ? d.h('ol', { class: 'm-0 list-none space-y-1.5 p-0' }, ...top.map(([code, n]) => d.h('li', { class: 'flex flex-wrap items-baseline gap-x-2 text-body-sm' },
        d.h('span', { class: 'font-semibold' }, errLabel(code)),
        d.h('code', { class: 'rounded-(--r-chip) bg-code px-1.5 text-caption' }, code),
        d.h('span', { class: 'ml-auto text-muted tabular-nums' }, m('err.times', { n })))))
      : d.h('p', { class: 'm-0 text-body-sm text-muted' }, m('err.none')),
    d.h('p', { class: 'm-0 text-body-sm' }, m('err.wrong', { n: wrong }))); // L312: a wrong result is no Postgres error
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

function nextCard(x: Measured): HTMLElement {
  const lang = d.getLang();
  const id = nextSkill(d.ROUTE_SKILLS.map((s) => s.id), x.levels);
  const skill = id ? d.ROUTE_SKILLS.find((s) => s.id === id) : undefined;
  const lv = id ? x.levels.get(id) : undefined;
  const err = topErrors(d.readErrors(), 1)[0];
  const link = (href: string, text: string) => d.h('a', { href, class: d.cls.cx(d.cls.BTN_SECONDARY, 'inline-flex px-4 py-1.5 text-body-sm no-underline') }, text);
  const none = [...x.levels.values()].every((s) => !s.level);
  return card(title(m('next.title'), 'route'),
    skill && lv ? d.h('p', { class: 'm-0 text-body-sm' }, m(lv.review ? 'next.due' : 'next.skill', { skill: skill.label[lang], level: m(`lv.${lv.level}`) })) : null,
    err ? d.h('p', { class: 'm-0 text-body-sm' }, m('next.err', { what: errLabel(err[0]), code: err[0], n: err[1] })) : null,
    skill ? link(`${d.hashOf('learn')}/skill/${skill.id}`, m('next.go', { skill: skill.label[lang] }))
      : d.h('div', { class: 'space-y-2' }, d.h('p', { class: 'm-0 text-body-sm' }, none ? m('next.empty', { n: d.mastery.DRILL_KINDS.length }) : m('next.none')), link(d.hashOf('learn'), m('next.start'))));
}

// ---------- v24 (L323): skill map and badges, derived on every draw ----------

const ENGINES = ['postgres', 'mongodb', 'dynamodb', 'redis', 'design', 'stack', 'olap', 'search', 'timeseries', 'telemetry', 'graph', 'stream'];
const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];
/** The levels a track has (mastery.ts levelsOf, inlined: this chunk takes no value from main): stack and olap L1–L3, redis L1–L2 (v47 L956, L990). */
const TOP: Record<string, string> = { stack: 'L3', redis: 'L2', olap: 'L3', search: 'L3', timeseries: 'L3', telemetry: 'L3', stream: 'L3' };
const ENGINE_ICON: Record<string, Icons.IconName> = { postgres: 'engRelational', mongodb: 'engDocument', dynamodb: 'engKeyValue', redis: 'engRedis', design: 'engDesign', stack: 'engStack', olap: 'engOlap', search: 'engSearch', timeseries: 'engTimeseries', telemetry: 'engTelemetry', graph: 'engGraph', stream: 'engStream' };
const DOMAIN_ICON: Record<string, Icons.IconName> = { logistics: 'anchor', ecommerce: 'box', finance: 'percent' };
const ENGINE_NAME: Record<string, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB', redis: 'Redis', olap: 'OLAP & ClickHouse', telemetry: 'Telemetry & Observability', graph: 'Graph', stream: 'Streaming & CDC' };
const engineName = (e: string): string => ENGINE_NAME[e] ?? m(e === 'stack' ? 'eng.stack' : e === 'timeseries' ? 'eng.timeseries' : e === 'search' ? 'eng.search' : 'eng.design');
const phone = (): boolean => typeof matchMedia === 'function' && !matchMedia('(min-width: 640px)').matches;

/** Four dots, filled vs ring (shape, not colour alone); the words are in the row's label. */
const dots = (level: number): HTMLElement => d.h('span', { class: 'flex shrink-0 gap-1', 'aria-hidden': 'true' },
  ...[1, 2, 3, 4].map((i) => d.h('span', { class: i <= level ? 'block size-2.5 rounded-full bg-accent' : 'block size-2.5 rounded-full ring-1 ring-line-strong' })));
const dueChip = (): HTMLElement => d.h('span', { class: 'inline-flex shrink-0 items-center gap-1 rounded-(--r-chip) bg-warn-soft px-2 text-caption font-semibold text-ink' },
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

/** General drills (for the performance bars): the chunk loads only once the player passed a General drill (else no bar is passed). */
let generalLoading = false;
function generalDrills(): Drill[] | undefined {
  const g = d.generalNow();
  if (g) return g.drills;
  if (!generalLoading && d.app.save.completed.some((id) => id.startsWith('g-'))) {
    generalLoading = true;
    d.loadGeneral().then(() => d.rerender(), () => undefined).finally(() => { generalLoading = false; });
  }
  return undefined;
}

function measure(list: Scope[]): Measured {
  const ids = d.ROUTE_SKILLS.map((s) => s.id);
  const trees = d.engineTrees();
  const completed = new Set(d.app.save.completed);
  const parts = d.ROUTE_PARTS; // L330: the Parts of content/general/route.yml
  const drills = generalDrills() ?? [];
  const levels = d.mastery.masteryOf(d.app.save, d.loadTickets('logistics'), ids, d.today(), d.mastery.perfDrills(drills)); // L332: the learning path's tickets
  const fast = d.mastery.perfDrills(drills, parts.find((p) => p.n === d.mastery.FAST_PART)?.skills ?? []);
  const engines = trees && Object.fromEntries(Object.entries(trees).map(([e, t]) => [e, d.mastery.engineLevels(t, completed)]));
  // Every Part of route.yml has its badge (37 in all, ux-route-v24 §6.3); a Part whose skills have not shipped yet (Part 9 until
  // R2) has an empty set and is never held (L333), while the skill map draws only the Parts with skills (L336).
  const badgeParts = d.ALL_PARTS.map((p) => ({ n: p.n, skills: p.skills.filter((id) => ids.includes(id)) }));
  const badges = d.mastery.badges({
    parts: badgeParts, levels, foundation: d.SKILLS.map((s) => s.id), perf: fast, completed, engines: engines ?? {}, path: pathDrills(),
    domains: list.filter((s) => s.scope !== 'general').map((s) => ({ id: s.scope, done: s.final })),
  });
  return { levels, parts, engines, badges };
}

function extLine(): HTMLElement | null {
  const p = d.engineExt();
  return p?.total ? d.h('p', { class: 'm-0 flex items-center gap-2 text-body-sm', 'data-me': 'ext' }, d.icon('puzzle', 'size-4 shrink-0 text-accent'), m('map.ext', { k: p.done, n: p.total })) : null;
}

function skillMapCard(x: Measured): HTMLElement {
  const lang = d.getLang();
  const due = [...x.levels.values()].filter((s) => s.review).length;
  const row = (id: string): HTMLElement => {
    const s = x.levels.get(id)!;
    const label = d.ROUTE_SKILLS.find((k) => k.id === id)?.label[lang] ?? id;
    const words = m(s.review ? 'map.dueAria' : 'map.aria', { skill: label, level: m(`lv.${s.level}`), n: s.level });
    return d.h('li', { class: 'flex min-h-9 items-center gap-2', 'data-skill': id, 'data-level': String(s.level) },
      d.skillIcon(id, 'size-4 shrink-0 text-accent'),
      d.h('a', { href: `${d.hashOf('learn')}/skill/${id}`, class: d.cls.cx('min-w-0 flex-1 truncate text-body-sm', s.level ? 'font-semibold' : 'text-muted'), 'aria-label': words, title: words }, label),
      s.review ? dueChip() : null, dots(s.level));
  };
  const part = (p: { n: number; skills: string[] }): HTMLElement => {
    const k = p.skills.filter((id) => (x.levels.get(id)?.level ?? 0) >= 2).length;
    return d.h('details', { class: 'mb-3', open: !phone() },
      d.h('summary', { class: 'flex min-h-9 cursor-pointer items-center gap-2 text-caption font-bold text-muted' },
        d.h('span', { class: 'flex-1' }, m('map.part', { n: p.n, title: d.moduleTitle(p.n, lang) })),
        p.skills.some((id) => x.levels.get(id)?.review) ? dueChip() : d.h('span', { class: 'font-normal tabular-nums' }, m('map.partSum', { k, n: p.skills.length }))),
      d.h('ul', { class: 'm-0 list-none p-0' }, ...p.skills.map(row)));
  };
  const cell = (e: string, lv: string): HTMLElement => {
    const l = x.engines?.[e]?.find((y) => y.level === lv);
    const state = !l?.n ? m('eng.empty') : l.done ? m('eng.done') : l.started ? m('eng.doing', { k: l.k, n: l.n }) : m('eng.none');
    const words = m('eng.cell', { engine: engineName(e), level: lv, state });
    return d.h('li', {
      class: d.cls.cx('flex min-w-0 items-center gap-1 rounded-(--r-inset) px-2 py-1 text-caption max-sm:justify-center',
        l?.done ? 'bg-good-soft ring-1 ring-good' : l?.started ? 'bg-accent-soft' : 'bg-surface-2'),
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
      ...([0, 1, 2, 3, 4] as const).map((lv) => d.h('li', { class: 'flex items-center gap-1.5' }, dots(lv), m(`lv.${lv}`))),
      d.h('li', { class: 'flex items-center gap-1.5' }, dueChip(), m('map.dueNote'))),
    d.h('div', { class: 'grid gap-x-6 lg:grid-cols-2' }, ...x.parts.map(part)), // ponytail: 2 columns from 1024; xl 3 columns would add CSS past the 20 KB budget
    d.h('div', { class: 'space-y-2 border-t border-line pt-3' },
      d.h('h3', { class: 'm-0 text-caption font-bold tracking-wide text-muted uppercase' }, m('map.engines')),
      x.engines
        ? d.h('ul', { class: 'm-0 list-none space-y-2 p-0' }, ...ENGINES.map((e) => d.h('li', { class: 'flex flex-wrap items-center gap-2' },
          d.h('span', { class: 'flex w-40 items-center gap-2 text-body-sm font-semibold' }, d.icon(ENGINE_ICON[e], 'size-4 shrink-0 text-accent'), engineName(e)),
          d.h('ol', { class: 'm-0 grid min-w-0 flex-1 list-none grid-cols-5 gap-1 p-0' }, ...LEVELS.filter((lv) => lv <= (TOP[e] ?? 'L5')).map((lv) => cell(e, lv))))))
        : d.h('p', { class: 'm-0 text-body-sm text-muted', 'aria-live': 'polite' }, m('map.engineLoading')),
      extLine()));
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
      class: d.cls.cx('flex h-full w-full flex-col items-center gap-1 rounded-(--r-inset) p-2 text-center text-caption', b.have ? 'bg-accent-soft font-semibold text-ink' : 'border border-dashed border-line-strong text-muted'), // F23: not held = dashed, faded icon
      onclick: () => { badgeSay = `${t.name}: ${t.cond} (${state})`; d.rerender(); },
    }, d.icon(t.icon, d.cls.cx('size-6', b.have ? 'text-accent' : 'text-muted opacity-40')), d.h('span', {}, t.name),
    d.h('span', { id: `badge-${pre}${b.id}`, class: b.have ? 'sr-only' : 'font-normal max-sm:sr-only' }, `${t.cond} (${state})`)));
  };
  const grid = (bs: Badge[], pre = ''): HTMLElement => d.h('ul', { class: 'm-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-6' }, ...bs.map((b) => tile(b, pre)));
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
      return l && l.level >= 2 ? [{ label: s.label[lang], level: m(`lv.${l.level}`) }] : [];
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

/** V19-D (L170): one portfolio file at a time (the chunk builds it; its sentence, or pf.failed, goes in the status line). */
async function fileJob(scope: ScopeId, job: (x: Exp) => Promise<string>): Promise<void> {
  pfBusy = scope;
  let msg: string;
  try {
    msg = await job(await exporter());
  } catch {
    msg = m('pf.failed');
  }
  pfBusy = undefined;
  pfSay(msg);
}

function portfolioCard(list: Scope[], x: Measured, waiting: boolean): HTMLElement {
  const lang = d.getLang();
  const go = (label: string, onclick: () => void, busy: boolean): HTMLElement =>
    d.h('button', { type: 'button', class: d.cls.cx(d.cls.BTN_SECONDARY, 'flex items-center gap-1.5 px-4 py-1.5 text-body-sm'), onclick, disabled: !!pfBusy, 'aria-busy': busy ? 'true' : false },
      d.icon('download', 'size-4'), label);
  const item = (s: Scope): HTMLElement | null => {
    if (s.scope === 'general') {
      const n = d.passedTakeHomes(d.interviewPrefs()).length;
      return n
        ? d.h('li', { class: 'flex flex-wrap items-center gap-3' }, go(m('pf.th.download'), () => void fileJob('general', (x) => x.saveTakeHomes()), pfBusy === 'general'),
          d.h('span', { class: 'text-body-sm text-muted' }, m('pf.th.count', { n })))
        : d.h('li', { class: 'flex items-start gap-2 text-body-sm text-muted' }, d.icon('lock', 'mt-0.5 size-4 shrink-0'), // v21 U17: the icon stays beside its sentence
          d.h('span', {}, m('pf.th.none'), ' ', d.h('a', { href: `${d.hashOf('learn')}/interview` }, m('pf.th.go'))));
    }
    // v24 (L323): opens with one graded task of the domain, no final review needed
    const entries = portfolioEntries(s.tickets, d.app.save, (tk) => d.textOf(tk, lang));
    if (!entries.length) return d.h('li', { class: 'flex items-start gap-2 text-body-sm text-muted' }, d.icon('lock', 'mt-0.5 size-4 shrink-0'), d.h('span', {}, m('pf.locked', { domain: s.what })));
    const dom = { ...s, scope: s.scope };
    return d.h('li', { class: 'flex flex-wrap items-center gap-3' },
      go(m('pf.download', { domain: s.what }), () => void fileJob(dom.scope, (e) => e.savePortfolio(dom.scope, s.what, entries, levelsForPortfolio(x, list), pfSay)), pfBusy === s.scope),
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
  const x = measure(list);
  return d.h('div', { class: 'space-y-6' },
    statsCard(),
    nextCard(x),
    d.h('div', { class: 'grid gap-6 md:grid-cols-2' }, errorsCard(), daysCard()),
    skillMapCard(x),
    badgesCard(x, list),
    portfolioCard(list, x, waiting),
    d.h('p', { class: 'm-0 text-caption text-muted' }, m('data.note')));
}

// ---------- dashboard: file export/import and card pictures (v7 §5.1) ----------

// v33 (L536): the work is in the lazy meExport chunk; these keep the names ui/dashboard.ts and ui/modes.ts call.
/** Downloads the open domain's cards (title, kind, SQL); cards on imported data stay out. Returns the sentence to show. */
export const exportDash = async (): Promise<string> => (await exporter()).exportDash();

/**
 * Opens the file picker inside the click (the chunk is loaded only once a file is picked, so the picker never waits for the
 * network); `done` gets the sentence to show (cards added at the end, never run by themselves).
 */
export function importDashFile(done: (msg: string) => void): void {
  const input = d.h('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
  input.addEventListener('change', () => {
    const f = input.files?.[0];
    input.remove();
    exporter().then((x) => x.importDashFile(f)).then((msg) => msg && done(msg), () => done(d.t('me.failed')));
  });
  document.body.append(input);
  input.click();
}

/** FIX-1 (L147): a share link never carries SQL that reads the player's imported tables (stored ones too) or `sandbox.`; undefined = unsure. */
export const readsImported = (sql: string): Promise<boolean | undefined> => exporter().then((x) => x.readsImported(sql), () => undefined);

/** One card as a PNG (title, what the card shows, "BoonData · fictional data"); refused for cards on imported data. */
export const cardPng = async (article: HTMLElement, c: Card): Promise<string> => (await exporter()).cardPng(article, c);
