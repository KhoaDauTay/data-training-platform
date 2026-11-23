import type { AdvNode, Drill, General } from '../general';
import type { Params } from '../i18n';
import { learnText, type LearnKey } from '../i18n/learn';
import { CHALLENGE_XP, moduleState, nodeState, placementItems, skillState, stamper, type LearnCtx } from '../learn';
import type { Skill } from '../progress';
import type { DrillDeps } from './drillBrief';
import { parseFullLesson, type FullLesson } from '../fullLesson';
import { fullLessons, lessonIdOf } from '../generalLessonSources';
import { lessonPage } from './lessonPage';
import { replayBtn } from './guideList';

/**
 * Learning path (Plan 8a Task 9–10, D8a-14): #/learn (two tracks), #/learn/sql/<n> (a module), #/learn/skill/<id>,
 * #/learn/adv/<node>. Part of the lazy General UI chunk (statically imported by drillBrief.ts, budget `learnui`); every
 * main-bundle value comes in through `DrillDeps` (Plan 6 U3). Every row leads to content: no "later" anywhere (D8a-15).
 */
let d$: DrillDeps;
const lt = (key: LearnKey, params?: Params): string => learnText(d$.getLang(), d$.locale(), key, params);

const LIST = 'm-0 list-none space-y-2 p-0';
const BTN = 'rounded-full px-4 whitespace-nowrap';
/** Buttons inside a card whose title link covers it (L88) stay clickable above the cover. */
const ABOVE = 'relative z-10';
const cx = (...c: string[]): string => c.join(' ');
const H2 = 'm-0 text-title font-bold';
/** "Boon chỉ mình" on the right (v8 §2.1). v21 U18: the way back up and the page's name are the breadcrumb and h1 above (homeView). */
const backLine = (guide: string): HTMLElement =>
  d$.h('p', { class: 'm-0 flex justify-end' }, replayBtn(guide));
const slot = (name: string): HTMLElement => d$.guideSlot(name);
/** ui-ux-v5 B1: skill icons that just became "learned" get a one-shot stamp (src/learn.ts stamper). */
const stamps = stamper();

function ctx(g: General): LearnCtx {
  const { app } = d$;
  const tickets = d$.loadTickets('logistics'); // Plan 9 D9-12: the learning path follows Logistics
  const ids = d$.SKILLS.map((s) => s.id);
  return { save: app.save, tickets, skills: d$.SKILLS, parts: d$.ROUTE_PARTS, general: g, seen: ids.filter((id) => d$.lessonSeen(id)),
    known: d$.knownSkills(app.save, tickets, ids) };
}

/** Draws the learning page for the current hash into a fresh element. */
export function learnPage(deps: DrillDeps, g: General): HTMLElement {
  d$ = deps;
  const hash = location.hash;
  const skill = d$.SKILLS.find((s) => s.id === d$.learnSkillOf(hash));
  const node = g.nodes.find((x) => x.id === d$.learnAdvOf(hash));
  const n = d$.learnModuleOf(hash);
  const c = ctx(g);
  stamps.base(c.save, c.known); // a new save object (import) resets the baseline
  if (skill) return skillPage(c, skill);
  if (node) return advPage(c, node);
  if (n && c.parts.some((p) => p.n === n)) return modulePage(c, n);
  return overview(c);
}

const kindLabel = (d: Drill): string => lt(`drill.kind.${d.kind}` as LearnKey);
const tick = (ok: boolean): Node | string => (ok ? d$.h('span', { class: 'font-bold text-good' }, ' ✓') : '');
const label = (s: Skill): string => s.label[d$.getLang()];
const skillHref = (id: string): string => `${d$.hashOf('learn')}/skill/${id}`;

/** One drill button: "Fill in the frame ✓" (D8a: done drills stay playable, 0 XP). */
export const drillButton = (d: Drill, done: boolean): HTMLElement =>
  d$.h('button', { type: 'button', class: cx(BTN, ABOVE), onclick: () => d$.actions.startDrill(d.id) }, kindLabel(d), tick(done));

/**
 * v24 (product §1.7, ux §6.3): a skill's level 0–4 and "review due". src/mastery.ts (branch v24-mastery) fills
 * `d$.mastery.level`; until then a stand-in from what learn.ts already knows: 2 = learned (knownSkills), 1 = a drill passed.
 */
