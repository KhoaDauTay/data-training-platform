import { generalNow, loadGeneral, loadLessons, loadTicketTemplates, loadTickets } from '../content';
import type { DbClient } from '../db/client';
import type { Drill } from '../general';
import { knownSkills, type HomeModel } from '../home';
import { getLang, isMac, keyLabels, locale, t } from '../i18n';
import { LANE_XP } from '../lanes';
import { applyResult, isSuccess, movedToday, nextCard, pickForSkill, retryItem, type PracticeItem } from '../practice';
import { CHAPTERS, chapterTitle, moduleTitle, nextTicket, SKILLS } from '../progress';
import { hashOf, learnAdvOf, learnModuleOf, learnSkillOf, parseRoute } from '../route';
import {
  activeSchema, activeStep, activeTicket, hintsShown, isStory, markWarmupDone, practiceFinished, reviewCount, reviewedDrills, reviewToday, session, today, warmupToday, type Mode, type PracticeRun,
} from '../session';
import { DRILL_ID } from '../save';
import { actions, app, done, erMeta, persist, schemaHooks, selected, stepKey } from '../state';
import { textOf, type Ticket } from '../tickets';
import { BTN_GO, BTN_SECONDARY, CARD, cx } from '../theme';
import { applyVariant } from '../variants';
import { hints, renderBrief, shapeCard } from './brief';
import { goalCard, skillChips, wrapUp } from './chapterView';
import { announce, byId, h, loader, nodes, reducedMotion, richText } from './dom';
import { boonMark, enterMark, escOwned, guideHooks, guideSlot } from './coach';
import { showPane } from './paneTabs';
import { readJson, writeJson } from '../storage';
import { isSeen, openLesson } from './lessonCard';
import { tryPreview } from './tryPreview';
import { homeHooks, registerHomeSection, registerMode } from './homeView';
import { laneNote } from './lanePanel';
import { go } from './router';
import { registerNav, setActionButton } from './topbar';
import { renderMyData } from './myDataView';
import type { WorkArea } from './work';
import { mascot } from './mascots';
import { icon, NAV_ICON, skillIcon } from './icons';
import { illustration, loadedGsap, loadGsap } from '../art/load';
import { gated, navLock, readTour } from '../onboarding';

/** v12 audit: the Overview's Sandbox / My data cards follow the Sandbox sidebar lock (v4 D-O3). */
const sandboxLock = () => navLock('sandbox', done(), app.tickets.map((x) => x.id), gated(readTour()));

/** Rebuilt on each call from the open domain's templates (v11 review: a memo kept the first domain's tickets). */
const templates = (): Map<string, Ticket> => new Map(loadTicketTemplates().map((tk) => [tk.id, tk]));
let ctx: { work: WorkArea; rerender(): void; db: DbClient } | undefined;
let runSeq = 0;

/** Called once from main.ts, right after mountWork(). */
export function initModes(c: { work: WorkArea; rerender(): void; db: DbClient }): void {
  ctx = c;
}

/** The clicked button is gone after a redraw: focus the new left pane's title (showRoute does the same after a route change). */
const focusTitle = (): void => document.getElementById('brief-title')?.focus();

/** Every mode switch rebuilds the editor (`force`): a practice item may share the story ticket's id. */
function enter(mode: Mode): void {
  session.mode = mode;
  ctx?.rerender();
  ctx?.work.setTicket(activeTicket(), activeStep(), true);
  go('play');
  focusTitle();
}

/** A review drill (Plan 8a Task 8) becomes its drill ticket (runs on lab); anything else the template with the item's variant. */
const itemTicket = (i: PracticeItem): Ticket | undefined =>
  DRILL_ID.test(i.ticketId) ? drillUi?.reviewTicket(i.ticketId) : templates().has(i.ticketId) ? applyVariant(templates().get(i.ticketId)!, i.variant) : undefined;

export function startPractice(items: PracticeItem[], warmup = false): boolean {
  const usable = items.flatMap((i) => (itemTicket(i) ? [i] : []));
  if (usable.length === 0) return false;
  enter({
    kind: 'practice',
    run: {
      id: ++runSeq,
      items: usable,
      tickets: usable.map((i) => itemTicket(i)!),
      index: 0,
      wrong: 0,
      hints: 0,
      passed: 0,
      draft: '',
      warmup,
    },
  });
  return true;
}

