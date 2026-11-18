import type { AdvNode, Drill, General } from '../general';
import type { Params } from '../i18n';
import { learnText, type LearnKey } from '../i18n/learn';
import { CHALLENGE_XP, moduleState, nodeState, skillState, type LearnCtx } from '../learn';
import type { Skill } from '../progress';
import type { DrillDeps } from './drillBrief';

/**
 * Learning path (Plan 8a Task 9–10, D8a-14): #/learn (two tracks), #/learn/sql/<n> (a module), #/learn/skill/<id>,
 * #/learn/adv/<node>. Part of the lazy General UI chunk (statically imported by drillBrief.ts, budget `learnui`); every
 * main-bundle value comes in through `DrillDeps` (Plan 6 U3). Every row leads to content: no "later" anywhere (D8a-15).
 */
let d$: DrillDeps;
const lt = (key: LearnKey, params?: Params): string => learnText(d$.getLang(), d$.locale(), key, params);

const LIST = 'm-0 list-none space-y-2 p-0';
const BTN = 'rounded-full px-4 whitespace-nowrap';
const H2 = 'm-0 text-lg font-bold';

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
  if (skill) return skillPage(c, skill);
  if (node) return advPage(c, node);
  if (n) return modulePage(c, n);
  return overview(c);
}

const kindLabel = (d: Drill): string => lt(`drill.kind.${d.kind}` as LearnKey);
const tick = (ok: boolean): Node | string => (ok ? d$.h('span', { class: 'font-bold text-good' }, ' ✓') : '');
const label = (s: Skill): string => s.label[d$.getLang()];

/** One drill button: "Fill in the frame ✓" (D8a: done drills stay playable, 0 XP). */
export const drillButton = (d: Drill, done: boolean): HTMLElement =>
  d$.h('button', { type: 'button', class: BTN, onclick: () => d$.actions.startDrill(d.id) }, kindLabel(d), tick(done));

function skillStatus(c: LearnCtx, id: string): string {
  const st = skillState(c, id);
  return st.mastered ? lt('learn.mastered') : st.learned ? lt('learn.learned') : lt('learn.notYet');
}

/** One skill: status, quick lesson, its three drills (v6 §3.4 F5: one roomy block, no stacked chips). */
function skillBlock(c: LearnCtx, s: Skill, heading: 'h2' | 'h3'): HTMLElement {
  const { h } = d$;
  const st = skillState(c, s.id);
  const drills = c.general.bySkill.get(s.id) ?? [];
  return h('section', { class: 'space-y-3 rounded-(--r-card) bg-panel p-5 ring-1 ring-line' },
    h('div', { class: 'flex flex-wrap items-baseline justify-between gap-2' },
      h(heading, { class: H2 }, heading === 'h3' ? h('a', { href: `${d$.hashOf('learn')}/skill/${s.id}` }, label(s)) : label(s)),
      h('span', { class: 'text-sm text-muted' }, `${skillStatus(c, s.id)} · ${lt('learn.drills', { n: st.drills, total: st.total })}`)),
    h('p', { class: 'm-0 text-[15px] text-muted' }, s.when[d$.getLang()]),
    d$.loadLessons().has(s.id)
      ? h('p', { class: 'm-0 flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.lesson')),
        h('button', { type: 'button', class: BTN, 'aria-haspopup': 'dialog', onclick: () => d$.openLesson(s.id) }, lt('drill.openLesson'), tick(st.lesson)))
      : null,
    h('div', { class: 'flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.drillsLine')),
      ...drills.map((d) => drillButton(d, c.save.completed.includes(d.id)))));
}

function modulePage(c: LearnCtx, n: number): HTMLElement {
  const { h } = d$;
  const ms = moduleState(c, n);
  return h('div', { class: 'space-y-5' },
    h('p', { class: 'm-0' }, h('a', { href: d$.hashOf('learn') }, lt('learn.backAll'))),
    h('div', { class: 'flex items-center gap-3' }, h('div', { class: 'w-28 shrink-0' }, d$.illustration('aspect-[160/64]', (il) => il.moduleGlyph(n))), // Plan 8b
      h('h2', { class: 'm-0 text-xl font-bold' }, lt('learn.moduleTitle', { n, title: d$.moduleTitle(n, d$.getLang()) }))),
    h('p', { class: 'm-0 text-muted' }, lt('learn.moduleLine', { k: ms.learned, m: ms.skills.length })),
    ...d$.SKILLS.filter((s) => s.chapter === n).map((s) => skillBlock(c, s, 'h3')));
}

function skillPage(c: LearnCtx, s: Skill): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  return h('div', { class: 'space-y-5' },
    h('p', { class: 'm-0' }, h('a', { href: `${d$.hashOf('learn')}/sql/${s.chapter}` }, lt('learn.backModule', { n: s.chapter }))),
    skillBlock(c, s, 'h2'),
    h('section', { class: 'space-y-2 rounded-(--r-card) bg-panel p-5 ring-1 ring-line', 'aria-labelledby': 'skill-card' },
      h('h3', { id: 'skill-card', class: 'm-0 font-bold' }, lt('learn.card')),
      h('pre', { class: 'sql' }, s.syntax),
      h('p', { class: 'm-0' }, h('b', {}, lt('learn.when')), ' ', s.when[lang]),
      h('div', {}, h('b', {}, lt('learn.trap')), d$.richText(s.trap[lang]))));
}

