import type { QueryResult } from '../db/run';
import type { FullLesson, LessonSection } from '../fullLesson';
import { LESSON_SECTIONS } from '../fullLesson';
import type { Drill } from '../general';
import type { Params } from '../i18n';
import { learnText, type LearnKey } from '../i18n/learn';
import type { Skill } from '../progress';
import type { Editor } from './editor';
import type { DrillDeps } from './drillBrief';
import type { IconName } from './icons';

/**
 * v24 R0 (ux-route-v24 §5, L338): a General skill's full lesson page (#/learn/skill/<id> when content/general/lessons/<id>.md
 * exists). Part of the lazy learnui chunk; every main value comes through DrillDeps (Plan 6 U3). Eight sections (product §2.2)
 * in a 720 px reading column, a sticky "In this lesson" TOC from 1280 px (beside it), else a closed in-body TOC and a sticky
 * lesson bar whose button opens the TOC as a sheet. Examples and pitfalls are read-only code with Run (on `lab`, never
 * app.lastRun, drafts, history or XP); "Try editing" swaps one for an editor in place. Practice holds the page's one live
 * editor and its one main button (Submit). `#home` is redrawn by rerender(): everything the player did lives in the maps
 * below (session only, nothing saved) and live editors are reused, so a redraw keeps them.
 */
let d$: DrillDeps;
const lt = (key: LearnKey, params?: Params): string => learnText(d$.getLang(), d$.locale(), key, params);
const cx = (...c: (string | false | undefined)[]): string => c.filter(Boolean).join(' ');

const BTN_GO = 'rounded-full border-0 bg-accent px-4 py-1.5 font-bold text-on-accent shadow-(--shadow-1) hover:bg-accent/90';
const BTN_SECONDARY = 'rounded-full border border-accent bg-panel px-3 py-1 font-bold text-accent hover:bg-accent-soft';
const BTN_GHOST = 'inline-flex min-h-6 items-center gap-1.5 rounded-full border-0 bg-transparent px-2.5 py-1 font-semibold text-accent hover:bg-accent-soft';
const CARD = 'rounded-(--r-card) bg-panel ring-1 ring-line';
const TOC_ROW = 'flex min-h-11 w-full items-center gap-2 border-0 border-l-4 border-transparent bg-transparent px-3 py-1.5 text-left text-body-sm text-ink hover:bg-accent-soft';
/** The section being read (set at draw and by the observer; classes, not aria variants, to keep the CSS small). */
const TOC_NOW = 'border-accent bg-accent-soft font-bold text-accent';
const CHIP = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-sm';

type Out = { result?: QueryResult; error?: unknown; sql: string };
/** Session state, by `<lesson>#<what>`: run outputs, edited SQL, live editors, quiz picks, practice verdict. */
const outs = new Map<string, Out>();
const edited = new Map<string, string>();
const editors = new Map<string, { host: HTMLElement; ed: Editor }>();
const picks = new Map<string, number>();
const opened = new Set<string>();
const verdicts = new Map<string, { ok: boolean; text: string }>();
/** An example's "Reading the result" line, shown once it has run (ux §5.4: result first, explanation after). */
const reads = new Map<string, () => string>();
let observer: IntersectionObserver | undefined;

const SEC_ICON: Record<LessonSection, IconName> = {
  open: 'secOpen', idea: 'kindConcept', syntax: 'secSyntax', examples: 'secRun', pitfalls: 'secPitfall', practice: 'secPractice', quiz: 'kindQuiz', recap: 'secRecap',
};
const secName = (s: LessonSection): string => lt(`fl.sec.${s}` as LearnKey);
const secId = (s: LessonSection): string => `fl-${s}`;

/** Inline `code` and **bold** (bold may hold code: the "Many people think X" line, ux §5.3). */
function inline(text: string): (Node | string)[] {
  const { h } = d$;
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map((part) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? h('strong', {}, ...inline(part.slice(2, -2)))
      : part.startsWith('`') && part.endsWith('`') && part.length > 1 ? h('code', {}, part.slice(1, -1)) : part.replace(/\s*\n\s*/g, ' '));
}
/** Paragraphs of inline text. */
const prose = (text: string): HTMLElement =>
  d$.h('div', { class: 'flex flex-col gap-3 leading-relaxed [&_p]:m-0' }, ...text.trim().split(/\n\s*\n/).map((para) => d$.h('p', {}, ...inline(para))));