export const startSandbox = (): void => enter({ kind: 'sandbox' });
export const backToStory = (): void => enter({ kind: 'story' });
/** Plan 8a: the drill workspace's left pane and credit live in a lazy chunk (src/ui/drillBrief.ts, budget `learnui`). */
let drillUi: typeof import('./drillBrief') | undefined;
/** Every main-bundle value the chunk uses is handed over here (Plan 6 U3: the chunk imports only types from main modules). */
const loadDrillUi = () => import('./drillBrief').then((m) => {
  if (!drillUi) m.initDrill({
    db: ctx!.db, activeSchema, h, nodes, richText, byId, loader, getLang, locale, app, actions, persist, schemaHooks, erMeta, stepKey, session, hintsShown, today,
    isSuccess, movedToday, nextCard, SKILLS, hashOf, textOf, hints, shapeCard, tryPreview, openLesson, backToStory, startDrillMode, loadGeneral, generalNow, loadLessons,
    lessonSeen: isSeen, knownSkills, learnSkillOf, learnAdvOf, learnModuleOf, moduleTitle, illustration, loadedGsap, loadGsap, reducedMotion, icon, skillIcon, loadTickets, CHAPTERS,
    announce, readJson, writeJson, readTour, boonMark, enterMark, escOwned, guideHooks, guideSlot, showPane, parseRoute, mod: keyLabels(isMac).mod,
  });
  return (drillUi = m);
});
/** Opens a General drill: seeds `lab` and loads the drills first (main.ts actions.startDrill). */
export function startDrill(id: string): Promise<void> {
  // Seeding lab can take a moment on the first drill: the clicked button stays disabled until the drill opens; a failure says so.
  const btn = document.activeElement instanceof HTMLButtonElement ? document.activeElement : undefined;
  btn?.setAttribute('aria-busy', 'true');
  if (btn) btn.disabled = true;
  return loadDrillUi().then((m) => m.openDrill(id)).catch(() => {
    app.notice = { key: 'learn.failed' };
    ctx?.rerender();
  }).finally(() => {
    btn?.removeAttribute('aria-busy');
    if (btn) btn.disabled = false;
  });
}
export const startDrillMode = (ticket: Ticket, drill: Drill): void => enter({ kind: 'drill', ticket, drill, wrong: 0 });
/** Plan 5: a lane side task in the workspace. It never becomes the next ticket and counts for no chapter (D-B1). */
export const startLane = (task: Ticket): void => enter({ kind: 'lane', ticket: task });
/** "Về việc đang làm": the story's next ticket (mockup v6 screen D), or the open one when everything is done. */
export const toCurrentTask = (): void => actions.selectTicket(nextTicket(app.tickets, done())?.id ?? app.selectedId);

/** Entry 1: today's review (D2). Nothing due (e.g. the day changed since the button was drawn): Home with a notice (L37). */
export async function startToday(): Promise<boolean> {
  // Plan 8a Task 8: reviews are drills on lab; if the drills or lab cannot load, the review falls back to ticket variants.
  const ok = reviewCount() > 0 && await loadDrillUi().then((m) => m.prepareLab()).then(() => true, () => false);
  if (startPractice(reviewToday(Math.random, ok ? generalNow()?.bySkill : undefined))) return true;
  if (!app.notice?.key.startsWith('save.')) app.notice = { key: 'prac.nothingDue' }; // never hide a data-loss warning
  go('practice'); // the hub explains what is due; already there: no hashchange, so redraw ourselves
  ctx?.rerender();
  return false;
}

/** Entry 2: one skill (Home skill topics). */
export function startSkill(skill: string): boolean {
  const item = pickForSkill(skill, [...templates().values()], done(), Math.random);
  return item ? startPractice([item]) : false;
}

/** Entry 3: redo a finished task, another variant when it has one. Never a promotion review (L10). */
export function startRetry(ticketId: string): boolean {
  const tpl = templates().get(ticketId);
  return !!tpl && tpl.beat !== 'boss' && done().has(ticketId) && startPractice([retryItem(tpl, Math.random)]);
}

/** work.ts onSolved: Practice moves Leitner boxes only; a lane task gives flat XP; the story completes the ticket (XP, animation). */
export const onSolved = (tk: Ticket): void =>
  (session.mode.kind === 'practice' ? onPracticeSolved() : session.mode.kind === 'lane' ? completeLane(tk)
    : session.mode.kind === 'drill' ? drillUi?.completeDrill(tk) : actions.complete(tk));

