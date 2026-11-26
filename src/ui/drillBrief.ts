import type * as ArtLoad from '../art/load';
import type * as Content from '../content';
import type { DbClient } from '../db/client';
import { drillTicket, type Drill, type General } from '../general';
import type * as Home from '../home';
import type * as I18n from '../i18n';
import { learnText, type LearnKey } from '../i18n/learn';
import { learnPage as drawLearn, placementOf } from './learnView';
import { initGuides, type GuideDeps } from './guide';
import { initGuideList, replayBtn } from './guideList';
import { initSets } from './practiceSets';
export { explainCard, fixCard, mixCard, setText } from './practiceSets';
import { drillXp } from '../learn';
import type * as Mastery from '../mastery';
import type * as Practice from '../practice';
import type * as Progress from '../progress';
import type * as Route from '../route';
import type * as Session from '../session';
import type * as State from '../state';
import type * as Tickets from '../tickets';
import type { Ticket } from '../tickets';
import type * as Brief from './brief';
import type * as Dom from './dom';
import type * as Svg from './svg';
import type * as Icons from './icons';
import type * as LessonCard from './lessonCard';
import type * as Modes from './modes';
import type * as TryPreview from './tryPreview';
import type * as HomeView from './homeView';
import type * as Grader from '../grader';
import type * as ResultTable from './resultTable';
import type * as Feedback from './feedback';
import type * as EditorMod from './editor';

/**
 * Drill workspace (Plan 8a Task 7), a lazy chunk (budget group `learnui`), loaded by src/ui/modes.ts when a drill opens.
 * The editor, Run/Submit, grader, tabs and history are the shared workspace (work.ts); this module draws the left pane and
 * credits a passed drill. Drills run on the `lab` schema, never on the game tables.
 * Every main-bundle value comes in through `DrillDeps` (only `import type` from main modules, Plan 6 U3: a value import
 * makes Rolldown split main into shared chunks). Values come only from modules that live in lazy chunks.
 */
export interface DrillDeps extends GuideDeps {
  db: DbClient;
  h: typeof Dom.h; nodes: typeof Dom.nodes; richText: typeof Dom.richText; byId: typeof Dom.byId; loader: typeof Dom.loader;
  getLang: typeof I18n.getLang; locale: typeof I18n.locale;
  app: typeof State.app; actions: typeof State.actions; persist: typeof State.persist; schemaHooks: typeof State.schemaHooks;
  erMeta: typeof State.erMeta; stepKey: typeof State.stepKey;
  session: typeof Session.session; hintsShown: typeof Session.hintsShown; today: typeof Session.today; activeSchema: typeof Session.activeSchema;
  isSuccess: typeof Practice.isSuccess; movedToday: typeof Practice.movedToday; nextCard: typeof Practice.nextCard;
  SKILLS: typeof Progress.SKILLS; hashOf: typeof Route.hashOf; textOf: typeof Tickets.textOf;
  hints: typeof Brief.hints; shapeCard: typeof Brief.shapeCard; tryPreview: typeof TryPreview.tryPreview; openLesson: typeof LessonCard.openLesson;
  leave: typeof Modes.leaveGeneral; startDrillMode: typeof Modes.startDrillMode; startPlacement: typeof Modes.startPlacement;
  loadGeneral: typeof Content.loadGeneral; generalNow: typeof Content.generalNow; loadLessons: typeof Content.loadLessons;
  // Learning path (Task 9-10)
  lessonSeen: typeof LessonCard.isSeen; learnSkillOf: typeof Route.learnSkillOf; learnAdvOf: typeof Route.learnAdvOf;
  learnModuleOf: typeof Route.learnModuleOf; knownSkills: typeof Home.knownSkills; moduleTitle: typeof Progress.moduleTitle; illustration: typeof ArtLoad.illustration;
  loadedGsap: typeof ArtLoad.loadedGsap; loadGsap: typeof ArtLoad.loadGsap; reducedMotion: typeof Dom.reducedMotion; // v6 S4 unlock
  icon: typeof Icons.icon; skillIcon: typeof Icons.skillIcon;
  // Plan 9 D9-12: the General area reads Logistics, whatever domain is open
  loadTickets: typeof Content.loadTickets; CHAPTERS: typeof Progress.CHAPTERS;
  // v13 guides (ui/guideList.ts)
  parseRoute: typeof Route.parseRoute; mod: string; isInterviewPage: typeof Route.isInterviewPage;
  // v24 R0 (L335–L338): the General route's Parts, the full lesson page (ui/lessonPage.ts) and the level hook (src/mastery.ts)
  ROUTE_PARTS: typeof Progress.PARTS; partOf: typeof Progress.partOf;
  learnTitles: typeof HomeView.learnTitles;
  runOn: typeof TryPreview.runOn; verdictText: typeof TryPreview.verdictText; grade: typeof Grader.grade;
  renderResult: typeof ResultTable.renderResult; errorView: typeof Feedback.errorView; errorText: typeof Feedback.errorText;
  createEditor: typeof EditorMod.createEditor; announce: typeof Dom.announce;
  /** v24 (L323): skill levels for the skill page's level line and the Part page's dots (src/mastery.ts, main). */
  masteryOf: typeof Mastery.masteryOf;
  /** v28 LINK (L432): the "Đào sâu" chips to Engine lessons (src/ui/deepDive.ts, main; its table is a lazy chunk). */
  deepDive: (id: string) => HTMLElement | null;
  /** v39 (P1, L605): the SVG helper the figure builder draws with (with h/reducedMotion/gsap/getLang above = the figure's Deps). */
  s: typeof Svg.s;
  /** v47 (L920): starts a Practise set (Fix, Mixed review) as a Practice run on `lab` (modes.ts startSet). */
  startSet: typeof Modes.startSet;
}