/** Read-only SQL, coloured with the editor's --syn-* tokens (keywords, strings, numbers, comments); scrolls sideways, never wraps. */
const KW = /^(SELECT|FROM|WHERE|AS|AND|OR|NOT|IN|IS|NULL|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|JOIN|LEFT|RIGHT|FULL|INNER|OUTER|CROSS|ON|USING|DISTINCT|CASE|WHEN|THEN|ELSE|END|WITH|UNION|ALL|EXCEPT|INTERSECT|ASC|DESC|LIKE|ILIKE|BETWEEN|EXISTS|ANY|OVER|PARTITION|INSERT|INTO|VALUES|UPDATE|SET|DELETE|RETURNING|CREATE|TABLE|INDEX|EXPLAIN|TRUE|FALSE)$/i;
function code(sql: string): HTMLElement {
  const { h } = d$;
  const pre = h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en', tabindex: '0' });
  for (const m of sql.matchAll(/(--[^\n]*)|('(?:[^']|'')*')|("(?:[^"]|"")*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|([\s\S])/g)) {
    const [t, comment, str, , num, word] = m;
    const color = comment ? 'var(--syn-comment)' : str ? 'var(--syn-string)' : num ? 'var(--syn-number)' : word && KW.test(word) ? 'var(--syn-keyword)' : undefined;
    pre.append(color ? h('span', { style: `color:${color}` }, t) : t);
  }
  return pre;
}

function sectionHead(s: LessonSection, aside?: string): HTMLElement {
  const { h } = d$;
  return h('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
    h('h2', { id: `${secId(s)}-h`, class: 'm-0 flex items-center gap-2 text-title font-bold', tabindex: '-1' },
      h('span', { class: 'grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent', 'aria-hidden': 'true' }, d$.icon(SEC_ICON[s], 'size-5')),
      secName(s)),
    aside ? h('span', { class: 'text-body-sm text-muted tabular-nums' }, aside) : null);
}
const section = (s: LessonSection, aside: string | undefined, ...body: (Node | null)[]): HTMLElement =>
  d$.h('section', { id: secId(s), 'data-sec': s, class: 'flex scroll-mt-4 flex-col gap-3', 'aria-labelledby': `${secId(s)}-h` }, sectionHead(s, aside), ...body.filter((x): x is Node => !!x));

/** Runs `sql` on `lab` like "Thử ngay" (runOn: lab seeded on first use), stores the output, redraws `out`. */
async function runInto(key: string, sql: string, out: HTMLElement, btn: HTMLButtonElement, say?: (r: QueryResult) => string): Promise<void> {
  btn.disabled = true;
  out.replaceChildren(d$.h('p', { class: 'm-0 flex items-center gap-2 text-body-sm text-muted' }, d$.loader(), lt('fl.running')));
  await d$.runOn('lab', sql).then((result) => outs.set(key, { result, sql }), (error: unknown) => outs.set(key, { error, sql }));
  btn.disabled = false;
  const o = outs.get(key)!;
  if (o.result && say) d$.announce(say(o.result));
  if (out.isConnected) drawOut(key, out, reads.get(key)?.());
  else d$.actions.rerender();
  refreshCounts();
}

/** A run's result under its code: status line (role=status), ≤ 5 rows, or Postgres' error with its SQLSTATE. */
function drawOut(key: string, out: HTMLElement, read?: string): void {
  const { h } = d$;
  const o = outs.get(key);
  if (!o) return void out.replaceChildren();
  out.replaceChildren(...(o.result
    ? [h('p', { role: 'status', class: 'm-0 flex items-center gap-1.5 text-body-sm font-semibold text-good' }, d$.icon('check', 'size-4'),
      lt('fl.rows', { n: o.result.rows.length, ms: Math.max(1, Math.round(o.result.ms ?? 0)) })),
    d$.renderResult(o.result, undefined, 5),
    read ? h('p', { class: 'm-0 text-body-sm' }, h('b', {}, lt('fl.read')), ' ', ...inline(read)) : null]
    : [h('div', { role: 'status' }, d$.errorView(o.error, true, o.sql))]).filter((x): x is HTMLElement => !!x));
}