function levelOf(c: LearnCtx, id: string): { level: number; due: boolean } {
  const m = d$.mastery.level?.(c.save, id);
  if (m) return m;
  const st = skillState(c, id);
  const card = c.save.review[id];
  return { level: st.learned ? 2 : st.drills > 0 ? 1 : 0, due: !!card && card.due < d$.today() };
}
/** Four dots, filled up to the level (filled vs ring: never colour alone); the level name is in the label. */
function dots(c: LearnCtx, s: Skill): HTMLElement {
  const { h } = d$;
  const { level } = levelOf(c, s.id);
  return h('span', { class: 'inline-flex shrink-0 items-center gap-1', role: 'img', 'aria-label': lt('lvl.aria', { skill: label(s), level: lt(`lvl.${level}` as LearnKey), n: level }) },
    ...[1, 2, 3, 4].map((i) => h('span', { class: cx('size-2.5 rounded-full', i <= level ? 'bg-accent' : 'ring-[1.5px] ring-line-strong ring-inset') })));
}
const dueChip = (): HTMLElement => d$.h('a', { href: d$.hashOf('practice'), class: 'relative z-10 inline-flex min-h-6 items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-caption font-semibold text-warn no-underline' },
  d$.icon('repeat', 'size-3.5'), lt('lvl.due'));
/** The skill page's level line (ux §5.2): dots, level name, the one step to the next level, "self-measured". */
function levelLine(c: LearnCtx, s: Skill): HTMLElement {
  const { h } = d$;
  const { level, due } = levelOf(c, s.id);
  return h('div', { class: 'flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 rounded-(--r-inset) bg-surface-2 px-3 py-2 text-body-sm', 'data-level': String(level) },
    dots(c, s), h('b', {}, lt('lvl.line', { level: lt(`lvl.${level}` as LearnKey) })),
    h('span', { class: 'text-muted' }, lt(`lvl.next.${level}` as LearnKey)), due ? dueChip() : null,
    h('span', { class: 'ml-auto text-caption text-muted' }, lt('lvl.self')));
}

function skillStatus(c: LearnCtx, id: string): string {
  const st = skillState(c, id);
  return st.mastered ? lt('learn.mastered') : st.learned ? lt('learn.learned') : lt('learn.notYet');
}

/** One skill: status, quick lesson, its drills (a skill without a full lesson yet; v6 §3.4 F5). */
function skillBlock(c: LearnCtx, s: Skill): HTMLElement {
  const { h } = d$;
  const st = skillState(c, s.id);
  const drills = c.general.bySkill.get(s.id) ?? [];
  const tile = h('span', { class: stamps.stamp(s.id, st.learned) ? 'cq-stamp relative grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-ink' : 'relative grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-ink', 'aria-hidden': 'true' },
    d$.skillIcon(s.id), st.learned ? d$.icon('check', 'cq-ck absolute -right-1 -bottom-1 size-5 rounded-full bg-panel p-0.5 text-good ring-1 ring-line') : null);
  return h('section', { class: 'space-y-3 rounded-(--r-card) bg-panel p-5 ring-1 ring-line' },
    h('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
      h('div', { class: 'flex min-w-0 items-center gap-3' }, tile),
      h('span', { class: 'text-body-sm text-muted' }, `${skillStatus(c, s.id)} · ${lt('learn.drills', { n: st.drills, total: st.total })}`)),
    h('p', { class: 'm-0 text-[15px] text-muted' }, s.when[d$.getLang()]),
    d$.loadLessons().has(s.id)
      ? h('p', { class: 'm-0 flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.lesson')),
        h('button', { type: 'button', class: BTN, 'aria-haspopup': 'dialog', onclick: () => d$.openLesson(s.id, undefined, { guide: true }) }, lt('drill.openLesson'), tick(st.lesson)))
      : null,
    h('div', { class: 'flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.drillsLine')),
      ...drills.map((d) => drillButton(d, c.save.completed.includes(d.id)))));
}

/** Route order of every skill drawn (Parts in order), for "next to learn" and the lesson pager. */
const routeOrder = (c: LearnCtx): Skill[] => c.parts.flatMap((p) => p.skills).map((id) => c.skills.find((s) => s.id === id)).filter((s): s is Skill => !!s);
/** The first skill in route order not learned yet (the "Continue" target), or undefined when all are. */
const nextSkill = (c: LearnCtx): Skill | undefined => routeOrder(c).find((s) => !c.known.has(s.id));

