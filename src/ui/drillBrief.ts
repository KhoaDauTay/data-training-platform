import type * as Content from '../content';
import type { DbClient } from '../db/client';
import { drillTicket, type Drill, type General } from '../general';
import type * as I18n from '../i18n';
import { learnText, type LearnKey } from '../i18n/learn';
import { appliesIn, drillXp } from '../learn';
import type * as Practice from '../practice';
import type * as Progress from '../progress';
import type * as Route from '../route';
import type * as Session from '../session';
import type * as State from '../state';
import type * as Tickets from '../tickets';
import type { Ticket } from '../tickets';
import type * as Brief from './brief';
import type * as Dom from './dom';
import type * as LessonCard from './lessonCard';
import type * as Modes from './modes';

/**
 * Drill workspace (Plan 8a Task 7), a lazy chunk (budget group `learnui`), loaded by src/ui/modes.ts when a drill opens.
 * The editor, Run/Submit, grader, tabs and history are the shared workspace (work.ts); this module draws the left pane and
 * credits a passed drill. Drills run on the `lab` schema, never on the game tables.
 * Every main-bundle value comes in through `DrillDeps` (only `import type` from main modules, Plan 6 U3: a value import
 * makes Rolldown split main into shared chunks). Values come only from modules that live in lazy chunks.
 */
export interface DrillDeps {
  db: DbClient;
  h: typeof Dom.h; nodes: typeof Dom.nodes; richText: typeof Dom.richText; byId: typeof Dom.byId;
  getLang: typeof I18n.getLang; locale: typeof I18n.locale;
  app: typeof State.app; actions: typeof State.actions; persist: typeof State.persist; schemaHooks: typeof State.schemaHooks;
  erMeta: typeof State.erMeta; stepKey: typeof State.stepKey;
  session: typeof Session.session; hintsShown: typeof Session.hintsShown; today: typeof Session.today;
  isSuccess: typeof Practice.isSuccess; movedToday: typeof Practice.movedToday; nextCard: typeof Practice.nextCard;
  SKILLS: typeof Progress.SKILLS; hashOf: typeof Route.hashOf; textOf: typeof Tickets.textOf;
  hints: typeof Brief.hints; shapeCard: typeof Brief.shapeCard; openLesson: typeof LessonCard.openLesson;
  backToStory: typeof Modes.backToStory; startDrillMode: typeof Modes.startDrillMode;
  loadGeneral: typeof Content.loadGeneral; generalNow: typeof Content.generalNow; loadLessons: typeof Content.loadLessons;
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
  deps.schemaHooks.only = () => (deps.session.mode.kind === 'drill' ? labCols : undefined);
}

/** Seeds `lab` (once per worker) and loads the General content, then opens drill `id` in the workspace. */
export async function openDrill(id: string): Promise<void> {
  const { byId } = d$;
  byId('announce').textContent = lt('drill.loading');
  const [g] = await Promise.all([d$.loadGeneral(), d$.db.ensure('lab')]);
  const drill = g.byId.get(id);
  if (!drill) throw new Error(`unknown drill ${id}`);
  if (!labCols) {
    const meta = await d$.erMeta('lab');
    const cols: Record<string, State.Column[]> = {};
    for (const c of meta.cols) (cols[c.table] ??= []).push({ name: c.name, type: c.type });
    labCols = cols;
  }
  byId('announce').textContent = '';
  d$.startDrillMode(drillTicket(drill), drill);
}

/** The drills this one belongs with: its skill's three, or its node's drills and challenge. */
function groupOf(g: General, d: Drill): Drill[] {
  return d.skill ? g.bySkill.get(d.skill) ?? [d] : g.nodes.find((n) => n.id === d.node)?.drills ?? [d];
}

function nameOf(g: General, d: Drill): string {
  const lang = d$.getLang();
  return d.skill ? d$.SKILLS.find((s) => s.id === d.skill)?.label[lang] ?? d.skill : g.nodes.find((n) => n.id === d.node)?.title[lang] ?? d.node ?? '';
}

