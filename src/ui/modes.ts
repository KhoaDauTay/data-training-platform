import { generalNow, loadGeneral, loadInterview, loadLessons, loadTicketTemplates, loadTickets } from '../content';
import type { DbClient } from '../db/client';
import type { Drill } from '../general';
import { knownSkills, type HomeModel } from '../home';
import { getLang, isMac, keyLabels, locale, t } from '../i18n';
import { LANE_XP } from '../lanes';
import { applyResult, isSuccess, movedToday, nextCard, pickForSkill, retryItem, seedReview, type PracticeItem } from '../practice';
import { CHAPTERS, chapterTitle, moduleTitle, nextTicket, SKILLS } from '../progress';
import { drillHash, hashOf, INTERVIEW_PAGE, isInterviewId, isInterviewPage, learnAdvOf, learnModuleOf, learnSkillOf, parseRoute, SHARE_MAX, shareHash } from '../route';
import { activeDomain } from '../domains';
import {
  activeSchema, activeStep, activeTicket, generalWork, hintsShown, interviewClosed, ivHooks, ivItemId, readDraft, isStory, markWarmupDone, practiceFinished, reviewCount, reviewedDrills, reviewToday, session, today, warmupToday, type Mode, type PracticeRun,
} from '../session';
import { domainSlot, DRILL_ID } from '../save';
import { actions, app, done, erMeta, persist, schemaHooks, selected, stepKey } from '../state';
import { textOf, type Ticket } from '../tickets';
import { BTN_GO, BTN_SECONDARY, CARD, cx } from '../theme';
import { applyVariant } from '../variants';
import { hints, renderBrief, shapeCard } from './brief';
import { earlyCard, goalCard, optionalNote, skillChips, wrapUp } from './chapterView';
import { announce, byId, h, loader, nodes, reducedMotion, richText } from './dom';
import { meChunk } from './meChunk';
import { boonMark, coachDone, enterMark, escOwned, guideHooks, guideSlot } from './coach';
import { showPane } from './paneTabs';
import { readJson, writeJson } from '../storage';
import { isSeen, openLesson } from './lessonCard';
import { tryPreview } from './tryPreview';
import { elapsed, INTERVIEW_KEY, parseInterviewPrefs, setPresence, TEXT_MAX } from '../interviewPrefs';
import { homeHooks, openResume, registerHomeSection, registerMode, resumeLine, resumeName, resumeNow } from './homeView';
import { PER_WEEK, readGoal, sessionPlan, showsSession, writeGoal, type Goal, type SessionItem } from '../goal';
import { laneNote } from './lanePanel';
import { go } from './router';
import { registerNav, setActionButton } from './topbar';
import { renderMyData } from './myDataView';
import type { WorkArea } from './work';
import { mascot } from './mascots';
import { icon, NAV_ICON, skillIcon } from './icons';
import { illustration, loadedGsap, loadGsap } from '../art/load';
import { gated, navLock, readTour } from '../onboarding';
import { STUMBLE_WRONG, stumbledTasks } from '../practice';
import { readAttempts } from '../insights';

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
  ivAway();
  session.mode = mode;
  if (mode.kind !== 'sandbox') shared = undefined; // a shared query's strip belongs to that Sandbox visit only
  shareLine = '';
  ctx?.rerender();
  ctx?.work.setTicket(activeTicket(), activeStep(), true);
  go('play');
  focusTitle();
}

/** A review drill (Plan 8a Task 8) becomes its drill ticket (runs on lab); anything else the template with the item's variant. */
const itemTicket = (i: PracticeItem): Ticket | undefined =>
  DRILL_ID.test(i.ticketId) ? drillUi?.reviewTicket(i.ticketId) : templates().has(i.ticketId) ? applyVariant(templates().get(i.ticketId)!, i.variant) : undefined;

export function startPractice(items: PracticeItem[], warmup = false, placement = false): boolean {
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
      placement,
    },
  });
  return true;
}

/** v17 I4 (L145): the General entry check (items from learn.ts placementItems), a practice run of drills on `lab`. */
export function startPlacement(items: PracticeItem[]): void {
  void loadDrillUi().then((m) => m.prepareLab()).then(() => void startPractice(items, false, true), () => {
    app.notice = { key: 'learn.failed' };
    ctx?.rerender();
  });
}