type PartFilter = 'all' | 'todo';
let partFilter: PartFilter = 'all';
/** ux §6.2: a Part as a compact list: progress, filter chips, a row per skill (48 px), learned ones folded into one row. */
function modulePage(c: LearnCtx, n: number): HTMLElement {
  const { h } = d$;
  const ms = moduleState(c, n);
  const skills = ms.skills.map((id) => c.skills.find((s) => s.id === id)).filter((s): s is Skill => !!s);
  const todo = skills.filter((s) => !c.known.has(s.id));
  const learned = skills.filter((s) => c.known.has(s.id));
  const next = todo[0];
  const order = c.parts.flatMap((p) => p.skills);
  const row = (s: Skill): HTMLElement => {
    const st = skillState(c, s.id);
    const { due } = levelOf(c, s.id);
    const isNext = s === next;
    return h('li', { class: cx('relative flex min-h-12 items-center gap-3 border-l-4 px-4 py-2 max-sm:min-h-16 max-sm:gap-2 max-sm:px-3', isNext ? 'border-l-accent bg-accent-soft' : 'border-l-transparent hover:bg-code'), 'data-skill': s.id },
      h('span', { class: 'grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent', 'aria-hidden': 'true' }, d$.skillIcon(s.id, 'size-5')),
      h('span', { class: 'w-6 shrink-0 font-mono text-body-sm text-muted tabular-nums', 'aria-hidden': 'true' }, String(order.indexOf(s.id) + 1).padStart(2, '0')),
      h('a', { href: skillHref(s.id), class: cx('min-w-0 flex-1 truncate text-ink no-underline after:absolute after:inset-0 max-sm:line-clamp-2 max-sm:whitespace-normal', isNext ? 'font-bold' : 'font-semibold'), title: label(s) }, label(s)),
      due ? dueChip() : null,
      h('span', { class: 'shrink-0 text-body-sm text-muted max-sm:hidden' }, `${lt(hasFull(s.id) ? 'part.full' : 'part.quick')} · ${lt('learn.drills', { n: st.drills, total: st.total })}`),
      dots(c, s),
      isNext ? h('a', { href: skillHref(s.id), class: 'relative z-10 shrink-0 max-sm:hidden rounded-full bg-accent px-3 py-1 text-body-sm font-bold text-on-accent no-underline shadow-(--shadow-1) hover:bg-accent/90' }, lt('part.continue')) : null);
  };
  const list = (xs: Skill[]): HTMLElement => h('ul', { class: 'm-0 list-none divide-y divide-line overflow-hidden rounded-(--r-card) bg-panel p-0 ring-1 ring-line' }, ...xs.map(row));
  const chip = (f: PartFilter, count: number): HTMLElement => h('button', {
    type: 'button', 'aria-pressed': String(partFilter === f), class: cx('min-h-8 rounded-full px-3 py-1 text-body-sm font-semibold ring-1', partFilter === f ? 'bg-accent-soft text-accent ring-accent' : 'bg-panel text-ink ring-line hover:ring-accent'),
    onclick: () => { partFilter = f; d$.actions.rerender(); d$.announce(lt('part.shown', { n: f === 'all' ? skills.length : todo.length })); },
  }, lt(f === 'all' ? 'part.filter.all' : 'part.filter.todo', { n: count }));
  return h('div', { class: 'space-y-4' },
    backLine('module-intro'),
    h('div', { class: 'space-y-2' }, h('p', { class: 'm-0 text-muted' }, lt('learn.moduleLine', { k: ms.learned, m: ms.skills.length })), bar(ms.learned, ms.skills.length)),
    slot('module-head'),
    h('div', { class: 'flex flex-wrap gap-2', role: 'group', 'aria-label': lt('part.filters') }, chip('all', skills.length), chip('todo', todo.length)),
    slot('module-skill'),
    partFilter === 'todo' ? (todo.length ? list(todo) : h('p', { class: 'm-0 text-muted' }, lt('part.allDone')))
      : learned.length && todo.length
        ? h('div', { class: 'space-y-3' },
          h('details', { class: 'group rounded-(--r-card) bg-panel ring-1 ring-line' },
            h('summary', { class: 'flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 [&::-webkit-details-marker]:hidden' },
              d$.icon('check', 'size-5 text-good'), h('span', { class: 'flex-1 font-semibold' }, lt('part.doneGroup', { n: learned.length })),
              h('span', { class: 'text-body-sm font-semibold text-accent' }, lt('part.show', { n: learned.length })), d$.icon('down', 'size-4 text-muted group-open:rotate-180')),
            h('div', { class: 'p-2 pt-0' }, list(learned))),
          list(todo))
        : list(skills));
}