/** One live editor per key, reused across redraws (a redraw must never drop what the player typed). */
function editorFor(key: string, doc: string, onRun: () => void, onSubmit: () => void): HTMLElement {
  const had = editors.get(key);
  if (had) return had.host;
  const host = d$.h('div', { class: 'editor overflow-hidden rounded-(--r-inset) ring-1 ring-line', lang: 'en', 'data-fl-editor': key });
  const ed = d$.createEditor(host, { doc, schema: {}, label: lt('fl.editorLabel'), onChange: (v) => edited.set(key, v), onRun, onSubmit, onSelection: () => {} });
  Object.defineProperty(host, 'value', { get: () => ed.getValue(), set: (v: string) => ed.setValue(v) }); // the smoke/e2e hook (like engineView's)
  editors.set(key, { host, ed });
  return host;
}
const sqlOf = (key: string, original: string): string => editors.get(key)?.ed.getValue() ?? edited.get(key) ?? original;

/** An example: title row (Try editing, Run), read-only code or its editor, the result and the "Reading the result" line. */
function exampleBlock(l: FullLesson, i: number, folded: boolean): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const e = l.examples[i];
  const key = `${l.id}#ex${i}`;
  const out = h('div', { class: 'flex flex-col gap-2' });
  const title = lt('fl.example', { i: i + 1, title: e.title[lang] });
  const run: HTMLButtonElement = h('button', { type: 'button', class: cx(BTN_SECONDARY, 'inline-flex min-h-6 items-center gap-1'), 'data-fl-run': key,
    onclick: () => {
      opened.add(key);
      if (details && !details.open) details.open = true;
      void runInto(key, sqlOf(key, e.sql), out, run, (r) => lt('fl.announce', { i: i + 1, n: r.rows.length }));
    } }, d$.icon('run', 'size-4'), lt('fl.run'));
  const editing = editors.has(key);
  const edit = h('button', { type: 'button', class: BTN_GHOST, onclick: () => {
    if (editors.has(key)) {
      if (sqlOf(key, e.sql) !== e.sql && !confirm(lt('fl.resetAsk'))) return;
      editors.get(key)!.ed.destroy();
      editors.delete(key);
      edited.delete(key);
    } else {
      opened.add(key);
      editorFor(key, e.sql, () => run.click(), () => run.click());
    }
    d$.actions.rerender();
    if (editors.has(key)) requestAnimationFrame(() => editors.get(key)?.ed.focus());
  } }, d$.icon(editing ? 'resetCode' : 'editTry', 'size-4'), lt(editing ? 'fl.reset' : 'fl.edit'));
  reads.set(key, () => e.read[d$.getLang()]);
  drawOut(key, out, e.read[lang]);
  const body = h('div', { class: 'flex flex-col gap-2 px-4 py-3' }, editing ? editors.get(key)!.host : code(e.sql), out);
  const actions = h('div', { class: 'flex shrink-0 items-center gap-1 px-3' }, edit, run);
  const head = (tag: 'div'): HTMLElement => h(tag, { class: 'flex flex-wrap items-center justify-between gap-2 px-4 py-3' },
    h('h3', { class: 'm-0 flex min-w-0 items-center gap-2 text-body font-bold' }, d$.icon('secRun', 'size-5 shrink-0 text-accent'), title),
    folded && !outs.has(key) ? h('span', { class: 'text-body-sm text-muted' }, lt('fl.notRun')) : null);
  let details: HTMLDetailsElement | undefined;
  if (folded) {
    details = h('details', { class: cx(CARD, 'group'), open: opened.has(key) || outs.has(key), ontoggle: () => (details!.open ? opened.add(key) : opened.delete(key)) },
      h('summary', { class: 'flex cursor-pointer list-none items-center gap-2 pr-3 [&::-webkit-details-marker]:hidden' },
        h('span', { class: 'min-w-0 flex-1' }, head('div')), d$.icon('down', 'size-4 text-muted [details[open]>summary>&]:rotate-180')),
      h('div', { class: 'flex justify-end' }, actions), body) as HTMLDetailsElement;
    return details;
  }
  return h('article', { class: CARD }, h('div', { class: 'flex flex-wrap items-center justify-between gap-x-2 pr-3' }, h('div', { class: 'min-w-48 flex-1' }, head('div')), actions), body);
}