let d$: DrillDeps;
const lt = (key: LearnKey, params?: I18n.Params): string => learnText(d$.getLang(), d$.locale(), key, params);

/** Autocomplete in the drill workspace: the lab tables only (state.ts editorSchema). Filled before the first drill opens. */
let labCols: Record<string, State.Column[]> | undefined;
/** XP of the last pass per drill this session, for the Recap line ("+10" the first time, "0" after). */
const lastXp = new Map<string, number>();

type DrillMode = Extract<Session.Mode, { kind: 'drill' }>;

/** Called once by modes.ts right after this chunk loads. */
export function initDrill(deps: DrillDeps): void {
  d$ = deps;
  initGuides(deps); // v13: Boon's guides (ui/guide.ts), in this chunk
  initGuideList(deps);
  initSets(deps); // v47: the Practise sets (ui/practiceSets.ts, same chunk)
  deps.schemaHooks.only = () => (deps.activeSchema() === 'lab' ? labCols : undefined); // a drill, or a review drill in Practice
}

/** Seeds `lab` (once per worker) and loads the General content, then opens drill `id` in the workspace. */
export async function openDrill(id: string, waitLab = true): Promise<void> {
  // FIX-1 (L147): a reload on a drill opens it before the first editor is built; `lab` seeds behind it (requests name it).
  const g = waitLab ? await prepareLab() : await d$.loadGeneral();
  if (!waitLab) void prepareLab().catch(() => {});
  const drill = g.byId.get(id);
  if (!drill) throw new Error(`unknown drill ${id}`);
  d$.startDrillMode(drillTicket(drill), drill);
}

/** Seeds `lab`, loads the drills and the lab columns for autocomplete (drills and review drills). */
export async function prepareLab(): Promise<General> {
  const { byId } = d$;
  byId('announce').textContent = lt('drill.loading');
  const [g] = await Promise.all([d$.loadGeneral(), d$.db.ensure('lab')]);
  if (!labCols) {
    const meta = await d$.erMeta('lab');
    const cols: Record<string, State.Column[]> = {};
    for (const c of meta.cols) (cols[c.table] ??= []).push({ name: c.name, type: c.type });
    labCols = cols;
  }
  byId('announce').textContent = '';
  return g;
}

/** A review item (Plan 8a Task 8): the drill as a ticket for a Practice run (0 XP, nothing saved but the Leitner card). */
export const reviewTicket = (id: string): Ticket | undefined => {
  const d = d$.generalNow()?.byId.get(id);
  return d && drillTicket(d);
};

