import { loadTicketTemplates } from '../content';
import { learnedSkills, type HomeModel } from '../home';
import { t } from '../i18n';
import { applyResult, isSuccess, pickForSkill, retryItem, type PracticeItem } from '../practice';
import { hashOf } from '../route';
import { activeStep, activeTicket, isStory, practiceFinished, reviewCount, reviewToday, session, today, type Mode, type PracticeRun } from '../session';
import { actions, app, done, persist, selected } from '../state';
import type { Ticket } from '../tickets';
import { BTN_GO, CARD, cx } from '../theme';
import { applyVariant } from '../variants';
import { renderBrief } from './brief';
import { goalCard, skillChips, wrapUp } from './chapterView';
import { byId, h } from './dom';
import { homeHooks, registerHomeSection, registerMode } from './homeView';
import { go } from './router';
import { registerNav } from './topbar';
import type { WorkArea } from './work';

const templates = new Map(loadTicketTemplates().map((tk) => [tk.id, tk]));
let ctx: { work: WorkArea; rerender(): void } | undefined;
let runSeq = 0;

/** Called once from main.ts, right after mountWork(). */
export function initModes(c: { work: WorkArea; rerender(): void }): void {
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

export function startPractice(items: PracticeItem[]): boolean {
  const usable = items.filter((i) => templates.has(i.ticketId));
  if (usable.length === 0) return false;
  enter({
    kind: 'practice',
    run: {
      id: ++runSeq,
      items: usable,
      tickets: usable.map((i) => applyVariant(templates.get(i.ticketId)!, i.variant)),
      index: 0,
      wrong: 0,
      hints: 0,
      passed: 0,
      draft: '',
    },
  });
  return true;
}

export const startSandbox = (): void => enter({ kind: 'sandbox' });
export const backToStory = (): void => enter({ kind: 'story' });

/** Entry 1: today's review (D2). Nothing due (e.g. the day changed since the button was drawn): Home with a notice (L37). */
export function startToday(): boolean {
  if (startPractice(reviewToday())) return true;
  app.notice = { key: 'prac.nothingDue' };
  go('home'); // already on Home: no hashchange, so redraw ourselves
  ctx?.rerender();
  return false;
}

/** Entry 2: one skill (Home skill topics). */
export function startSkill(skill: string): boolean {
  const item = pickForSkill(skill, [...templates.values()], done(), Math.random);
  return item ? startPractice([item]) : false;
}

/** Entry 3: redo a finished task, another variant when it has one. Never a promotion review (L10). */
export function startRetry(ticketId: string): boolean {
  const tpl = templates.get(ticketId);
  return !!tpl && tpl.beat !== 'boss' && done().has(ticketId) && startPractice([retryItem(tpl, Math.random)]);
}

/** Nav "Practice" (P6): today's due skills, else one learned skill at random; false when nothing is learned yet. */
function startAny(): boolean {
  if (startPractice(reviewToday())) return true;
  const learned = [...learnedSkills(app.tickets, done())];
  return learned.length > 0 && startSkill(learned[Math.floor(Math.random() * learned.length)]);
}

/** work.ts onSolved: Practice moves Leitner boxes only; the story completes the ticket (XP, animation). */
export const onSolved = (tk: Ticket): void => (session.mode.kind === 'practice' ? onPracticeSolved() : actions.complete(tk));

export function onPracticeWrong(): void {
  if (session.mode.kind === 'practice') session.mode.run.wrong++;
}

/** Correct submit in Practice: 0 XP, no completion animation; moves the Leitner boxes of the item's skills. */
export function onPracticeSolved(): void {
  if (session.mode.kind !== 'practice') return;
  const run = session.mode.run;
  const item = run.items[run.index];
  if (!item || run.result) return;
  const ok = isSuccess(run.wrong, run.hints);
  const next = applyResult({ review: app.save.review, practice: app.save.practice }, item.skills, ok, today());
  app.save.review = next.review;
  app.save.practice = next.practice;
  persist(true);
  run.result = ok ? 'ok' : 'weak';
  if (ok) run.passed++;
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
    h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit'))),
  );
}

