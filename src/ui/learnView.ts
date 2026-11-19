import type { AdvNode, Drill, General } from '../general';
import type { Params } from '../i18n';
import { learnText, type LearnKey } from '../i18n/learn';
import { CHALLENGE_XP, moduleState, nodeState, skillState, stamper, type LearnCtx } from '../learn';
import type { Skill } from '../progress';
import type { DrillDeps } from './drillBrief';
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
const H2 = 'm-0 text-lg font-bold';
/** The "‹ back" line with "Boon chỉ mình" on its right (v8 §2.1). */
const backLine = (href: string, text: string, guide: string): HTMLElement =>
  d$.h('p', { class: 'm-0 flex flex-wrap items-center justify-between gap-2' }, d$.h('a', { href }, text), replayBtn(guide));
const slot = (name: string): HTMLElement => d$.guideSlot(name);
/** ui-ux-v5 B1: skill icons that just became "learned" get a one-shot stamp (src/learn.ts stamper). */
const stamps = stamper();
/** The page drawn last: the module glyph pops in on the first draw after the hash changes, never on a redraw. */
let pageKey = '';
/** ui-ux-v6 S4: a module whose skills all became learned this session unlocks once (ids `m<n>`; baseline = done at first draw). */
const unlocks = stamper();
const doneIds = (c: LearnCtx): string[] => [...new Set(c.skills.map((s) => s.chapter))].filter((n) => moduleState(c, n).done).map((n) => `m${n}`);

/**
 * The module glyph, with the done badge in its corner (a sibling of the card's link, L93). A module done since the baseline
 * plays the unlock once, on the first badge that is still in the page at the next frame: GSAP when its chunk is in, else the
 * CSS draw (`.cq-unlock`) and a GSAP load for next time (L116); reduced motion shows it still. Any later redraw (language
 * switch, coming back) draws the badge still: the stamp is spent.
 */
function moduleArt(c: LearnCtx, n: number, cls: string, done: boolean): HTMLElement {
  const id = `m${n}`;
  const play = unlocks.fresh(id, done);
  const badge = done ? d$.illustration('aspect-square', (il) => {
    const b = il.doneBadge();
    // Checked again just before the paint: the entry's first draw is often replaced at once, and only the shown one plays.
    if (play) requestAnimationFrame(() => {
      if (!b.isConnected || !unlocks.fresh(id, true)) return;
      unlocks.spend(id);
      if (d$.reducedMotion()) return;
      const g = d$.loadedGsap();
      if (g) il.playUnlock(b, g);
      else { b.classList.add('cq-unlock'); d$.loadGsap(); }
    });
    return b;
  }) : null;
  return d$.h('div', { class: cx('relative shrink-0', cls) }, d$.illustration('aspect-[3/2]', (il) => il.moduleGlyph(n)),
    badge ? d$.h('div', { class: 'absolute -top-1.5 -right-1.5 size-5 sm:size-6' }, badge) : null);
}

function ctx(g: General): LearnCtx {
  const { app } = d$;
  const tickets = d$.loadTickets('logistics'); // Plan 9 D9-12: the learning path follows Logistics
  return { save: app.save, tickets, skills: d$.SKILLS, general: g, seen: d$.SKILLS.map((s) => s.id).filter((id) => d$.lessonSeen(id)),
    known: d$.knownSkills(app.save, tickets, d$.SKILLS.map((s) => s.id)) };
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
  unlocks.base(c.save, doneIds(c));
  const entered = hash !== pageKey;
  pageKey = hash;
  if (skill) return skillPage(c, skill);
  if (node) return advPage(c, node);
  if (n) return modulePage(c, n, entered);
  return overview(c);
}

const kindLabel = (d: Drill): string => lt(`drill.kind.${d.kind}` as LearnKey);
const tick = (ok: boolean): Node | string => (ok ? d$.h('span', { class: 'font-bold text-good' }, ' ✓') : '');
const label = (s: Skill): string => s.label[d$.getLang()];