/** The drills this one belongs with: its skill's three, or its node's drills and challenge. */
function groupOf(g: General, d: Drill): Drill[] {
  return d.skill ? g.bySkill.get(d.skill) ?? [d] : g.nodes.find((n) => n.id === d.node)?.drills ?? [d];
}

function nameOf(g: General, d: Drill): string {
  const lang = d$.getLang();
  return d.skill ? d$.SKILLS.find((s) => s.id === d.skill)?.label[lang] ?? d.skill : g.nodes.find((n) => n.id === d.node)?.title[lang] ?? d.node ?? '';
}

const TITLE = { id: 'brief-title', tabindex: '-1', class: 'm-0 text-title font-bold' };

/** Left pane of the drill workspace: title, task, expected shape (no labels, D8a-6), tables used and expected rows (L84), a free hint, the lesson, the Recap. */
export function drillPane(host: HTMLElement, m: DrillMode): void {
  const { h, nodes } = d$;
  const g = d$.generalNow();
  if (!g) return void host.replaceChildren(h('p', { class: 'muted flex items-center gap-2', 'aria-live': 'polite' }, d$.loader(), lt('drill.loading')));
  const { drill: d, ticket: tk } = m;
  const passed = d$.app.save.completed.includes(tk.id);
  host.replaceChildren(...nodes(
    ...drillParts(g, d, tk),
    passed ? recap(g, d, tk) : null,
    h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => d$.leave() }, lt('drill.exit'))),
  ));
}

/** A review drill inside a Practice run: the same brief, no Recap (the Practice banner says passed/weak and moves on). */
export function reviewBody(host: HTMLElement, tk: Ticket): void {
  const g = d$.generalNow();
  const d = g?.byId.get(tk.id);
  const m = d$.session.mode;
  if (g && d) host.replaceChildren(...d$.nodes(...drillParts(g, d, tk, m.kind === 'practice' ? m.run : undefined)));
}

/** `run`: the Practice run holding this drill (v47: a Mixed review hides hints until a wrong submit; a Fix item explains its bug once answered). */
function drillParts(g: General, d: Drill, tk: Ticket, run?: Session.PracticeRun): (Node | null | false | undefined)[] {
  const { h, richText } = d$;
  const lang = d$.getLang();
  const group = groupOf(g, d);
  const what = nameOf(g, d);
  const fix = d.kind === 'fix';
  const title = fix ? lt('sets.fixTitle') : d.kind === 'challenge' ? lt('drill.challenge', { what }) : lt('drill.title', { what, i: group.findIndex((x) => x.id === d.id) + 1, n: group.length });
  const hintsLater = run?.set?.kind === 'mix' && run.wrong === 0 && !run.result;
  const node = d.node ? g.nodes.find((n) => n.id === d.node) : undefined;
  const lessonBtn = (open: () => void) => h('button', { type: 'button', class: 'px-2 py-0.5 text-body-sm', onclick: open }, lt('drill.openLesson'));
  const lesson = d.skill
    ? d$.loadLessons().has(d.skill) && lessonBtn(() => d$.openLesson(d.skill!, undefined, { guide: true }))
    : node?.lesson && lessonBtn(() => d$.openLesson(node.id, { lesson: node.lesson!, name: () => node.title[d$.getLang()] }, { guide: true }));
  return [
    h('header', {},
      h('h2', TITLE, title),
      h('p', { class: 'mt-1 mb-0 flex flex-wrap items-center gap-2 text-body-sm text-muted' }, fix ? null : lt(`drill.kind.${d.kind}`),
        replayBtn(d$.session.mode.kind === 'drill' ? 'drill' : 'review'))),
    h('div', { class: 'mt-3 text-[15px] leading-relaxed' }, richText(d.task[lang])),
    d$.guideSlot('drill-brief'), // v13 G5/G7: under the task
    h('p', { class: 'text-body-sm text-muted' }, lt('drill.data')),
    tk.steps[0].check ? h('p', { class: 'text-body-sm text-muted' }, richText(lt('drill.write'))) : null, // v26 R2: write-then-read grading
    d$.shapeCard(tk, 0),
    d$.tryPreview(tk.steps[0].solution, 'lab', tk.steps[0].check), // L84: the tables it reads and a sample of the expected result (practice, not story)
    fix && d.why && run?.result ? h('section', { class: 'my-3 rounded-(--r-ctl) bg-panel p-3 ring-1 ring-accent', 'aria-labelledby': 'fix-why' },
      h('h3', { id: 'fix-why', class: 'mt-0' }, lt('sets.why')), h('div', { class: 'text-[15px] leading-relaxed' }, richText(d.why[lang]))) : null,
    hintsLater ? h('p', { class: 'text-body-sm text-muted' }, lt('sets.hintLater')) : d$.hints(tk, d$.textOf(tk, lang), false),
    lesson ? h('p', { class: 'my-2 flex flex-wrap items-center gap-2 text-body-sm' }, h('span', {}, lt('drill.lesson', { name: what })), lesson) : null,
    d$.deepDive(d.skill ?? d.node ?? ''),
  ];
}