const TITLE = { id: 'brief-title', tabindex: '-1', class: 'm-0 text-lg font-bold' };

/** Left pane of the drill workspace: title, task, expected result (no labels, D8a-6), a free hint, the lesson, the Recap. */
export function drillPane(host: HTMLElement, m: DrillMode): void {
  const { h, nodes, richText } = d$;
  const g = d$.generalNow();
  if (!g) return void host.replaceChildren(h('p', { class: 'muted', 'aria-live': 'polite' }, lt('drill.loading')));
  const lang = d$.getLang();
  const { drill: d, ticket: tk } = m;
  const group = groupOf(g, d);
  const what = nameOf(g, d);
  const title = d.kind === 'challenge' ? lt('drill.challenge', { what }) : lt('drill.title', { what, i: group.findIndex((x) => x.id === d.id) + 1, n: group.length });
  const passed = d$.app.save.completed.includes(tk.id);
  const node = d.node ? g.nodes.find((n) => n.id === d.node) : undefined;
  const lessonBtn = (open: () => void) => h('button', { type: 'button', class: 'px-2 py-0.5 text-sm', onclick: open }, lt('drill.openLesson'));
  const lesson = d.skill
    ? d$.loadLessons().has(d.skill) && lessonBtn(() => d$.openLesson(d.skill!))
    : node?.lesson && lessonBtn(() => d$.openLesson(node.id, { lesson: node.lesson!, name: () => node.title[d$.getLang()] }));
  host.replaceChildren(...nodes(
    h('header', {},
      h('h2', TITLE, title),
      h('p', { class: 'mt-1 mb-0 text-sm text-muted' }, lt(`drill.kind.${d.kind}` as LearnKey))),
    h('div', { class: 'mt-3 text-[15px] leading-relaxed' }, richText(d.task[lang])),
    h('p', { class: 'text-sm text-muted' }, lt('drill.data')),
    d$.shapeCard(tk, 0),
    d$.hints(tk, d$.textOf(tk, lang), false),
    lesson ? h('p', { class: 'my-2 flex flex-wrap items-center gap-2 text-sm' }, h('span', {}, lt('drill.lesson', { name: what })), lesson) : null,
    passed ? recap(g, d, tk) : null,
    h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => d$.backToStory() }, lt('drill.exit'))),
  ));
}

function recap(g: General, d: Drill, tk: Ticket): HTMLElement {
  const { h, app } = d$;
  const group = groupOf(g, d);
  const at = group.findIndex((x) => x.id === d.id);
  const next = [...group.slice(at + 1), ...group.slice(0, at)].find((x) => !app.save.completed.includes(x.id));
  const xp = lastXp.get(tk.id);
  const sql = app.save.graded[d$.stepKey(tk.id, 0)];
  const chapters = d.skill ? appliesIn(app.tickets, d.skill) : [];
  return h('section', { class: 'recap my-3 rounded-xl bg-panel p-3 ring-1 ring-accent', 'aria-labelledby': 'drill-recap' },
    h('h3', { id: 'drill-recap', tabindex: '-1', class: 'mt-0' }, xp === undefined ? lt('drill.done') : xp > 0 ? lt('drill.passed', { xp }) : lt('drill.passedAgain')),
    sql ? h('div', {}, h('p', { class: 'mb-1 text-sm text-muted' }, lt('drill.recap')), h('pre', { class: 'sql' }, sql)) : null,
    chapters.length ? h('p', { class: 'text-sm' }, h('a', { href: d$.hashOf('overview') }, lt('drill.applies', { list: chapters.join(', ') }))) : null,
    h('div', { class: 'actions mb-0' },
      next
        ? h('button', { type: 'button', class: 'primary', onclick: () => d$.startDrillMode(drillTicket(next), next) }, lt('drill.next'))
        : h('a', { href: d$.hashOf('learn') }, lt('drill.back'))));
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
    const ok = d$.isSuccess(m.wrong, d$.hintsShown(tk.id));
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