/** A pitfall: warn-soft card; the wrong query and the fix, each with its own Run (the wrong one really runs). */
function pitfallBlock(l: FullLesson, i: number): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const p = l.pitfalls[i];
  const one = (which: 'wrong' | 'fix'): HTMLElement => {
    const key = `${l.id}#pit${i}${which}`;
    const out = h('div', { class: 'flex flex-col gap-2' });
    drawOut(key, out);
    const btn: HTMLButtonElement = h('button', { type: 'button', class: BTN_GHOST, 'data-fl-run': key, onclick: () => void runInto(key, p[which], out, btn) },
      d$.icon('run', 'size-4'), lt(which === 'wrong' ? 'fl.runWrong' : 'fl.runFix'));
    return h('div', { class: 'flex flex-col gap-1.5' },
      h('div', { class: 'flex flex-wrap items-center gap-2' },
        h('span', { class: cx(CHIP, 'font-bold', which === 'wrong' ? 'bg-bad-soft text-bad' : 'bg-good-soft text-good') }, lt(which === 'wrong' ? 'fl.wrong' : 'fl.fix'))),
      code(p[which]), h('div', {}, btn), out);
  };
  const inner = [one('wrong'), prose(p.why[lang]), one('fix')];
  const title = h('h3', { class: 'm-0 flex items-center gap-2 text-body font-bold' }, d$.icon('secPitfall', 'size-5 shrink-0 text-ink'), lt('fl.pitfall', { i: i + 1, title: p.title[lang] }));
  if (i === 0) return h('article', { class: 'flex flex-col gap-3 rounded-(--r-card) bg-warn-soft p-4' }, title, ...inner);
  const key = `${l.id}#pit${i}`;
  const det = h('details', { class: 'group rounded-(--r-card) bg-warn-soft', open: opened.has(key), ontoggle: () => (det.open ? opened.add(key) : opened.delete(key)) },
    h('summary', { class: 'flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 [&::-webkit-details-marker]:hidden' }, title, d$.icon('down', 'size-4 text-muted [details[open]>summary>&]:rotate-180')),
    h('div', { class: 'flex flex-col gap-3 px-4 py-3' }, ...inner)) as HTMLDetailsElement;
  return det;
}