/** Correct lane side task: saved apart from `completed`, LANE_XP whatever hints were opened, no animation (D-B1). */
function completeLane(tk: Ticket): void {
  if (app.save.lanes.includes(tk.id)) return;
  app.save.lanes.push(tk.id);
  app.save.xp += LANE_XP;
  persist(true);
  ctx?.rerender();
  byId('announce').textContent = t('lane.solved', { xp: LANE_XP });
  byId('ticket').querySelector<HTMLElement>('.recap h3')?.focus(); // the Submit button just disappeared
}

export function onPracticeWrong(): void {
  if (session.mode.kind === 'practice') session.mode.run.wrong++;
  else if (session.mode.kind === 'drill') session.mode.wrong++;
}

/** Correct submit in Practice: 0 XP, no completion animation; moves the Leitner boxes of the item's skills. */
export function onPracticeSolved(): void {
  if (session.mode.kind !== 'practice') return;
  const run = session.mode.run;
  const item = run.items[run.index];
  if (!item || run.result) return;
  const ok = isSuccess(run.wrong, run.hints);
  const day = today();
  // Warm-up: a success moves each box at most once a day, so redoing the warm-up cannot farm boxes (derived from the save).
  const skills = ok ? item.skills.filter((s) => !movedToday(app.save.review[s], day)) : item.skills; // any practice path (review, warm-up, redo): a skill moves up at most once a day
  const next = applyResult({ review: app.save.review, practice: app.save.practice }, skills, ok, day);
  app.save.review = next.review;
  app.save.practice = next.practice;
  persist(true);
  run.result = ok ? 'ok' : 'weak';
  if (DRILL_ID.test(item.ticketId)) reviewedDrills.add(item.ticketId);
  if (ok) run.passed++;
  if (run.warmup && run.index === run.items.length - 1) markWarmupDone();
  ctx?.rerender();
}

function nextItem(): void {
  if (session.mode.kind !== 'practice') return;
  const run = session.mode.run;
  run.index++;
  run.wrong = 0;
  run.hints = 0;
  run.draft = '';
  run.result = undefined;
  ctx?.rerender(); // finished: renderLeft hides the editor, which is kept (never a ticketless editor writing run.draft)
  if (!practiceFinished()) ctx?.work.setTicket(activeTicket(), 0, true);
  focusTitle();
}

const TITLE = { id: 'brief-title', tabindex: '-1', class: 'm-0 text-lg font-bold' };

function sandboxPane(host: HTMLElement): void {
  host.replaceChildren(
    h('h2', TITLE, t('sbx.title')),
    h('p', { class: 'text-[15px] leading-relaxed' }, t('sbx.intro')),
    renderMyData(),
    h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit'))),
  );
}

function practicePane(host: HTMLElement, run: PracticeRun): void {
  const finished = run.index >= run.items.length;
  const status = finished ? t('prac.done', { ok: run.passed, n: run.items.length }) : t('prac.banner', { i: run.index + 1, n: run.items.length });
  const banner = h('div', { class: 'mb-3 rounded-(--r-ctl) bg-accent-soft p-3 ring-1 ring-accent', role: 'status' },
    finished ? h('h2', TITLE, status) : h('p', { class: 'm-0 font-semibold' }, status),
    run.result ? h('p', { class: 'mt-1 mb-0' }, t(run.result === 'ok' ? 'prac.ok' : 'prac.weak')) : null,
    h('div', { class: 'actions mb-0' },
      run.result && !finished ? h('button', { type: 'button', class: 'primary', onclick: () => nextItem() }, t('prac.next')) : null,
      h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit'))));
  const body = h('div');
  if (!finished) {
    const tk = run.tickets[run.index];
    if (DRILL_ID.test(tk.id) && drillUi) drillUi.reviewBody(body, tk);
    else renderBrief(body, tk, 0);
    const chips = skillChips(tk) ?? '';
    const slot = body.querySelector('[data-brief-extra]'); // the story brief's slot; a drill brief has none
    if (slot) slot.replaceWith(chips);
    else body.querySelector('header')?.after(chips);
  }
  host.replaceChildren(banner, body);
}

function storyPane(host: HTMLElement): void {
  const tk = selected();
  renderBrief(host, tk, app.stepIndex);
  host.querySelector('[data-brief-extra]')?.replaceWith(skillChips(tk) ?? '', (tk.beat === 'teach' && goalCard(tk.chapter)) || '');
  if (!done().has(tk.id)) return;
  if (tk.beat !== 'boss') {
    host.append(h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => startRetry(tk.id) }, t('prac.retry'))));
    return;
  }
  const d = done();
  const quick = app.tickets.filter((x) => x.chapter === tk.chapter && x.beat !== 'boss' && d.has(x.id));
  // Right after passing, above the long Recap (v10 critic #3): the new title and the one way on are what the player looks for.
  const wrap = wrapUp(tk.chapter, quick.length ? () => startRetry(quick[Math.floor(Math.random() * quick.length)].id) : undefined);
  const recap = host.querySelector('.recap');
  if (recap) recap.before(wrap);
  else host.append(wrap);
}