const hasFull = (id: string): boolean => Object.keys(fullLessons).some((p) => lessonIdOf(p) === id);
/** A full lesson (content/general/lessons/<id>.md), parsed once per session; `failed` keeps a Retry instead of a loop. */
const lessons = new Map<string, FullLesson | 'loading' | 'failed'>();
function fullLesson(id: string): FullLesson | 'loading' | 'failed' | undefined {
  const load = Object.entries(fullLessons).find(([path]) => lessonIdOf(path) === id)?.[1];
  if (!load) return undefined;
  const have = lessons.get(id);
  if (have) return have;
  lessons.set(id, 'loading');
  load().then((src) => {
    const l = parseFullLesson(src, id);
    lessons.set(id, l);
    d$.learnTitles.set(id, l.title);
  }, () => lessons.set(id, 'failed')).finally(() => d$.actions.rerender());
  return 'loading';
}

function skillPage(c: LearnCtx, s: Skill): HTMLElement {
  const { h } = d$;
  const full = fullLesson(s.id);
  if (full && typeof full === 'object') {
    const order = routeOrder(c);
    const i = order.indexOf(s);
    const n = d$.partOf(s.id);
    return h('div', { class: 'space-y-4' }, slot('skill-head'),
      lessonPage(d$, full, { skill: s, drills: c.general.bySkill.get(s.id) ?? [], part: n ? { n, title: d$.moduleTitle(n, d$.getLang()) } : undefined,
        prev: order[i - 1], next: order[i + 1], level: levelLine(c, s), done: c.known.has(s.id) }),
      slot('skill-card'));
  }
  if (full === 'loading') return h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, d$.loader(), lt('fl.loading'));
  const lang = d$.getLang();
  const lesson = d$.loadLessons().get(s.id);
  return h('div', { class: 'space-y-5' },
    backLine('skill'),
    full === 'failed' ? h('p', { role: 'alert', class: 'm-0 flex flex-wrap items-center gap-2' }, lt('fl.failed'),
      h('button', { type: 'button', class: BTN, onclick: () => { lessons.delete(s.id); d$.actions.rerender(); } }, lt('fl.retry'))) : null,
    levelLine(c, s),
    slot('skill-head'),
    skillBlock(c, s),
    slot('skill-card'),
    h('section', { class: 'space-y-2 rounded-(--r-card) bg-panel p-5 ring-1 ring-line', 'aria-labelledby': 'skill-card' },
      h('h2', { id: 'skill-card', class: 'm-0 text-body font-bold' }, lt('learn.card')),
      // L93: General shows the lesson's example and mistake (lab, a shop chain), not the card's domain syntax and trap (L82).
      h('pre', { class: 'sql' }, lesson?.example ?? s.syntax),
      h('div', { class: 'space-y-1 [&_p]:my-0' }, h('b', {}, lt('learn.trap')), d$.richText(lesson?.mistake.why[lang] ?? s.trap[lang]),
        lesson ? h('pre', { class: 'sql' }, lesson.mistake.sql) : null)));
}

/** A thin bar with its numbers also in words beside it (never colour alone, L23). */
function bar(k: number, m: number): HTMLElement {
  const pct = m ? Math.round((k / m) * 100) : 0;
  return d$.h('div', { class: 'h-1.5 w-full overflow-hidden rounded-full bg-code', 'aria-hidden': 'true' },
    d$.h('div', { class: cx('h-1.5 rounded-full', k === m && m ? 'bg-good' : 'bg-accent'), style: `width:${pct}%` }));
}

/** ui-ux-v6 S4: an advanced node's status icon beside its words (the icon is decorative). */
const STATUS_ICON = { in: 'inApp', partial: 'partial', external: 'external' } as const;
const statusLine = (x: AdvNode, rest: string): HTMLElement =>
  d$.h('p', { class: 'm-0 flex items-start gap-1.5 text-body-sm text-muted' }, d$.icon(STATUS_ICON[x.status], 'mt-0.5 size-4 text-accent'),
    d$.h('span', {}, `${lt(`adv.status.${x.status}` as LearnKey)}${rest}`));