/** A thin bar with its numbers also in words beside it (never colour alone, L23). */
function bar(k: number, m: number): HTMLElement {
  const pct = m ? Math.round((k / m) * 100) : 0;
  return d$.h('div', { class: 'h-2 w-full overflow-hidden rounded-full bg-code', 'aria-hidden': 'true' },
    d$.h('div', { class: 'h-2 rounded-full bg-accent', style: `width:${pct}%` }));
}

const STATUS_ICON = { in: '▣', partial: '◐', external: '↗' } as const;

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
    h('ul', { class: LIST }, ...modules.map((n) => {
      const ms = moduleState(c, n);
      return h('li', { class: 'relative cursor-pointer space-y-2 rounded-(--r-card) bg-panel px-5 py-4 ring-1 ring-line hover:ring-accent' }, // v12 L86: the whole card opens it
        h('a', { href: `${d$.hashOf('learn')}/sql/${n}`, class: 'font-bold after:absolute after:inset-0' }, lt('learn.moduleTitle', { n, title: d$.moduleTitle(n, lang) }), tick(ms.done)),
        h('p', { class: 'm-0 text-sm text-muted' }, lt('learn.moduleLine', { k: ms.learned, m: ms.skills.length })),
        bar(ms.learned, ms.skills.length));
    })));
  const groups = (['A', 'B', 'C', 'D'] as const).map((gr) => [gr, c.general.nodes.filter((x) => x.group === gr)] as const);
  const adv = h('section', { id: 'adv', class: 'min-w-0 space-y-3', 'aria-labelledby': 'track-adv' },
    h('h2', { id: 'track-adv', class: H2 }, lt('learn.trackAdv')),
    ...groups.map(([gr, list]) => h('div', { class: 'space-y-2' },
      h('h3', { class: 'm-0 text-sm font-bold tracking-wide text-muted uppercase' }, lt(`adv.group.${gr}` as LearnKey)),
      h('ul', { class: LIST }, ...list.map((x) => {
        const st = nodeState(c, x);
        const needs = x.needs.filter((id) => !known.has(id) && !(c.general.nodes.find((y) => y.id === id) && nodeState(c, c.general.nodes.find((y) => y.id === id)!).done));
        return h('li', { class: 'relative cursor-pointer space-y-1 rounded-(--r-card) bg-panel px-5 py-3 ring-1 ring-line hover:ring-accent' },
          h('a', { href: `${d$.hashOf('learn')}/adv/${x.id}`, class: 'font-bold after:absolute after:inset-0' }, `${x.id.toUpperCase()} · ${x.title[lang]}`, tick(st.done)),
          h('p', { class: 'm-0 text-sm text-muted' },
            `${STATUS_ICON[x.status]} ${lt(`adv.status.${x.status}` as LearnKey)}`,
            x.status === 'external' ? '' : ` · ${lt('learn.drills', { n: st.drills, total: st.total })}`,
            needs.length ? ` · ${lt('adv.needsFirst', { list: needs.map((id) => nameOf(c, id)).join(', ') })}` : ''));
      })))));
  return h('div', { class: 'space-y-5' },
    // L87: the header picture is Boon teaching Lily, section 'teach' of src/ui/homeView.ts (main), drawn above this one
    h('p', { class: 'm-0 text-muted' }, lt('learn.stats', { n: known.size, total: c.skills.length, m: mastered, k: nodesDone, nodes: graded.length })),
    h('div', { class: 'grid gap-6 lg:grid-cols-2' }, sql, adv));
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
    h('p', { class: 'm-0' }, h('a', { href: `${d$.hashOf('learn')}` }, lt('learn.backAll'))),
    h('h2', { class: 'm-0 text-xl font-bold' }, `${x.id.toUpperCase()} · ${x.title[lang]}`),
    h('p', { class: 'm-0 text-sm text-muted' }, `${STATUS_ICON[x.status]} ${lt(`adv.status.${x.status}` as LearnKey)}`,
      x.status === 'external' ? '' : ` · ${lt('learn.drills', { n: st.drills, total: st.total })}`),
    h('section', { class: 'space-y-3 rounded-(--r-card) bg-panel p-5 ring-1 ring-line' },
    h('div', { class: 'text-[15px] leading-relaxed' }, d$.richText(x.why[lang])),
    st.done ? h('p', { class: 'm-0 font-bold text-good', role: 'status' }, lt('adv.done', { xp: CHALLENGE_XP })) : null,
    x.needs.length ? h('p', { class: 'm-0' }, h('b', {}, lt('adv.needs')), ' ', ...needs) : null,
    x.applies ? h('p', { class: 'm-0' }, h('b', {}, lt('learn.usedFor')), ' ', x.applies[lang]) : null,
    x.lesson
      ? h('p', { class: 'm-0 flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.lesson')),
        h('button', { type: 'button', class: BTN, 'aria-haspopup': 'dialog', onclick: () => d$.openLesson(x.id, { lesson: x.lesson!, name: () => x.title[d$.getLang()] }) },
          lt('drill.openLesson'), tick(d$.lessonSeen(x.id))))
      : null,
    x.drills.length
      ? h('div', { class: 'flex flex-wrap items-center gap-2' }, h('span', {}, lt('learn.drillsLine')),
        ...x.drills.map((d) => drillButton(d, c.save.completed.includes(d.id))))
      : null),
    x.links.length
      ? h('section', { class: 'space-y-1' }, h('h3', { class: 'm-0 font-bold' }, lt('adv.links')),
        h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...x.links.map((l) => h('li', {},
          h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.title[lang], ' ↗',
            h('span', { class: 'sr-only' }, ` (${lt('adv.newTab')})`))))))
      : null);
}