/** Practice: the quick lesson's "Thử ngay" (expected-result preview, one editor, Run + Submit) and the skill's 4 drills. */
function practice(l: FullLesson, drills: readonly Drill[]): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const quick = d$.loadLessons().get(l.id);
  const key = `${l.id}#try`;
  const out = h('div', { class: 'flex flex-col gap-2' });
  const verdict = h('p', { role: 'status', class: 'm-0', 'data-fl-verdict': '' });
  const drawVerdict = (): void => {
    const v = verdicts.get(key);
    verdict.className = cx('m-0 font-semibold', v && (v.ok ? 'text-good' : 'text-bad'));
    verdict.textContent = v?.text ?? '';
  };
  drawOut(key, out);
  drawVerdict();
  const tryRun: HTMLButtonElement = h('button', { type: 'button', class: BTN_SECONDARY, onclick: () => {
    const sql = sqlOf(key, '');
    if (!sql.trim()) return void (verdicts.set(key, { ok: false, text: lt('fl.tryEmpty') }), drawVerdict());
    void runInto(key, sql, out, tryRun);
  } }, lt('fl.tryRun'));
  const submit: HTMLButtonElement = h('button', { type: 'button', class: cx(BTN_GO, 'ml-auto'), onclick: async () => {
    const sql = sqlOf(key, '');
    if (!quick || !sql.trim()) return void (verdicts.set(key, { ok: false, text: lt('fl.tryEmpty') }), drawVerdict());
    submit.disabled = true;
    verdict.className = 'm-0';
    verdict.textContent = lt('fl.checking');
    try {
      const r = await d$.grade((q) => d$.runOn('lab', q), quick.try.solution, sql, quick.try.ordered);
      verdicts.set(key, r.ok ? { ok: true, text: lt('fl.tryOk') } : { ok: false, text: d$.verdictText(r) });
    } catch (e) {
      verdicts.set(key, { ok: false, text: d$.errorText(e) });
    }
    submit.disabled = false;
    if (verdict.isConnected) drawVerdict();
    else d$.actions.rerender();
  } }, lt('fl.submit'));
  const done = drills.filter((x) => d$.app.save.completed.includes(x.id)).length;
  return section('practice', lt('fl.drillsCount', { k: done, n: drills.length }),
    quick ? h('article', { class: cx(CARD, 'flex flex-col gap-3 p-4') },
      h('h3', { class: 'm-0 text-body font-bold' }, lt('fl.try')),
      prose(quick.try.task[lang]),
      d$.tryPreview(quick.try.solution, 'lab'),
      editorFor(key, edited.get(key) ?? '', () => tryRun.click(), () => submit.click()),
      h('div', { class: 'flex flex-wrap items-center gap-2' }, tryRun, submit),
      verdict, out) : null,
    h('div', { class: 'flex flex-col gap-2' },
      h('h3', { class: 'm-0 text-body-sm font-bold text-muted' }, lt('fl.drills')),
      h('ul', { class: 'm-0 grid list-none gap-2 p-0 sm:grid-cols-2' }, ...drills.map((x) => {
        const ok = d$.app.save.completed.includes(x.id);
        return h('li', {}, h('button', { type: 'button', class: 'flex min-h-11 w-full items-center gap-2 rounded-(--r-ctl) bg-panel px-3 py-2 text-left ring-1 ring-line hover:ring-accent', onclick: () => d$.actions.startDrill(x.id) },
          d$.icon(ok ? 'check' : 'notStarted', cx('size-5 shrink-0', ok ? 'text-good' : 'text-muted')),
          h('span', { class: 'flex-1' }, lt(`drill.kind.${x.kind}` as LearnKey)),
          h('span', { class: 'sr-only' }, ok ? lt('fl.passed') : lt('fl.notYet'))));
      }))));
}

/** Questions: options as 44 px rows; a pick shows right/wrong and the why (nothing saved). */
function quiz(l: FullLesson): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const right = l.quiz.filter((q, i) => picks.get(`${l.id}#q${i}`) === q.answer).length;
  return section('quiz', `${right}/${l.quiz.length}`, ...l.quiz.map((q, i) => {
    const key = `${l.id}#q${i}`;
    const pick = picks.get(key);
    const name = `fl-${l.id}-q${i}`;
    return h('fieldset', { class: cx(CARD, 'm-0 flex flex-col gap-2 p-4') },
      h('legend', { class: 'mb-1 text-body font-bold' }, `${lt('fl.quizQ', { i: i + 1, n: l.quiz.length })} · `, ...inline(q.q[lang])),
      ...q.options.map((o, j) => h('label', { class: cx('flex min-h-11 cursor-pointer items-center gap-2.5 rounded-(--r-ctl) px-3 py-2 ring-1', pick === j ? 'bg-accent-soft ring-2 ring-accent' : 'ring-line hover:ring-accent') },
        h('input', { type: 'radio', name, checked: pick === j, onchange: () => { picks.set(key, j); d$.actions.rerender(); } }),
        h('span', {}, ...inline(o[lang])))),
      pick === undefined ? null : h('div', { role: 'status', class: 'flex flex-col gap-1' },
        h('p', { class: cx('m-0 font-bold', pick === q.answer ? 'text-good' : 'text-bad') }, lt(pick === q.answer ? 'fl.quizRight' : 'fl.quizWrong')),
        prose(q.why[lang])));
  }));
}