const hideOnPhone = (el: HTMLElement): HTMLElement => {
  el.classList.add('max-sm:hidden');
  return el;
};

function overview(c: LearnCtx): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const known = c.known;
  const mastered = c.skills.filter((s) => skillState(c, s.id).mastered).length;
  const graded = c.general.nodes.filter((n) => n.status !== 'external');
  const nodesDone = graded.filter((n) => nodeState(c, n).done).length;
  const next = nextSkill(c);
  const current = next && d$.partOf(next.id);
  // ux §6.1: Parts as compact cards (two columns from lg): the Part's first skill icon, k/m, a 6 px bar; no skill list here
  const sql = h('section', { class: 'min-w-0 space-y-3', 'aria-labelledby': 'track-sql' },
    h('h2', { id: 'track-sql', class: H2 }, lt('learn.trackSql')),
    slot('learn-sql'),
    h('ul', { class: 'm-0 grid list-none gap-3 p-0 lg:grid-cols-2' }, ...c.parts.map((p) => {
      const ms = moduleState(c, p.n);
      const isCurrent = p.n === current;
      return h('li', { class: cx('relative flex min-h-16 cursor-pointer items-center gap-3 rounded-(--r-card) bg-panel px-4 py-3 ring-1 hover:ring-accent', isCurrent ? 'ring-2 ring-accent' : 'ring-line'), 'data-part': String(p.n) }, // v12 L86: the whole card opens it
        h('span', { class: 'grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent max-sm:size-10', 'aria-hidden': 'true' }, d$.skillIcon(p.skills[0], 'size-6')),
        h('div', { class: 'min-w-0 flex-1 space-y-1.5' },
          h('div', { class: 'flex items-center gap-2' },
            h('a', { href: `${d$.hashOf('learn')}/sql/${p.n}`, class: 'min-w-0 flex-1 truncate font-bold text-ink no-underline after:absolute after:inset-0' }, lt('learn.moduleTitle', { n: p.n, title: d$.moduleTitle(p.n, lang) })),
            ms.done ? d$.icon('check', 'size-5 shrink-0 text-good') : isCurrent ? h('span', { class: 'shrink-0 rounded-full bg-accent-soft px-2 text-caption font-semibold text-accent' }, lt('learn.current')) : null),
          h('p', { class: 'm-0 text-body-sm text-muted' }, lt('learn.moduleLine', { k: ms.learned, m: ms.skills.length })),
          bar(ms.learned, ms.skills.length)));
    })));
  const resume = next ? h('section', { class: 'flex flex-wrap items-center gap-4 rounded-(--r-card) bg-panel px-5 py-4 ring-1 ring-line', 'aria-labelledby': 'learn-resume' },
    h('span', { class: 'grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent', 'aria-hidden': 'true' }, d$.skillIcon(next.id, 'size-6')),
    h('div', { class: 'min-w-48 flex-1' },
      h('p', { class: 'm-0 text-caption font-bold tracking-wider text-muted uppercase' }, lt('learn.resumeTitle')),
      h('h2', { id: 'learn-resume', class: 'm-0 text-title font-bold' }, lt('learn.resumeLine', { n: current ?? 0, skill: label(next) }))),
    h('a', { href: skillHref(next.id), class: 'rounded-full bg-accent px-4 py-2 font-bold text-on-accent no-underline shadow-(--shadow-1) hover:bg-accent/90' }, lt('learn.resumeGo'))) : null;
  const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 639px)').matches;
  const groups = (['A', 'B', 'C', 'D'] as const).map((gr) => [gr, c.general.nodes.filter((x) => x.group === gr)] as const);
  const adv = h('section', { id: 'adv', class: 'min-w-0 space-y-3', 'aria-labelledby': 'track-adv' },
    h('h2', { id: 'track-adv', class: H2 }, lt('learn.trackAdv')),
    slot('learn-adv'),
    // ui-ux-v7 M2 (L148): each group folds; closed on phones (28 nodes made the page ~5,200 px at 375), open from sm.
    ...groups.map(([gr, list]) => h('details', { class: 'space-y-2', open: !phone },
      h('summary', { class: 'flex cursor-pointer items-center gap-3' }, h('div', { class: 'w-14 shrink-0' }, d$.illustration('aspect-[3/2]', (il) => il.trackGlyph(gr))), // v5 B1
        h('h3', { class: 'm-0 flex-1 text-body-sm font-bold tracking-wide text-muted uppercase' }, lt(`adv.group.${gr}` as LearnKey)),
        h('span', { class: 'text-caption text-muted tabular-nums' }, `${list.filter((x) => nodeState(c, x).done).length}/${list.length}`),
        d$.icon('down', 'size-4 text-muted [details[open]>summary>&]:rotate-180')),
      h('ul', { class: LIST }, ...list.map((x) => {
        const st = nodeState(c, x);
        const needs = x.needs.filter((id) => !known.has(id) && !(c.general.nodes.find((y) => y.id === id) && nodeState(c, c.general.nodes.find((y) => y.id === id)!).done));
        // M2: below sm one line per node (name + drills chip); the status and "learn first" line stay on its page
        return h('li', { class: 'relative cursor-pointer space-y-1 rounded-(--r-card) bg-panel px-5 py-3 ring-1 ring-line hover:ring-accent max-sm:flex max-sm:items-center max-sm:gap-2 max-sm:space-y-0 max-sm:px-4 max-sm:py-2.5' },
          h('a', { href: `${d$.hashOf('learn')}/adv/${x.id}`, title: `${x.id.toUpperCase()} · ${x.title[lang]}`, class: 'font-bold after:absolute after:inset-0 max-sm:min-w-0 max-sm:flex-1 max-sm:truncate' }, `${x.id.toUpperCase()} · ${x.title[lang]}`, tick(st.done)), // v22 P2-2: truncated below sm
          x.status === 'external' ? null : h('span', { class: 'shrink-0 rounded-(--r-chip) bg-code px-2 text-caption text-muted tabular-nums sm:hidden', 'aria-hidden': 'true' }, `${st.drills}/${st.total}`),
          hideOnPhone(statusLine(x, (x.status === 'external' ? '' : ` · ${lt('learn.drills', { n: st.drills, total: st.total })}`)
            + (needs.length ? ` · ${lt('adv.needsFirst', { list: needs.map((id) => nameOf(c, id)).join(', ') })}` : ''))));
      })))));
  return h('div', { class: 'space-y-6' },
    // L87: the header picture is Boon teaching Lily, section 'teach' of src/ui/homeView.ts (main), drawn above this one
    slot('learn-head'), // v13 G1 step 1: right under the teaching scene, Boon speaks from it
    h('p', { class: 'm-0 flex flex-wrap items-center justify-between gap-2 text-muted' }, lt('learn.stats', { n: known.size, total: c.skills.length, m: mastered, k: nodesDone, nodes: graded.length }), replayBtn('path')),
    resume,
    placementCard(c),
    sql, adv,
    // v17 I5 (L144): the interview room, a page of its own (#/learn/interview, lazy chunk `interview`)
    h('section', { class: 'relative cursor-pointer space-y-1 rounded-(--r-card) bg-panel px-5 py-4 ring-1 ring-line hover:ring-accent', 'aria-labelledby': 'track-iv' },
      h('h2', { id: 'track-iv', class: H2 }, h('a', { href: `${d$.hashOf('learn')}/interview`, class: 'after:absolute after:inset-0' }, lt('learn.interview'))),
      h('p', { class: 'm-0 text-body-sm text-muted' }, lt('learn.interviewLine'))));
}