/** One drill button: "Fill in the frame ✓" (D8a: done drills stay playable, 0 XP). */
export const drillButton = (d: Drill, done: boolean): HTMLElement =>
  d$.h('button', { type: 'button', class: cx(BTN, ABOVE), onclick: () => d$.actions.startDrill(d.id) }, kindLabel(d), tick(done));

function skillStatus(c: LearnCtx, id: string): string {
  const st = skillState(c, id);
  return st.mastered ? lt('learn.mastered') : st.learned ? lt('learn.learned') : lt('learn.notYet');
}

/** One skill: status, quick lesson, its three drills (v6 §3.4 F5: one roomy block, no stacked chips). */
function skillBlock(c: LearnCtx, s: Skill, heading: 'h2' | 'h3'): HTMLElement {
  const { h } = d$;
  const st = skillState(c, s.id);
  const drills = c.general.bySkill.get(s.id) ?? [];
  const card = heading === 'h3'; // a module page: a click anywhere on the card opens the skill page (L88, L93)
  // v5 B1: the icon tile (decorative, the status line says "learned" in words); not an ancestor of the link (L93)
  const tile = h('span', { class: stamps.stamp(s.id, st.learned) ? 'cq-stamp relative grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-ink' : 'relative grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-ink', 'aria-hidden': 'true' },
    d$.skillIcon(s.id), st.learned ? d$.icon('check', 'cq-ck absolute -right-1 -bottom-1 size-5 rounded-full bg-panel p-0.5 text-good ring-1 ring-line') : null);
  return h('section', { class: card ? 'relative cursor-pointer space-y-3 rounded-(--r-card) bg-panel p-5 ring-1 ring-line hover:ring-accent' : 'space-y-3 rounded-(--r-card) bg-panel p-5 ring-1 ring-line' },
    h('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
      h('div', { class: 'flex min-w-0 items-center gap-3' }, tile,
        h(heading, { class: H2 }, card ? h('a', { href: `${d$.hashOf('learn')}/skill/${s.id}`, class: 'after:absolute after:inset-0' }, label(s)) : label(s))),
      h('span', { class: 'text-body-sm text-muted' }, `${skillStatus(c, s.id)} · ${lt('learn.drills', { n: st.drills, total: st.total })}`)),
    h('p', { class: 'm-0 text-[15px] text-muted' }, s.when[d$.getLang()]),
    d$.loadLessons().has(s.id)
      ? h('p', { class: 'm-0 flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.lesson')),
        h('button', { type: 'button', class: cx(BTN, ABOVE), 'aria-haspopup': 'dialog', onclick: () => d$.openLesson(s.id, undefined, { guide: true }) }, lt('drill.openLesson'), tick(st.lesson)))
      : null,
    h('div', { class: 'flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.drillsLine')),
      ...drills.map((d) => drillButton(d, c.save.completed.includes(d.id)))));
}

function modulePage(c: LearnCtx, n: number, entered: boolean): HTMLElement {
  const { h } = d$;
  const ms = moduleState(c, n);
  return h('div', { class: 'space-y-5' },
    backLine(d$.hashOf('learn'), lt('learn.backAll'), 'module-intro'),
    h('div', { class: 'flex items-center gap-3' }, moduleArt(c, n, entered ? 'cq-glyph-in w-24' : 'w-24', ms.done), // Plan 8b, v6 S4
      h('h2', { class: 'm-0 text-xl font-bold' }, lt('learn.moduleTitle', { n, title: d$.moduleTitle(n, d$.getLang()) }))),
    h('p', { class: 'm-0 text-muted' }, lt('learn.moduleLine', { k: ms.learned, m: ms.skills.length })),
    slot('module-head'),
    ...d$.SKILLS.filter((s) => s.chapter === n).flatMap((s, i) => (i ? [skillBlock(c, s, 'h3')] : [slot('module-skill'), skillBlock(c, s, 'h3')])));
}