/** The TOC as a list of buttons (scrollIntoView; the router owns the hash). `current` gets aria-current=location. */
function tocList(l: FullLesson, current: LessonSection, onPick?: () => void): HTMLElement {
  const { h } = d$;
  return h('ul', { class: 'm-0 flex list-none flex-col p-0' }, ...LESSON_SECTIONS.map((s) => h('li', {},
    h('button', { type: 'button', 'data-toc': s, 'aria-current': s === current ? 'location' : false,
      class: cx(TOC_ROW, s === current && TOC_NOW),
      onclick: () => {
        onPick?.();
        const el = document.getElementById(secId(s));
        el?.scrollIntoView({ behavior: d$.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        document.getElementById(`${secId(s)}-h`)?.focus({ preventScroll: true });
      } },
    d$.icon(SEC_ICON[s], 'size-4 shrink-0 text-muted'), h('span', { class: 'flex-1' }, secName(s)), h('span', { class: 'text-caption text-muted tabular-nums', 'data-toc-count': s }, countOf(l, s))))));
}
/** Progress of the sections that can be counted (ux §5.7): examples run this session, drills passed, questions right. */
let countOf: (l: FullLesson, s: LessonSection) => string = () => '';
let lessonNow: FullLesson | undefined;
let drillsNow: readonly Drill[] = [];
function refreshCounts(): void {
  const l = lessonNow;
  if (!l) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-toc-count]')) el.textContent = countOf(l, el.dataset.tocCount as LessonSection);
  const ran = document.querySelector<HTMLElement>('[data-fl-ran]');
  if (ran) ran.textContent = countOf(l, 'examples');
}

/** Marks the TOC entry of the section being read: the last section heading that passed the top of the reading area. */
function watch(setCurrent: (s: LessonSection) => void): void {
  observer?.disconnect();
  if (typeof IntersectionObserver !== 'function') return;
  observer = new IntersectionObserver((entries) => {
    const top = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.sec as LessonSection);
    if (top.length) setCurrent(top[0]);
  }, { rootMargin: '0px 0px -75% 0px' });
  for (const el of document.querySelectorAll('[data-lesson-page] section[data-sec]')) observer.observe(el);
}
let current: LessonSection = 'open';

export interface LessonCtx { skill: Skill; drills: readonly Drill[]; part?: { n: number; title: string }; prev?: Skill; next?: Skill; level: HTMLElement; done: boolean }