/**
 * v17 I4 (L145): "Already know SQL?": the entry check, one drill per module not learned yet. Never offered to a beginner
 * (`gated`: picked "I'm new" on the welcome screen); for everyone else a quiet card with a secondary button.
 */
function placementCard(c: LearnCtx): HTMLElement | null {
  const tour = d$.readTour();
  if (tour && !tour.knows) return null;
  const items = placementItems(c.parts, c.general, c.known);
  if (items.length === 0) return null;
  const { h } = d$;
  return h('section', { class: 'flex flex-wrap items-center gap-3 rounded-(--r-card) bg-panel px-5 py-4 ring-1 ring-line', 'aria-labelledby': 'place-title' },
    h('div', { class: 'min-w-48 flex-1' },
      h('h2', { id: 'place-title', class: 'm-0 text-body font-bold' }, lt('place.title')),
      h('p', { class: 'mt-1 mb-0 text-body-sm text-muted' }, lt('place.intro', { n: items.length }))),
    h('button', { type: 'button', class: cx(BTN, 'border border-accent bg-panel py-2 font-bold text-accent hover:bg-accent-soft'), onclick: () => d$.startPlacement(items) },
      lt('place.start', { n: items.length })));
}

/** Label of a skill id or a node id. */
export function nameOf(c: LearnCtx, id: string): string {
  const lang = d$.getLang();
  return c.skills.find((s) => s.id === id)?.label[lang] ?? c.general.nodes.find((n) => n.id === id)?.title[lang] ?? id;
}