export const startSandbox = (): void => enter({ kind: 'sandbox' });
export const backToStory = (): void => enter({ kind: 'story' });
/**
 * v15 Q1: leaving a drill or a review of drills goes back to the General area (the skill's or node's page, or Practise SQL),
 * never into a domain's workspace, which would seed that domain and mark it visited.
 */
export function leaveGeneral(): void {
  const m = session.mode;
  const back = m.kind === 'drill' ? `${hashOf('learn')}/${m.drill.skill ? `skill/${m.drill.skill}` : `adv/${m.drill.node}`}`
    : m.kind === 'interview' ? INTERVIEW_PAGE : hashOf('practice'); // v17: an interview run stays in the pref, resumable from its page
  ivAway();
  session.mode = { kind: 'story' };
  location.hash = back; // before the redraw: the workspace is about to hide, so the story brief's previews stay idle (Q7)
  ctx?.rerender();
  ctx?.work.setTicket(activeTicket(), activeStep(), true); // the next visit to the workspace starts on the story's editor
}
/** FIX-1 (L147): Back to a domain's workspace (or LEARN_PLAY without its review) while General work is open: story mode, hash untouched. */
export function dropGeneral(): void {
  ivAway();
  session.mode = { kind: 'story' };
  ctx?.rerender();
  ctx?.work.setTicket(activeTicket(), activeStep(), true);
}
/** FIX-1 (L147): the interview clock stops while the player is out of the room (another route, a hidden tab, another mode). */
export const ivPresence = (here: boolean): void => ivUi?.presence(here);
/** Before the session leaves an interview run: pause its clock and store it while runNow() still finds it. */
const ivAway = (): void => {
  if (session.mode.kind === 'interview') ivPresence(false);
};
/** Plan 8a: the drill workspace's left pane and credit live in a lazy chunk (src/ui/drillBrief.ts, budget `learnui`). */
let drillUi: typeof import('./drillBrief') | undefined;
/** Every main-bundle value the chunk uses is handed over here (Plan 6 U3: the chunk imports only types from main modules). */
const loadDrillUi = () => import('./drillBrief').then((m) => {
  if (!drillUi) m.initDrill({
    db: ctx!.db, activeSchema, h, nodes, richText, byId, loader, getLang, locale, app, actions, persist, schemaHooks, erMeta, stepKey, session, hintsShown, today,
    isSuccess, movedToday, nextCard, SKILLS, hashOf, textOf, hints, shapeCard, tryPreview, openLesson, leave: leaveGeneral, startDrillMode, loadGeneral, generalNow, loadLessons,
    lessonSeen: isSeen, knownSkills, learnSkillOf, learnAdvOf, learnModuleOf, moduleTitle, illustration, loadedGsap, loadGsap, reducedMotion, icon, skillIcon, loadTickets, CHAPTERS,
    startPlacement, announce, readJson, writeJson, readTour, boonMark, enterMark, escOwned, guideHooks, guideSlot, showPane, parseRoute, mod: keyLabels(isMac).mod, isInterviewPage,
  });
  return (drillUi = m);
});
/**
 * Opens a General drill: seeds `lab` and loads the drills first (main.ts actions.startDrill). `still`: a hash-driven open
 * (FIX-1) checks the URL still names this drill once lab is ready, so a slow seed never pulls the player back. True = opened.
 */
export function startDrill(id: string, still: () => boolean = () => true): Promise<boolean> {
  // Seeding lab can take a moment on the first drill: the clicked button stays disabled until the drill opens; a failure says so.
  const btn = document.activeElement instanceof HTMLButtonElement ? document.activeElement : undefined;
  btn?.setAttribute('aria-busy', 'true');
  if (btn) btn.disabled = true;
  // v21 E5: the open task's editor takes no keys meanwhile (they would land in its draft, not the drill's)
  const work = document.getElementById('work');
  work?.setAttribute('inert', '');
  return loadDrillUi().then(async (m) => {
    await m.prepareLab();
    if (still()) await m.openDrill(id);
    return true;
  }).catch(() => {
    app.notice = { key: 'learn.failed' };
    ctx?.rerender();
    return false;
  }).finally(() => {
    btn?.removeAttribute('aria-busy');
    if (btn) btn.disabled = false;
    work?.removeAttribute('inert');
  });
}
/**
 * FIX-1 (L147): a reload on #/learn/play/<drill or g-iv-… id>, awaited by main.ts before the workspace's first editor, so the
 * editor is built once for the drill (never the story's, then rebuilt). Loads only the chunks; `lab` seeds behind it.
 * False (unknown id, a chunk that failed): main.ts falls back to openGeneral after the router starts.
 */