function practicePane(host: HTMLElement, run: PracticeRun): void {
  const finished = run.index >= run.items.length;
  const status = finished ? t('prac.done', { ok: run.passed, n: run.items.length }) : t('prac.banner', { i: run.index + 1, n: run.items.length });
  const banner = h('div', { class: 'mb-3 rounded-xl bg-accent-soft p-3 ring-1 ring-accent', role: 'status' },
    finished ? h('h2', TITLE, status) : h('p', { class: 'm-0 font-semibold' }, status),
    run.result ? h('p', { class: 'mt-1 mb-0' }, t(run.result === 'ok' ? 'prac.ok' : 'prac.weak')) : null,
    h('div', { class: 'actions mb-0' },
      run.result && !finished ? h('button', { type: 'button', class: 'primary', onclick: () => nextItem() }, t('prac.next')) : null,
      h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit'))));
  const body = h('div');
  if (!finished) {
    const tk = run.tickets[run.index];
    renderBrief(body, tk, 0);
    body.querySelector('header')?.after(skillChips(tk) ?? '');
  }
  host.replaceChildren(banner, body);
}

function storyPane(host: HTMLElement): void {
  const tk = selected();
  renderBrief(host, tk, app.stepIndex);
  host.querySelector('header')?.after(skillChips(tk) ?? '', (tk.beat === 'teach' && goalCard(tk.chapter)) || '');
  if (!done().has(tk.id)) return;
  if (tk.beat !== 'boss') {
    host.append(h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => startRetry(tk.id) }, t('prac.retry'))));
    return;
  }
  const d = done();
  const quick = app.tickets.filter((x) => x.chapter === tk.chapter && x.beat !== 'boss' && d.has(x.id));
  host.append(wrapUp(tk.chapter, quick.length ? () => startRetry(quick[Math.floor(Math.random() * quick.length)].id) : undefined));
}

/** Top-bar "Review: N" (P3): N = items in today's queue; hidden when the queue is empty. */
export function renderReviewButton(btn: HTMLButtonElement): void {
  const n = reviewCount();
  btn.hidden = n === 0;
  btn.textContent = t('prog.due', { n });
  btn.title = t('prog.dueTitle');
  btn.onclick = () => void startToday();
}

/** Left pane for the current mode; main.ts rerender() calls this instead of renderBrief(). */
export function renderLeft(host: HTMLElement): void {
  const m = session.mode;
  byId('work').hidden = practiceFinished();
  if (m.kind === 'sandbox') sandboxPane(host);
  else if (m.kind === 'practice') practicePane(host, m.run);
  else storyPane(host);
}

/** Home "Review" card (D2 entry 1). Always shown, so nav "Practice" on a fresh save lands on its explanation (P6). */
function reviewCard(m: HomeModel): HTMLElement {
  const due = reviewCount();
  const intro = m.learned === 0 ? t('prac.locked') : t(due ? 'prac.dueIntro' : 'prac.noneDue', { n: due });
  const p = app.save.practice;
  return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-4 p-5'), 'aria-labelledby': 'review-title' },
    h('div', { class: 'min-w-0 flex-1' },
      h('h2', { id: 'review-title', class: 'm-0 text-lg font-bold' }, t('prac.section')),
      h('p', { class: 'mt-1 mb-0 text-[15px] text-muted' }, intro),
      p.solved + p.weak ? h('p', { class: 'mt-1 mb-0 text-sm text-muted' }, t('prac.stats', { solved: p.solved, weak: p.weak })) : null),
    due ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => startToday() }, t('prac.today', { n: due })) : null);
}

// Same id replaces topbar.ts's 'play' entry: "Workspace" is current only in story mode.
registerNav({
  id: 'play', order: 20, label: 'nav.play', href: hashOf('play'),
  current: (r) => r === 'play' && isStory(),
  onclick: () => (isStory() ? go('play') : backToStory()),
});
registerNav({
  id: 'practice', order: 30, label: 'nav.practice', href: hashOf('play'),
  current: (r) => r === 'play' && session.mode.kind === 'practice',
  // Nothing learned yet: Home's Review card explains how practice opens (P6).
  onclick: () => (session.mode.kind === 'practice' ? go('play') : startAny() || go('home')),
});
registerNav({
  id: 'sandbox', order: 40, label: 'nav.sandbox', href: hashOf('play'),
  current: (r) => r === 'play' && session.mode.kind === 'sandbox',
  onclick: () => (session.mode.kind === 'sandbox' ? go('play') : startSandbox()),
});
registerHomeSection({ id: 'review', order: 22, span: 'full', render: reviewCard });
registerMode({
  id: 'sandbox', order: 10, icon: '🧪', tint: 'bg-orange-100 dark:bg-orange-950',
  title: 'mode.sandbox', desc: 'mode.sandboxDesc', open: () => startSandbox(),
});
homeHooks.levelOf = (skill) => app.save.review[skill]?.box ?? 1;
homeHooks.onSkill = (skill) => void startSkill(skill);