/** #/learn/adv/<node> (Plan 8a Task 10): why, needs (links, ✓ when learned), lesson on lab, drills + challenge, reading links. */
function advPage(c: LearnCtx, x: AdvNode): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const st = nodeState(c, x);
  const known = c.known;
  const need = (id: string): HTMLElement => {
    const other = c.general.nodes.find((y) => y.id === id);
    const ok = other ? nodeState(c, other).done : known.has(id);
    const href = `${d$.hashOf('learn')}/${other ? `adv/${id}` : `skill/${id}`}`;
    return h('a', { href, class: ok ? 'font-semibold text-good' : '' }, nameOf(c, id), tick(ok));
  };
  const needs = x.needs.flatMap((id, i) => (i ? [', ', need(id)] : [need(id)]));
  return h('div', { class: 'space-y-5' },
    backLine(x.status === 'external' ? 'adv-ext' : 'adv'),
    statusLine(x, x.status === 'external' ? '' : ` · ${lt('learn.drills', { n: st.drills, total: st.total })}`),
    h('section', { class: 'mt-6 space-y-3 rounded-(--r-card) bg-panel p-5 ring-1 ring-line' },
    h('div', { class: 'text-[15px] leading-relaxed' }, d$.richText(x.why[lang])),
    st.done ? h('p', { class: 'm-0 font-bold text-good', role: 'status' }, lt('adv.done', { xp: CHALLENGE_XP })) : null,
    x.needs.length ? h('p', { class: 'm-0' }, h('b', {}, lt('adv.needs')), ' ', ...needs) : null,
    x.needs.length ? slot('adv-needs') : null,
    x.applies ? h('p', { class: 'm-0' }, h('b', {}, lt('learn.usedFor')), ' ', x.applies[lang]) : null,
    x.lesson
      ? h('p', { class: 'm-0 flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.lesson')),
        h('button', { type: 'button', class: cx(BTN, ABOVE), 'aria-haspopup': 'dialog', onclick: () => d$.openLesson(x.id, { lesson: x.lesson!, name: () => x.title[d$.getLang()] }, { guide: true }) },
          lt('drill.openLesson'), tick(d$.lessonSeen(x.id))))
      : null,
    x.drills.length
      ? h('div', { class: 'flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.drillsLine')),
        ...x.drills.map((d) => drillButton(d, c.save.completed.includes(d.id))))
      : null,
    x.drills.length ? slot('adv-drills') : null),
    x.readings.length
      ? h('section', { class: 'space-y-3' }, h('h2', { class: 'm-0 text-body font-bold' }, lt('adv.readings')),
        h('p', { class: 'm-0 text-muted' }, lt('adv.readingsNote')),
        ...x.readings.map((r) => h('article', { class: 'space-y-2 rounded-(--r-card) bg-panel p-5 ring-1 ring-line' },
          h('h3', { class: 'm-0 font-bold' }, r.title[lang]),
          h('div', { class: 'text-[15px] leading-relaxed' }, d$.richText(r.body[lang])),
          h('div', { class: 'grid gap-3 md:grid-cols-2' },
            h('figure', { class: 'm-0 min-w-0' }, h('figcaption', { class: 'mb-1 text-body-sm text-muted' }, 'SQL'), h('pre', { class: 'sql overflow-x-auto whitespace-pre', lang: 'en', tabindex: '0' }, r.sql)), // v21 U29: scroll, never break an expression
            h('figure', { class: 'm-0 min-w-0' }, h('figcaption', { class: 'mb-1 text-body-sm text-muted' }, 'pandas'), h('pre', { class: 'sql overflow-x-auto whitespace-pre', lang: 'en', tabindex: '0' }, r.pandas))))))
      : null,
    x.links.length
      ? h('section', { class: 'space-y-1' }, h('h2', { class: 'm-0 text-body font-bold' }, lt('adv.links')),
        h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...x.links.map((l) => h('li', {},
          h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.title[lang], ' ↗',
            h('span', { class: 'sr-only' }, ` (${lt('adv.newTab')})`))))))
      : null,
    slot('adv-links'));
}