export async function bootGeneral(id: string): Promise<boolean> {
  try {
    if (isInterviewId(id)) (await loadIvUi()).reopen(id);
    else await (await loadDrillUi()).openDrill(id, false);
    if (isInterviewId(id)) void loadDrillUi().then((m) => m.prepareLab()).catch(() => {});
    return generalWork();
  } catch {
    return false;
  }
}
export const startDrillMode =(ticket: Ticket, drill: Drill): void => enter({ kind: 'drill', ticket, drill, wrong: 0 });

/**
 * v17 I5 (L144): the interview room UI (src/ui/interviewView.ts) and its content (src/interviewSources.ts) are lazy chunks
 * (budget `interview`); main values reach the UI only through InterviewDeps (Plan 6 U3). A run is session mode `interview`
 * on `lab` (keepsWork() false: no history, no graded SQL); it never calls complete() and writes nothing to the Save.
 */
let ivUi: typeof import('./interviewView') | undefined;
const loadIvUi = () => Promise.all([import('./interviewView'), loadInterview()]).then(([m, content]) => {
  if (!ivUi) m.initInterview({
    h, nodes, richText, announce, getLang, locale, app, actions, session, ivItemId, ivHooks, readDraft, today, readJson, writeJson, hashOf, drillHash,
    SKILLS, knownSkills, loadTickets, showPane, prefs: { key: INTERVIEW_KEY, parse: parseInterviewPrefs, textMax: TEXT_MAX, elapsed, setPresence }, enter: (run) => enter({ kind: 'interview', run }), leave: leaveGeneral, startRun: (id, timer, fresh) => void startInterview(id, timer, fresh),
    openEditor: (force) => {
      ctx?.work.setTicket(activeTicket(), activeStep(), force);
      ctx?.work.focus();
    },
  }, content);
  return (ivUi = m);
});
/** Seeds `lab` (and the lab columns for autocomplete) and loads the interview chunk, then runs `then` on it. */
function withInterview(then: (m: typeof import('./interviewView')) => void): Promise<boolean> {
  const btn = document.activeElement instanceof HTMLButtonElement ? document.activeElement : undefined;
  btn?.setAttribute('aria-busy', 'true');
  if (btn) btn.disabled = true;
  return Promise.all([loadIvUi(), loadDrillUi().then((m) => m.prepareLab())]).then(([m]) => {
    then(m);
    return true;
  }).catch(() => {
    app.notice = { key: 'learn.failed' };
    ctx?.rerender();
    return false;
  }).finally(() => {
    btn?.removeAttribute('aria-busy');
    if (btn) btn.disabled = false;
  });
}
/** List page: start a set or take-home (`fresh`) or resume the one in progress. */
export const startInterview = (id: string, timer: boolean, fresh: boolean): Promise<boolean> => withInterview((m) => m.start(id, timer, fresh));
/** A reload, Back or Forward on #/learn/play/<g-iv-…> (main.ts): reopen that run at that question (`still` as in startDrill). */
export const reopenInterview = (item: string, still: () => boolean = () => true): Promise<boolean> => withInterview((m) => {
  if (still()) m.reopen(item);
});
/** work.ts onStepSolved: a take-home's next step (main.ts sends story reviews to nextStep()); `sql` = what was graded. */
export const interviewStep = (sql: string): void => ivUi?.stepSolved(sql);
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
  if (item && startPractice([item])) return true;
  // L145: learned through a promotion review taken early, no finished task practises it: its page (lesson + drills), never a dead button.
  location.hash = `${hashOf('learn')}/skill/${skill}`;
  return false;
}

/** Entry 3: redo a finished task, another variant when it has one. Never a promotion review (L10). */
export function startRetry(ticketId: string): boolean {
  const tpl = templates().get(ticketId);
  return !!tpl && tpl.beat !== 'boss' && done().has(ticketId) && startPractice([retryItem(tpl, Math.random)]);
}