/** The whole page. Called by learnView's skill page when the skill has a full lesson (loaded and parsed by the caller). */
export function lessonPage(deps: DrillDeps, l: FullLesson, c: LessonCtx): HTMLElement {
  d$ = deps;
  const { h } = d$;
  const lang = d$.getLang();
  if (lessonNow?.id !== l.id) current = 'open';
  lessonNow = l;
  drillsNow = c.drills;
  countOf = (x, s) => s === 'examples' ? `${x.examples.filter((_, i) => outs.has(`${x.id}#ex${i}`)).length}/${x.examples.length}`
    : s === 'practice' ? `${drillsNow.filter((d) => d$.app.save.completed.includes(d.id)).length}/${drillsNow.length}`
      : s === 'quiz' ? `${x.quiz.filter((q, i) => picks.get(`${x.id}#q${i}`) === q.answer).length}/${x.quiz.length}` : '';

  const setCurrent = (s: LessonSection): void => {
    current = s;
    for (const b of document.querySelectorAll<HTMLElement>('[data-lesson-page] [data-toc]')) {
      const on = b.dataset.toc === s;
      if (on) b.setAttribute('aria-current', 'location');
      else b.removeAttribute('aria-current');
      for (const c of TOC_NOW.split(' ')) b.classList.toggle(c, on);
    }
    const label = document.querySelector('[data-fl-bar-sec]');
    if (label) label.textContent = lt('fl.barSec', { k: LESSON_SECTIONS.indexOf(s) + 1, n: LESSON_SECTIONS.length, name: secName(s) });
  };

  // ux §7: phone/tablet lesson bar (sticky under the top bar) + the TOC sheet
  const sheet = h('dialog', { id: 'fl-toc-sheet', class: 'm-0 mt-auto max-h-[calc(100dvh-2rem)] w-full max-w-none rounded-(--r-card) bg-panel p-0 text-ink shadow-(--shadow-2)', 'aria-labelledby': 'fl-sheet-title',
    onclick: (ev: Event) => { if (ev.target === sheet) sheet.close(); } }) as HTMLDialogElement;
  const opener = h('button', { type: 'button', class: 'flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full border-0 bg-transparent px-3 text-body-sm font-semibold text-ink hover:bg-accent-soft', 'aria-haspopup': 'dialog',
    onclick: () => {
      sheet.replaceChildren(h('div', { class: 'flex items-center justify-between border-b border-line px-4 py-3' },
        h('h2', { id: 'fl-sheet-title', class: 'm-0 text-title font-bold' }, lt('fl.toc')),
        h('button', { type: 'button', class: BTN_GHOST, onclick: () => sheet.close() }, lt('fl.close'))),
      h('nav', { class: 'overflow-auto py-2', 'aria-label': lt('fl.toc') }, tocList(l, current, () => sheet.close())));
      sheet.showModal();
    } }, d$.icon('toc', 'size-5 shrink-0 text-accent'),
  h('span', { class: 'truncate', 'data-fl-bar-sec': '' }, lt('fl.barSec', { k: LESSON_SECTIONS.indexOf(current) + 1, n: LESSON_SECTIONS.length, name: secName(current) })));
  sheet.addEventListener('close', () => opener.focus());
  const bar = h('div', { class: 'sticky top-0 z-20 flex min-h-11 items-center gap-1 border-b border-line bg-panel', 'data-fl-bar': '' },
    c.part ? h('a', { href: `${d$.hashOf('learn')}/sql/${c.part.n}`, class: 'inline-flex min-h-11 min-w-0 items-center gap-1 px-2 text-body-sm font-semibold no-underline' },
      d$.icon('chevronLeft', 'size-4 shrink-0'), h('span', { class: 'truncate' }, lt('learn.moduleTitle', { n: c.part.n, title: c.part.title }))) : null,
    opener, sheet);

  const chips = h('div', { class: 'flex flex-wrap items-center gap-2' },
    h('span', { class: cx(CHIP, 'bg-good-soft font-semibold text-good') }, d$.icon('inApp', 'size-4'), lt('fl.honest')),
    h('span', { class: cx(CHIP, 'bg-surface-2 text-ink') }, d$.skillIcon(c.skill.id, 'size-4'), lt('fl.kind')),
    h('span', { class: cx(CHIP, 'bg-surface-2 text-ink') }, d$.icon('time', 'size-4'), lt('fl.minutes', { n: l.minutes })),
    c.prev && c.part && d$.ROUTE_PARTS.find((p) => p.n === c.part!.n)?.skills.includes(c.prev.id)
      ? h('span', { class: 'inline-flex items-center gap-1.5 text-body-sm text-muted' }, lt('fl.before'),
        h('a', { href: `${d$.hashOf('learn')}/skill/${c.prev.id}`, class: cx(CHIP, 'bg-accent-soft font-semibold text-accent no-underline') }, c.prev.label[lang]))
      : null);

  const inBodyToc = h('details', { class: CARD, 'data-fl-toc': '' },
    h('summary', { class: 'flex min-h-11 cursor-pointer items-center gap-2 px-4 font-semibold' }, d$.icon('toc', 'size-5 text-accent'), lt('fl.tocCount', { n: LESSON_SECTIONS.length })),
    h('nav', { class: 'py-2', 'aria-label': lt('fl.tocBody') }, tocList(l, current)));

  const many = l.examples.length > 3;
  const article = h('article', { class: 'flex min-w-0 flex-col gap-8', 'aria-labelledby': 'home-title' },
    h('div', { class: 'flex flex-col gap-3' }, bar, chips, c.level, inBodyToc),
    section('open', undefined, prose(l.open[lang]),
      h('div', { class: 'rounded-(--r-inset) bg-surface-2 px-4 py-3' },
        h('p', { class: 'm-0 mb-1.5 text-caption font-bold tracking-wider text-muted uppercase' }, lt('fl.objectives')),
        h('ul', { class: 'm-0 flex list-disc flex-col gap-1 pl-5' }, ...l.objectives.map((o) => h('li', {}, ...inline(o[lang])))))),
    section('idea', undefined, prose(l.idea[lang])),
    section('syntax', undefined, code(l.syntax.sql), l.syntax.text ? prose(l.syntax.text[lang]) : null,
      l.syntax.options.length ? h('div', { class: cx(CARD, 'overflow-x-auto') }, h('table', { class: 'w-full border-collapse text-body-sm' },
        h('thead', {}, h('tr', { class: 'bg-surface-2' }, h('th', { scope: 'col', class: 'px-3 py-2 text-left' }, lt('fl.optWrite')), h('th', { scope: 'col', class: 'px-3 py-2 text-left' }, lt('fl.optMeans')))),
        h('tbody', {}, ...l.syntax.options.map((o) => h('tr', { class: 'border-t border-line' },
          h('td', { class: 'px-3 py-2 align-top' }, h('code', { lang: 'en' }, o.code)), h('td', { class: 'px-3 py-2 whitespace-normal' }, o.text[lang])))))) : null),
    section('examples', undefined, ...l.examples.map((_, i) => exampleBlock(l, i, many && i > 0))),
    section('pitfalls', undefined, ...l.pitfalls.map((_, i) => pitfallBlock(l, i))),
    practice(l, c.drills),
    quiz(l),
    section('recap', undefined,
      h('ul', { class: 'm-0 flex list-disc flex-col gap-1 pl-5' }, ...l.recap.map((r) => h('li', {}, ...inline(r[lang])))),
      h('ul', { class: 'm-0 flex list-none flex-col gap-1 p-0' }, ...l.sources.map((u) => h('li', {},
        h('a', { href: u, target: '_blank', rel: 'noopener noreferrer', class: 'inline-flex min-h-6 items-center gap-1.5' }, d$.icon('external', 'size-4'), sourceName(u),
          h('span', { class: 'sr-only' }, ` (${lt('adv.newTab')})`))))),
      pager(c)));
  // the examples' "k/n run" sits in the section head (ux §5.3 #4)
  article.querySelector('#fl-examples > div')?.append(h('span', { class: 'text-body-sm text-muted tabular-nums', 'data-fl-ran': '' }, countOf(l, 'examples')));

  const aside = h('aside', { class: 'hidden' },
    h('nav', { class: 'sticky top-0 flex flex-col gap-2 pt-4', 'aria-label': lt('fl.toc') },
      h('p', { class: 'm-0 flex items-center gap-2 px-3 text-caption font-bold tracking-wider text-muted uppercase' }, d$.icon('toc', 'size-4'), lt('fl.toc')),
      tocList(l, current)));
  const page = h('div', { class: 'grid gap-8', 'data-lesson-page': l.id }, article, aside);
  requestAnimationFrame(() => { if (page.isConnected) watch(setCurrent); });
  return page;
}