function skillPage(c: LearnCtx, s: Skill): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const lesson = d$.loadLessons().get(s.id);
  return h('div', { class: 'space-y-5' },
    backLine(`${d$.hashOf('learn')}/sql/${s.chapter}`, lt('learn.backModule', { n: s.chapter }), 'skill'),
    slot('skill-head'),
    skillBlock(c, s, 'h2'),
    slot('skill-card'),
    h('section', { class: 'space-y-2 rounded-(--r-card) bg-panel p-5 ring-1 ring-line', 'aria-labelledby': 'skill-card' },
      h('h3', { id: 'skill-card', class: 'm-0 font-bold' }, lt('learn.card')),
      // L93: General shows the lesson's example and mistake (lab, a shop chain), not the card's domain syntax and trap (L82).
      h('pre', { class: 'sql' }, lesson?.example ?? s.syntax),
      h('p', { class: 'm-0' }, h('b', {}, lt('learn.when')), ' ', s.when[lang]),
      h('div', {}, h('b', {}, lt('learn.trap')), d$.richText(lesson?.mistake.why[lang] ?? s.trap[lang]),
        lesson ? h('pre', { class: 'sql' }, lesson.mistake.sql) : null)));
}

/** A thin bar with its numbers also in words beside it (never colour alone, L23). */
function bar(k: number, m: number): HTMLElement {
  const pct = m ? Math.round((k / m) * 100) : 0;
  return d$.h('div', { class: 'h-2 w-full overflow-hidden rounded-full bg-code', 'aria-hidden': 'true' },
    d$.h('div', { class: 'h-2 rounded-full bg-accent', style: `width:${pct}%` }));
}

/** ui-ux-v6 S4: an advanced node's status icon beside its words (the icon is decorative). */
const STATUS_ICON = { in: 'inApp', partial: 'partial', external: 'external' } as const;
const statusLine = (x: AdvNode, rest: string): HTMLElement =>
  d$.h('p', { class: 'm-0 flex items-start gap-1.5 text-body-sm text-muted' }, d$.icon(STATUS_ICON[x.status], 'mt-0.5 size-4 text-accent'),
    d$.h('span', {}, `${lt(`adv.status.${x.status}` as LearnKey)}${rest}`));