function lanePane(host: HTMLElement, tk: Ticket): void {
  renderBrief(host, tk, 0);
  host.querySelector('[data-brief-extra]')?.replaceWith(skillChips(tk) ?? '', laneNote(tk, (port) => actions.openLane(port)));
}

/** Top-bar "Review: N" (P3): N = items in today's queue; hidden when the queue is empty. */
export function renderReviewButton(btn: HTMLButtonElement): void {
  const n = reviewCount();
  btn.hidden = n === 0;
  setActionButton(btn, t('top.review'), n, t('top.reviewDue', { n }));
  btn.title = t('prog.dueTitle');
  btn.onclick = () => void startToday();
}

/** Left pane for the current mode; main.ts rerender() calls this instead of renderBrief(). */
export function renderLeft(host: HTMLElement): void {
  const m = session.mode;
  const finished = practiceFinished();
  byId('work').hidden = finished;
  byId('split-col').hidden = finished; // no draggable splitter beside an empty column
  if (m.kind === 'sandbox') sandboxPane(host);
  else if (m.kind === 'practice') practicePane(host, m.run);
  else if (m.kind === 'lane') lanePane(host, m.ticket);
  else if (m.kind === 'drill') {
    if (drillUi) drillUi.drillPane(host, m);
    else void loadDrillUi().then(() => ctx?.rerender());
  }
  else storyPane(host);
}

/** Home "Review" card (D2 entry 1). Always shown, so nav "Practice" on a fresh save lands on its explanation (P6). */
function reviewCard(m: HomeModel): HTMLElement {
  const due = reviewCount();
  // L93: a skill learned through drills has a review card but no ticket: it is not "nothing learned yet".
  const none = m.learned === 0 && Object.keys(app.save.review).length === 0;
  const intro = none ? t('prac.locked') : t(due ? 'prac.dueIntro' : 'prac.noneDue', { n: due });
  const p = app.save.practice;
  const here = parseRoute(location.hash) === 'practice'; // v13 G7: Boon's guide on the Practise SQL page only
  return h('div', {}, h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-4 p-5'), 'aria-labelledby': 'review-title' },
    none ? mascot('lily', 'sleep', 'size-16') : null, // v6 §2.4: an empty state
    !none && !due ? h('div', { class: 'w-40 shrink-0' }, illustration('aspect-[240/120]', (il) => il.emptyDrills())) : null, // Plan 8b: nothing due
    h('div', { class: 'min-w-48 flex-1' }, // T9: a floor, so the button wraps below at 375 px instead of squeezing the text to one word per line
      h('h2', { id: 'review-title', class: 'm-0 text-lg font-bold' }, t('prac.section')),
      h('p', { class: 'mt-1 mb-0 text-[15px] text-muted' }, intro),
      p.solved + p.weak ? h('p', { class: 'mt-1 mb-0 text-body-sm text-muted' }, t('prac.stats', { solved: p.solved, weak: p.weak })) : null),
    due ? h('button', { type: 'button', class: cx(here ? BTN_GO : BTN_SECONDARY, 'px-4 py-2'), onclick: () => startToday() }, t('prac.today', { n: due })) : null,
    // v4 §B.3: nothing learned yet → one way forward.
    none ? h('button', { type: 'button', class: cx(here ? BTN_GO : BTN_SECONDARY, 'px-4 py-2'), onclick: () => { location.hash = '#/learn/sql/1'; } }, t('prac.toFirst')) : null,
    here ? guideHooks.replayBtn?.('practice') ?? null : null),
  here ? guideSlot('practice-review') : null);
}

/** Home "Chapter warm-up" (curriculum §5.2): recall tasks from earlier chapters when a chapter starts. Never blocks its first ticket. */
function warmupCard(): HTMLElement | null {
  const n = warmupToday(() => 0).length;
  if (n === 0) return null;
  return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-4 p-5'), 'aria-labelledby': 'warmup-title' },
    h('div', { class: 'min-w-48 flex-1' },
      h('h2', { id: 'warmup-title', class: 'm-0 text-lg font-bold' }, t('warmup.title')),
      h('p', { class: 'mt-1 mb-0 text-[15px] text-muted' }, t('warmup.intro', { n }))),
    h('button', { type: 'button', class: cx(BTN_SECONDARY, 'px-4 py-2'), onclick: () => void startPractice(warmupToday(), true) }, t('warmup.start', { n })));
}