/** work.ts onSolved: Practice moves Leitner boxes only; a lane task gives flat XP; the story completes the ticket (XP, animation). */
export const onSolved = (tk: Ticket, sql: string): void =>
  (session.mode.kind === 'practice' ? onPracticeSolved() : session.mode.kind === 'lane' ? completeLane(tk)
    : session.mode.kind === 'drill' ? drillUi?.completeDrill(tk) : session.mode.kind === 'interview' ? ivUi?.solved(sql) : actions.complete(tk));

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
  if (run.placement) { // L145: the entry check never moves a box down, never counts in the practice totals
    if (ok) app.save.review = seedReview(app.save.review, item.skills, day);
    persist(true);
    run.result = ok ? 'ok' : 'weak';
    if (ok) run.passed++;
    reviewedDrills.add(item.ticketId);
    ctx?.rerender();
    return;
  }
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

const TITLE = { id: 'brief-title', tabindex: '-1', class: 'm-0 text-title font-bold' };

/** v16 (v7 §5.3, L142): a `#/share` link's SQL. `ask` = the player's own draft would be replaced: they choose first. */
let shared: { sql: string; ask: boolean } | undefined;
let shareLine: Node | string = '';
/** Opens the open domain's Sandbox with a shared query in the editor, never run (main.ts, after the route). */
export function openShared(sql: string): void {
  const lock = sandboxLock();
  if (lock) {
    app.notice = { key: 'share.locked', params: { why: t(lock) } };
    return void ctx?.rerender();
  }
  const draft = domainSlot(app.save, activeDomain()).sandboxDraft;
  shared = { sql, ask: !!draft.trim() && draft.trim() !== sql.trim() };
  startSandbox();
  if (!shared.ask) ctx?.work.setDoc(sql);
  ctx?.rerender();
}
async function shareLink(): Promise<void> {
  const sql = ctx?.work.currentSql().trim() ?? '';
  if (!sql) return;
  const say = (v: Node | string) => {
    shareLine = v;
    ctx?.rerender();
  };
  if (sql.length > SHARE_MAX) return say(t('sbx.shareLong', { max: SHARE_MAX }));
  // FIX-1 (L147): never a link for SQL on the player's imported tables (the same guard as the exports); unsure = no link.
  const mine = await meChunk().then((m) => m.readsImported(sql), () => undefined);
  if (mine !== false) return say(t(mine ? 'sbx.shareMine' : 'me.failed'));
  const url = `${location.origin}${location.pathname}${shareHash(sql, activeDomain())}`;
  const manual = () => say(h('label', { class: 'block' }, t('sbx.shareManual'), h('input', { type: 'text', readonly: true, value: url, class: 'mt-1 block w-full rounded-(--r-ctl) border border-line bg-panel px-2 py-1 font-mono text-caption', onfocus: (e: Event) => (e.target as HTMLInputElement).select() })));
  // No Clipboard API (an http origin, an old browser): the box to copy by hand, never a throw.
  if (typeof navigator.clipboard?.writeText !== 'function') return manual();
  navigator.clipboard.writeText(url).then(() => say(t('sbx.shareDone')), manual);
}

function sandboxPane(host: HTMLElement): void {
  const s = shared;
  const strip = s && h('div', { class: 'mb-3 rounded-(--r-ctl) bg-warn-soft p-3 text-body-sm ring-1 ring-warn/40', role: 'status' },
    h('p', { class: 'm-0' }, t(s.ask ? 'share.ask' : 'share.note')),
    s.ask ? h('div', { class: 'actions mb-0' },
      h('button', { type: 'button', class: 'primary', onclick: () => { s.ask = false; ctx?.work.setDoc(s.sql); ctx?.rerender(); } }, t('share.open')),
      h('button', { type: 'button', onclick: () => { shared = undefined; ctx?.rerender(); } }, t('share.keep'))) : null);
  host.replaceChildren(
    h('h2', TITLE, t('sbx.title')),
    strip ?? '',
    h('p', { class: 'text-[15px] leading-relaxed' }, t('sbx.intro')),
    h('div', { class: 'mb-3' },
      h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1 text-body-sm', onclick: () => void shareLink() }, icon('link', 'size-4'), t('sbx.share')),
      shareLine ? h('div', { class: 'mt-1 text-body-sm', role: 'status' }, shareLine) : null),
    renderMyData(),
    h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit'))),
  );
}