function overview(c: LearnCtx): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const known = c.known;
  const mastered = c.skills.filter((s) => skillState(c, s.id).mastered).length;
  const graded = c.general.nodes.filter((n) => n.status !== 'external');
  const nodesDone = graded.filter((n) => nodeState(c, n).done).length;
  const modules = [...new Set(c.skills.map((s) => s.chapter))].sort((a, b) => a - b);
  const sql = h('section', { class: 'min-w-0 space-y-3', 'aria-labelledby': 'track-sql' },
    h('h2', { id: 'track-sql', class: H2 }, lt('learn.trackSql')),
    slot('learn-sql'),
    h('ul', { class: LIST }, ...modules.map((n) => {
      const ms = moduleState(c, n);
      return h('li', { class: 'relative flex cursor-pointer items-center gap-3 rounded-(--r-card) bg-panel px-5 py-4 ring-1 ring-line hover:ring-accent' }, // v12 L86: the whole card opens it
        moduleArt(c, n, 'w-14 sm:w-20', ms.done), // v5 B1: static glyph (L93); v6 S4: done badge
        h('div', { class: 'min-w-0 flex-1 space-y-2' },
          h('a', { href: `${d$.hashOf('learn')}/sql/${n}`, class: 'font-bold after:absolute after:inset-0' }, lt('learn.moduleTitle', { n, title: d$.moduleTitle(n, lang) }), tick(ms.done)),
          h('p', { class: 'm-0 text-body-sm text-muted' }, lt('learn.moduleLine', { k: ms.learned, m: ms.skills.length })),
          bar(ms.learned, ms.skills.length)));
    })));
  const groups = (['A', 'B', 'C', 'D'] as const).map((gr) => [gr, c.general.nodes.filter((x) => x.group === gr)] as const);
  const adv = h('section', { id: 'adv', class: 'min-w-0 space-y-3', 'aria-labelledby': 'track-adv' },
    h('h2', { id: 'track-adv', class: H2 }, lt('learn.trackAdv')),
    slot('learn-adv'),
    ...groups.map(([gr, list]) => h('div', { class: 'space-y-2' },
      h('div', { class: 'flex items-center gap-3' }, h('div', { class: 'w-14 shrink-0' }, d$.illustration('aspect-[3/2]', (il) => il.trackGlyph(gr))), // v5 B1
        h('h3', { class: 'm-0 text-body-sm font-bold tracking-wide text-muted uppercase' }, lt(`adv.group.${gr}` as LearnKey))),
      h('ul', { class: LIST }, ...list.map((x) => {
        const st = nodeState(c, x);
        const needs = x.needs.filter((id) => !known.has(id) && !(c.general.nodes.find((y) => y.id === id) && nodeState(c, c.general.nodes.find((y) => y.id === id)!).done));
        return h('li', { class: 'relative cursor-pointer space-y-1 rounded-(--r-card) bg-panel px-5 py-3 ring-1 ring-line hover:ring-accent' },
          h('a', { href: `${d$.hashOf('learn')}/adv/${x.id}`, class: 'font-bold after:absolute after:inset-0' }, `${x.id.toUpperCase()} · ${x.title[lang]}`, tick(st.done)),
          statusLine(x, (x.status === 'external' ? '' : ` · ${lt('learn.drills', { n: st.drills, total: st.total })}`)
            + (needs.length ? ` · ${lt('adv.needsFirst', { list: needs.map((id) => nameOf(c, id)).join(', ') })}` : '')));
      })))));
  return h('div', { class: 'space-y-5' },
    // L87: the header picture is Boon teaching Lily, section 'teach' of src/ui/homeView.ts (main), drawn above this one
    slot('learn-head'), // v13 G1 step 1: right under the teaching scene, Boon speaks from it
    h('p', { class: 'm-0 flex flex-wrap items-center justify-between gap-2 text-muted' }, lt('learn.stats', { n: known.size, total: c.skills.length, m: mastered, k: nodesDone, nodes: graded.length }), replayBtn('path')),
    h('div', { class: 'grid gap-6 lg:grid-cols-2' }, sql, adv),
    // v17 I5 (L144): the interview room, a page of its own (#/learn/interview, lazy chunk `interview`)
    h('section', { class: 'relative cursor-pointer space-y-1 rounded-(--r-card) bg-panel px-5 py-4 ring-1 ring-line hover:ring-accent', 'aria-labelledby': 'track-iv' },
      h('h2', { id: 'track-iv', class: H2 }, h('a', { href: `${d$.hashOf('learn')}/interview`, class: 'after:absolute after:inset-0' }, lt('learn.interview'))),
      h('p', { class: 'm-0 text-body-sm text-muted' }, lt('learn.interviewLine'))));
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
    backLine(d$.hashOf('learn'), lt('learn.backAll'), x.status === 'external' ? 'adv-ext' : 'adv'),
    h('h2', { class: 'm-0 text-xl font-bold' }, `${x.id.toUpperCase()} · ${x.title[lang]}`),
    statusLine(x, x.status === 'external' ? '' : ` · ${lt('learn.drills', { n: st.drills, total: st.total })}`),
    h('section', { class: 'space-y-3 rounded-(--r-card) bg-panel p-5 ring-1 ring-line' },
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
    x.links.length
      ? h('section', { class: 'space-y-1' }, h('h3', { class: 'm-0 font-bold' }, lt('adv.links')),
        h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...x.links.map((l) => h('li', {},
          h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.title[lang], ' ↗',
            h('span', { class: 'sr-only' }, ` (${lt('adv.newTab')})`))))))
      : null,
    slot('adv-links'));
}