// Same id replaces topbar.ts's 'play' entry: "Workspace" is current only in story mode (and on a lane task).
registerNav({
  id: 'play', area: 'domain', order: 20, label: 'nav.play', icon: NAV_ICON.play, get href() { return hashOf('play'); },
  current: (r) => r === 'play' && (isStory() || session.mode.kind === 'lane'),
  onclick: () => (isStory() ? go('play') : backToStory()),
});
// Plan 7 V5: "Practise SQL" is a hub page (#/practice); a run in the workspace still counts as being there.
registerNav({
  id: 'practice', area: 'top', order: 30, label: 'nav.practice', icon: NAV_ICON.practice, href: hashOf('practice'),
  current: (r) => r === 'practice' || (r === 'play' && (session.mode.kind === 'practice' || session.mode.kind === 'drill')),
});
registerNav({
  id: 'sandbox', area: 'domain', order: 30, label: 'nav.sandbox', icon: NAV_ICON.sandbox, get href() { return hashOf('play'); },
  current: (r) => r === 'play' && session.mode.kind === 'sandbox',
  onclick: () => (session.mode.kind === 'sandbox' ? go('play') : startSandbox()),
});
registerHomeSection({ id: 'review', order: 22, span: 'full', pages: ['home', 'practice'], render: reviewCard });
/** Plan 8a Task 8: the drill part of the Practise SQL hub is drawn by the lazy General chunk; one load attempt per page load. */
let hubTried = false;
function drillHub(): HTMLElement | null {
  const hub = generalNow() && drillUi?.practiceHub();
  if (hub || hubTried) return hub || null;
  hubTried = true;
  void Promise.all([loadDrillUi(), loadGeneral()]).then(() => ctx?.rerender(), () => undefined);
  return null;
}
/**
 * Plan 8a Task 9: the learning path (#/learn…) is drawn by the lazy General chunk; it replaces Plan 7's module section (same id).
 * Loading shows a fixed-height line; a failed load shows Retry (never a load loop: loadGeneral drops a failed promise).
 */
let learnLoad: 'idle' | 'loading' | 'failed' = 'idle';
function loadLearn(): void {
  learnLoad = 'loading';
  void ctx?.db.ensure('lab').catch(() => undefined); // seeded in the background: the drills open faster (D8a-3)
  Promise.all([loadDrillUi(), loadGeneral()]).then(() => (learnLoad = 'idle'), () => (learnLoad = 'failed')).finally(() => ctx?.rerender());
}
function learnSection(): HTMLElement {
  const page = generalNow() && drillUi?.learnPage();
  if (page) return page;
  if (learnLoad === 'idle') loadLearn();
  return learnLoad === 'failed'
    ? h('div', { role: 'alert', class: 'space-y-2' }, h('p', { class: 'm-0' }, t('learn.failed')),
      h('button', { type: 'button', onclick: () => { loadLearn(); ctx?.rerender(); } }, t('data.retry')))
    : h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, loader(), t('learn.loading'));
}
registerHomeSection({ id: 'module', order: 10, span: 'full', pages: ['learn'], render: learnSection });
registerHomeSection({ id: 'drills', order: 23, span: 'full', pages: ['home', 'practice'], render: drillHub }); // Task 11: Home's "today" also suggests one drill
registerHomeSection({ id: 'warmup', order: 21, span: 'full', pages: ['home', 'practice'], render: warmupCard });
registerMode({
  id: 'sandbox', order: 10, icon: 'flask', tint: 'bg-accent-soft text-ink',
  title: 'mode.sandbox', desc: 'mode.sandboxDesc', open: () => startSandbox(), lock: sandboxLock,
});
homeHooks.levelOf = (skill) => app.save.review[skill]?.box ?? 1;
homeHooks.onSkill = (skill) => void startSkill(skill);
homeHooks.startLane = (task) => startLane(task);
// Plan Import (L17, I2): "My data" opens the Sandbox, whose left pane holds the CSV import.
registerMode({
  id: 'mydata', order: 20, icon: 'folder', tint: 'bg-accent-soft text-ink',
  title: 'mode.mydata', desc: 'mode.mydataDesc', open: () => startSandbox(), lock: sandboxLock,
});