function practicePane(host: HTMLElement, run: PracticeRun): void {
  const finished = run.index >= run.items.length;
  const p = run.placement; // L145: the General entry check has its own words
  const status = finished ? t(p ? 'place.done' : 'prac.done', { ok: run.passed, n: run.items.length })
    : t(p ? 'place.banner' : 'prac.banner', { i: run.index + 1, n: run.items.length });
  const banner = h('div', { class: 'mb-3 rounded-(--r-ctl) bg-accent-soft p-3 ring-1 ring-accent', role: 'status' },
    finished ? h('h2', TITLE, status) : h('p', { class: 'm-0 font-semibold' }, status),
    run.result ? h('p', { class: 'mt-1 mb-0' }, t(run.result === 'ok' ? (p ? 'place.ok' : 'prac.ok') : (p ? 'place.weak' : 'prac.weak'))) : null,
    p && !finished && !run.result ? h('p', { class: 'mt-1 mb-0 text-body-sm' }, t('place.rule')) : null,
    h('div', { class: 'actions mb-0' },
      run.result && !finished ? h('button', { type: 'button', class: 'primary', onclick: () => nextItem() }, t('prac.next')) : null,
      p && !finished && !run.result ? h('button', { type: 'button', onclick: () => nextItem() }, t('place.skip')) : null, // a skipped item writes nothing
      generalWork() ? h('button', { type: 'button', onclick: () => leaveGeneral() }, t('prac.exitReview'))
        : h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit'))));
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
  host.querySelector('[data-brief-extra]')?.replaceWith(skillChips(tk) ?? '', optionalNote(tk) ?? '', (tk.beat === 'teach' && goalCard(tk.chapter)) || '');
  if (!done().has(tk.id)) {
    const early = earlyCard(tk); // L145: last in the brief, under the task, so it never competes with the work
    if (early) host.append(early);
    return;
  }
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
  const finished = practiceFinished() || interviewClosed(); // v17: a set's summary, a take-home's conclusion: no editor
  byId('work').hidden = finished;
  byId('split-col').hidden = finished; // no draggable splitter beside an empty column
  if (m.kind === 'sandbox') sandboxPane(host);
  else if (m.kind === 'practice') practicePane(host, m.run);
  else if (m.kind === 'lane') lanePane(host, m.ticket);
  else if (m.kind === 'interview') {
    if (ivUi) ivUi.pane(host, m.run);
    else void loadIvUi().then(() => ctx?.rerender());
  }
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
      h('h2', { id: 'review-title', class: 'm-0 text-title font-bold' }, t('prac.section')),
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
      h('h2', { id: 'warmup-title', class: 'm-0 text-title font-bold' }, t('warmup.title')),
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
  id: 'practice', area: 'top', order: 30, label: 'nav.practiceShort', icon: NAV_ICON.practice, href: hashOf('practice'),
  current: (r) => r === 'practice' || (r === 'play' && (session.mode.kind === 'practice' || session.mode.kind === 'drill')),
});
registerNav({
  id: 'sandbox', area: 'domain', order: 30, label: 'nav.sandbox', icon: NAV_ICON.sandbox, get href() { return hashOf('play'); },
  current: (r) => r === 'play' && session.mode.kind === 'sandbox',
  onclick: () => (session.mode.kind === 'sandbox' ? go('play') : startSandbox()),
});
registerHomeSection({ id: 'review', order: 22, span: 'full', pages: ['practice'], render: reviewCard });
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
/** v17: #/learn/interview, drawn by the interview chunk from its content and the pref (no DB wait). */
let ivLoad: 'idle' | 'loading' | 'failed' = 'idle';
function interviewSection(): HTMLElement {
  if (ivUi) return ivUi.listPage();
  if (ivLoad === 'idle') {
    ivLoad = 'loading';
    void ctx?.db.ensure('lab').catch(() => undefined); // seeded in the background: a run opens faster
    loadIvUi().then(() => (ivLoad = 'idle'), () => (ivLoad = 'failed')).finally(() => ctx?.rerender());
  }
  return ivLoad === 'failed'
    ? h('div', { role: 'alert', class: 'space-y-2' }, h('p', { class: 'm-0' }, t('learn.failed')),
      h('button', { type: 'button', onclick: () => { ivLoad = 'idle'; ctx?.rerender(); } }, t('data.retry')))
    : h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, loader(), t('learn.loading'));
}
function learnSection(): HTMLElement {
  if (isInterviewPage(location.hash)) return interviewSection();
  const page = generalNow() && drillUi?.learnPage();
  if (page) return page;
  if (learnLoad === 'idle') loadLearn();
  return learnLoad === 'failed'
    ? h('div', { role: 'alert', class: 'space-y-2' }, h('p', { class: 'm-0' }, t('learn.failed')),
      h('button', { type: 'button', onclick: () => { loadLearn(); ctx?.rerender(); } }, t('data.retry')))
    : h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, loader(), t('learn.loading'));
}
registerHomeSection({ id: 'module', order: 10, span: 'full', pages: ['learn'], render: learnSection });
registerHomeSection({ id: 'drills', order: 23, span: 'full', pages: ['practice'], render: drillHub }); // V22-C: on Home the session card holds the weakest skill instead
/** v17 I5 (L144): Practise SQL links to the interview room (#/learn/interview); drawn from main text only, no chunk. */
function interviewCard(): HTMLElement {
  return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-4 p-5'), 'aria-labelledby': 'iv-card-title' },
    h('div', { class: 'min-w-48 flex-1' },
      h('h2', { id: 'iv-card-title', class: 'm-0 text-title font-bold' }, t('prac.interview')),
      h('p', { class: 'mt-1 mb-0 text-[15px] text-muted' }, t('prac.interviewDesc'))),
    h('a', { href: INTERVIEW_PAGE, class: cx(BTN_SECONDARY, 'px-4 py-2 no-underline') }, t('prac.interviewGo')));
}
registerHomeSection({ id: 'interview', order: 24, span: 'full', pages: ['practice'], render: interviewCard });
registerHomeSection({ id: 'warmup', order: 21, span: 'full', pages: ['practice'], render: warmupCard });
/**
 * v10 N6 (L157): "Việc bạn từng vấp" on Practise SQL: finished story tasks of the open domain that passed only after 3+ wrong
 * Submits (device pref cargo-query/attempts, never the Save). Each opens as Practice (another variant, 0 XP) via startRetry.
 */