function recap(g: General, d: Drill, tk: Ticket): HTMLElement {
  const { h, app } = d$;
  const group = groupOf(g, d);
  const at = group.findIndex((x) => x.id === d.id);
  const next = [...group.slice(at + 1), ...group.slice(0, at)].find((x) => !app.save.completed.includes(x.id));
  const xp = lastXp.get(tk.id);
  // v11 UX #3: the skill's drills are all passed: the next skill (in learning-path order) with a drill left, not a dead end.
  const skillAt = d.skill && !next ? d$.SKILLS.findIndex((s) => s.id === d.skill) : -1;
  const nextSkill = skillAt < 0 ? undefined : d$.SKILLS.slice(skillAt + 1).find((s) => (g.bySkill.get(s.id) ?? []).some((x) => !app.save.completed.includes(x.id)));
  const nextSkillDrill = nextSkill && g.bySkill.get(nextSkill.id)!.find((x) => !app.save.completed.includes(x.id))!;
  const sql = app.save.graded[d$.stepKey(tk.id, 0)];
  return h('section', { class: 'recap my-3 rounded-(--r-ctl) bg-panel p-3 ring-1 ring-accent', 'aria-labelledby': 'drill-recap' },
    h('h3', { id: 'drill-recap', tabindex: '-1', class: 'mt-0' }, xp === undefined ? lt('drill.done') : xp > 0 ? lt('drill.passed', { xp }) : lt('drill.passedAgain')),
    sql ? h('div', {}, h('p', { class: 'mb-1 text-body-sm text-muted' }, lt('drill.recap')), h('pre', { class: 'sql' }, sql)) : null,
    h('div', { class: 'actions mb-0' },
      next
        ? h('button', { type: 'button', class: 'primary', onclick: () => d$.startDrillMode(drillTicket(next), next) }, lt('drill.next'))
        : nextSkill && nextSkillDrill
          ? h('button', { type: 'button', class: 'primary', onclick: () => d$.startDrillMode(drillTicket(nextSkillDrill), nextSkillDrill) }, lt('drill.nextSkill', { skill: nextSkill.label[d$.getLang()] }))
          : null,
      next ? null : h('a', { href: `${d$.hashOf('learn')}/${d.skill ? `skill/${d.skill}` : `adv/${d.node}`}` }, lt('drill.back'))));
}

/** work.ts onSolved in drill mode: +10 XP the first time (+20 a challenge), the skill's Leitner card (D8a-10/11), no animation. */
export function completeDrill(tk: Ticket): void {
  const { app } = d$;
  const m = d$.session.mode;
  if (m.kind !== 'drill' || m.ticket.id !== tk.id) return;
  const first = !app.save.completed.includes(tk.id);
  const xp = drillXp(m.drill, first);
  lastXp.set(tk.id, xp);
  if (first) {
    app.save.completed.push(tk.id);
    app.save.xp += xp;
  }
  const skill = m.drill.skill; // advanced nodes have no Leitner card
  if (skill) {
    const ok = d$.isSuccess(m.wrong, d$.hintsShown(tk.id)) && !m.framed; // v13 D-H4: a pass after "Fill the scaffold" is weak
    const card = app.save.review[skill];
    const day = d$.today();
    // A pass creates or raises the card (at most once a day, like Practice); a weak pass only resets an existing card.
    if (ok ? !d$.movedToday(card, day) : card) app.save.review[skill] = d$.nextCard(card, ok, day);
  }
  d$.persist(true);
  d$.actions.rerender();
  d$.byId('announce').textContent = xp ? lt('drill.solved', { xp }) : lt('drill.passedAgain');
  document.getElementById('drill-recap')?.focus();
}