/** "PostgreSQL · SELECT lists" from a docs URL (the link text says where it goes, L299). */
function sourceName(u: string): string {
  const m = /postgresql\.org\/docs\/[^/]+\/([\w-]+)\.html/.exec(u);
  return m ? `PostgreSQL docs · ${m[1].replace(/^(sql|queries|functions|tutorial)-/, '').replace(/-/g, ' ')}` : u.replace(/^https:\/\//, '');
}

function pager(c: LessonCtx): HTMLElement {
  const { h } = d$;
  const lang = d$.getLang();
  const link = (s: Skill | undefined, dir: 'prev' | 'next'): HTMLElement | null => s ? h('a', {
    href: `${d$.hashOf('learn')}/skill/${s.id}`,
    class: cx('flex min-h-11 flex-col justify-center rounded-(--r-ctl) px-4 py-2 no-underline', dir === 'next' ? 'items-end text-right' : 'items-start',
      dir === 'next' && c.done ? 'bg-accent text-on-accent hover:bg-accent/90' : 'ring-1 ring-line hover:bg-accent-soft'),
  }, h('span', { class: cx('text-caption', dir === 'next' && c.done ? '' : 'text-muted') }, lt(dir === 'next' ? 'fl.next' : 'fl.prev')), h('span', { class: 'font-bold' }, s.label[lang])) : null;
  return h('nav', { class: 'mt-2 grid gap-2 sm:grid-cols-2', 'aria-label': lt('fl.pager') }, link(c.prev, 'prev') ?? h('span'), link(c.next, 'next'));
}