export function stumbleCard(): HTMLElement | null {
  const list = stumbledTasks(app.tickets, done(), readAttempts());
  if (list.length === 0) return null;
  const lang = getLang();
  return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'stumble-title' },
    h('h2', { id: 'stumble-title', class: 'm-0 text-title font-bold' }, t('stumble.title')),
    h('p', { class: 'mt-1 mb-3 text-[15px] text-muted' }, t('stumble.intro', { n: STUMBLE_WRONG })),
    h('ul', { class: 'm-0 grid list-none gap-2 p-0' }, ...list.map((x) => {
      const title = textOf(app.tickets.find((tk) => tk.id === x.ticketId)!, lang).title;
      return h('li', {}, h('button', {
        type: 'button', class: 'flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-left',
        'aria-label': t('stumble.aria', { title, n: x.wrong }), onclick: () => void startRetry(x.ticketId),
      }, h('span', { class: 'min-w-0 flex-1 font-semibold' }, title),
        h('span', { class: 'shrink-0 text-body-sm text-muted' }, t('stumble.wrong', { n: x.wrong })),
        h('span', { class: 'shrink-0 text-body-sm font-semibold text-accent' }, t('stumble.go'))));
    })));
}
registerHomeSection({ id: 'stumble', order: 25, span: 'full', pages: ['practice'], render: stumbleCard });

/**
 * V22-C (L208): Home's one "Today's session" card, in place of the warm-up, review and drill cards (still on #/practice) and of the
 * resume line: 1–4 things that already exist, with minutes, and one Start button for the first. Before the tour ends, the resume line.
 */