const BTN = 'rounded-full px-4 whitespace-nowrap';

/**
 * Practise SQL hub (Plan 8a Task 8, #/practice): the weakest learned skill with one drill to do, drills left half-done, or
 * (nothing learned yet) the way to Module 1. Today's review is the Review card above (src/ui/modes.ts).
 */
export function practiceHub(): HTMLElement | null {
  const g = d$.generalNow();
  if (!g) return null;
  const { h, app } = d$;
  const ids = d$.SKILLS.map((s) => s.id);
  const known = d$.knownSkills(app.save, d$.loadTickets('logistics'), ids);
  const done = (d: Drill): boolean => app.save.completed.includes(d.id);
  const go = (d: Drill, label: string): HTMLElement =>
    h('button', { type: 'button', class: BTN, onclick: () => d$.actions.startDrill(d.id) }, label);
  const head = h('h2', { id: 'hub-title', class: 'm-0 text-title font-bold' }, lt('hub.title'));
  const wrap = (...kids: (Node | null)[]): HTMLElement =>
    h('div', {}, h('section', { class: 'space-y-3 rounded-(--r-card) bg-panel p-5 ring-1 ring-line', 'aria-labelledby': 'hub-title' }, head, ...d$.nodes(...kids)),
      d$.guideSlot('practice-hub')); // v13 G7
  // v15 Q9: one drill passed is not "learned" yet (≥ 2, D8a-11), but it is not "nothing" either: one more drill finishes it.
  const started = known.size === 0 ? ids.map((s) => g.bySkill.get(s) ?? []).find((ds) => ds.some(done)) : undefined;
  const more = started?.find((d) => !done(d));
  if (started && more) {
    return wrap(h('p', { class: 'm-0 text-[15px]' }, lt('hub.almost', { skill: nameOf(g, more) })), go(more, lt('hub.resume')));
  }
  if (known.size === 0) {
    return wrap(h('p', { class: 'm-0 text-[15px] text-muted' }, lt('hub.empty')),
      h('a', { href: `${d$.hashOf('learn')}/sql/1`, class: 'inline-block rounded-full bg-accent px-4 py-2 font-bold text-on-accent no-underline shadow-(--shadow-1)' }, lt('hub.start'))); // looks like the call to action it is (BTN_GO, by value: lazy chunk)
  }
  const box = (s: string): number => app.save.review[s]?.box ?? 1;
  const weakest = [...known].sort((a, b) => box(a) - box(b) || ids.indexOf(a) - ids.indexOf(b))[0];
  const pool = g.bySkill.get(weakest) ?? [];
  const pick = pool.find((d) => !done(d)) ?? pool.find((d) => d.kind === 'open') ?? pool[0];
  const half = g.drills.filter((d) => !done(d) && app.save.drafts[d$.stepKey(d.id, 0)]?.trim()).slice(0, 3);
  const row = (label: string, action: HTMLElement): HTMLElement =>
    h('p', { class: 'm-0 flex flex-wrap items-center justify-between gap-2' }, h('span', {}, label), action);
  return wrap(
    pick ? row(lt('hub.weakest', { skill: nameOf(g, pick), box: box(weakest) }), go(pick, lt(`drill.kind.${pick.kind}`))) : null,
    ...half.map((d) => row(lt('hub.continue', { what: nameOf(g, d) }), go(d, lt('hub.resume')))),
  );
}

/** #/learn… page body (src/ui/learnView.ts, same chunk). Undefined while the drills are not loaded. */
export function learnPage(): HTMLElement | undefined {
  const g = d$.generalNow();
  return g && drawLearn(d$, g);
}
/** v47 S3 (L911): the entry check's items (learnView placementOf). */
export const placementList = (g: General): ReturnType<typeof placementOf> => placementOf(d$, g);