function sessionCard(m: HomeModel): HTMLElement | null {
  if (!showsSession(app.save.completed.length, readTour(), coachDone())) return resumeLine();
  const r = resumeNow();
  const weakest = m.skills.filter((s) => s.state === 'learned').sort((a, b) => a.level - b.level)[0]?.skill;
  const plan = sessionPlan({ warmup: warmupToday(() => 0).length, due: reviewCount(), next: !!r, weakest: weakest?.id });
  if (!plan.length) return null;
  const label = (it: SessionItem): string =>
    it.kind === 'next' ? t('session.next', { title: resumeName(r!) })
    : it.kind === 'skill' ? t('session.skill', { skill: weakest!.label[getLang()] })
    : t(it.kind === 'warmup' ? 'session.warmup' : 'session.review', { n: it.n });
  const start = (it: SessionItem): void => {
    if (it.kind === 'warmup') void startPractice(warmupToday(), true);
    else if (it.kind === 'skill') void startSkill(it.skill);
    else if (it.kind === 'next') openResume(r!);
    else void startToday();
  };
  return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'session-title', 'data-session': '' },
    h('div', { class: 'flex flex-wrap items-baseline justify-between gap-x-3' },
      h('h2', { id: 'session-title', class: 'm-0 text-title font-bold' }, t('session.title')),
      h('span', { class: 'text-body-sm text-muted' }, t('session.total', { n: plan.reduce((s, it) => s + it.min, 0) }))),
    h('ol', { class: 'mt-3 mb-0 grid gap-1 pl-5' }, ...plan.map((it) =>
      h('li', {}, label(it), ' ', h('span', { class: 'text-body-sm text-muted' }, t('session.min', { n: it.min }))))),
    h('div', { class: 'mt-4 flex flex-wrap items-center gap-x-4 gap-y-2' }, // the goal's summary sits beside Start; open, it takes the row below
      h('button', { type: 'button', class: cx(BTN_GO, 'px-5 py-2'), onclick: () => start(plan[0]) }, t('session.start')),
      goalBox()));
}

let goalOpen = false; // Home redraws on every rerender(): the <details> keeps its state across them
/** V22-C (L209): the optional weekly goal (off by default) and a weekly reminder as an .ics file built here. */
function goalBox(): HTMLElement {
  const g = readGoal();
  const set = (p: Goal): void => {
    writeGoal({ ...g, ...p });
    ctx?.rerender();
  };
  const field = 'rounded-(--r-inset) bg-panel px-2 py-1 ring-1 ring-line';
  const lbl = (text: string, el: HTMLElement): HTMLElement => h('label', { class: 'grid gap-1 text-body-sm font-semibold' }, text, el);
  const day = g.weekday ?? 1;
  const time = g.remindAt ?? '19:00';
  const box = h('details', { class: goalOpen ? 'w-full' : 'min-w-0', open: goalOpen, ontoggle: () => { goalOpen = box.open; box.className = goalOpen ? 'w-full' : 'min-w-0'; } },
    h('summary', { class: 'cursor-pointer text-body-sm font-semibold text-accent' }, t('session.more')),
    h('div', { class: 'mt-3 flex flex-wrap items-end gap-3' },
      lbl(t('goal.label'), h('select', { class: field, onchange: (e: Event) => {
        const n = Number((e.target as HTMLSelectElement).value);
        set({ perWeek: PER_WEEK.find((x) => x === n) });
      } }, h('option', { value: '0', selected: !g.perWeek }, t('goal.off')),
      ...PER_WEEK.map((n) => h('option', { value: String(n), selected: g.perWeek === n }, t('goal.n', { n }))))),
      lbl(t('remind.day'), h('select', { class: field, onchange: (e: Event) => set({ weekday: Number((e.target as HTMLSelectElement).value) }) },
        ...[1, 2, 3, 4, 5, 6, 0].map((d) => h('option', { value: String(d), selected: d === day },
          new Date(2026, 10, 15 + d).toLocaleDateString(locale(), { weekday: 'long' }))))), // 2026-11-15 is a Sunday
      lbl(t('remind.time'), h('input', { type: 'time', class: field, value: time, onchange: (e: Event) => set({ remindAt: (e.target as HTMLInputElement).value }) })),
      h('button', { type: 'button', class: cx(BTN_SECONDARY, 'px-4 py-2'), onclick: async () => {
        const ics = (await import('../ics')).reminderIcs({ weekday: day, time, summary: t('remind.summary'), description: t('remind.desc'), url: location.origin + location.pathname, now: new Date() });
        const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
        h('a', { href: url, download: 'boondata-reminder.ics' }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } }, t('remind.add'))),
    h('p', { class: 'mt-2 mb-0 text-body-sm text-muted' }, t('remind.note')));
  return box;
}
registerHomeSection({ id: 'resume', order: 10, span: 'full', pages: ['home'], render: sessionCard }); // same id replaces homeView's resume line
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
