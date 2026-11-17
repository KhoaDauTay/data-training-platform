import { getLang, t, type Key } from '../i18n';
import { roleLine } from '../people';
import { CHAPTERS, nextTicket, SKILLS, xpFor } from '../progress';
import { compareShape, shapeOf, type Kind, type Shape } from '../shape';
import { hintsShown, isClosed, isStory, useHint } from '../session';
import { actions, app, done, expectedShape, persist, stepKey, unlockedTables } from '../state';
import { chapterColor, cx, DEPT_CHIP, deptColor, deptOf, PILL } from '../theme';
import { textOf, type Beat, type Ticket, type TicketText } from '../tickets';
import { avatar } from './avatar';
import { coach } from './coach';
import { h, nodes, richText } from './dom';

const BEAT: Record<Beat, Key> = { teach: 'beat.teach', develop: 'beat.develop', twist: 'beat.twist', rest: 'beat.rest', boss: 'beat.boss' };
const KIND: Record<Kind, Key> = { text: 'shape.text', number: 'shape.number', date: 'shape.date', bool: 'shape.bool' };

/** Conclusion option picked per ticket: survives re-renders and language switches (not saved). */
const picked = new Map<string, number>();
/** Reflect option picked per ticket (curriculum §5.5): same rules, never graded or saved. */
const reflected = new Map<string, number>();

const mark = (ok: boolean): string => (ok ? '✓' : '✗');

/** "Expected result": column count and kinds, row count, ordering, author labels from `columns:`. Never Solution column names. */
function shapeCard(tk: Ticket, stepIndex: number): HTMLElement {
  const step = tk.steps[stepIndex];
  const labels = step.columns ?? [];
  const card = h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-line', 'aria-label': t('shape.title') });
  const draw = (exp?: Shape) => {
    const n = exp?.kinds.length ?? labels.length;
    const run = app.lastRun?.key === stepKey(tk.id, stepIndex) ? app.lastRun.result : undefined;
    const cmp = exp && run ? compareShape(exp, shapeOf(run)) : undefined;
    card.replaceChildren(...nodes(
      h('h3', { class: 'mt-0' }, t('shape.title')),
      h('p', {}, [t('shape.cols', { n }), exp ? t('shape.rows', { n: exp.rows }) : '…', t(tk.ordered ? 'shape.ordered' : 'shape.unordered')].join(' · ')),
      h('ul', { class: 'my-1 flex list-none flex-wrap gap-1.5 p-0' }, ...Array.from({ length: n }, (_, i) =>
        h('li', { class: 'rounded-md bg-panel px-1.5 py-0.5 text-sm ring-1 ring-line' }, labels[i] ? h('b', { class: 'font-semibold' }, labels[i][getLang()]) : null, exp ? ` ${t(KIND[exp.kinds[i]])}` : null))),
      h('p', { class: 'mt-1 mb-0 text-sm text-muted' }, t('shape.byPosition')),
      cmp && run
        ? h('p', { class: cmp.columns && cmp.kinds && cmp.rows ? 'good' : 'warn' },
          t('shape.yours', { cols: run.columns.length, colsOk: mark(cmp.columns && cmp.kinds), rows: run.rows.length, rowsOk: mark(cmp.rows) }))
        : null));
  };
  draw();
  expectedShape(step.solution).then(draw, () => draw());
  return card;
}

function hints(tk: Ticket, x: TicketText, isDone: boolean): HTMLElement {
  const shown = hintsShown(tk.id);
  const btn = h('button', {
    type: 'button',
    onclick: () => {
      useHint(tk.id);
      persist();
      actions.rerender();
    },
  }, isStory()
    ? t('brief.hint', { i: shown + 1, n: x.hints.length, cost: xpFor(tk, shown) - xpFor(tk, shown + 1) })
    : t('brief.hintFree', { i: shown + 1, n: x.hints.length })); // Practice: 0 XP, so no cost (P9)
  return h('section', { class: 'hints my-3' },
    shown ? h('ol', { class: 'space-y-1' }, ...x.hints.slice(0, shown).map((s) => h('li', {}, richText(s)))) : null,
    isDone || shown >= x.hints.length ? null : btn);
}

function conclusion(tk: Ticket, x: TicketText): HTMLElement {
  const c = x.conclusion!;
  const msg = h('p', { role: 'status', class: 'bad' });
  const form = h('form', { class: 'my-3 rounded-xl p-3 ring-2 ring-accent' },
    h('h3', { class: 'mt-0' }, t('brief.conclusion')),
    h('fieldset', { class: 'mb-4' },
      h('legend', { class: 'mb-2' }, c.question),
      ...c.options.map((o, i) => h('label', { class: 'my-1 flex items-center gap-2' },
        h('input', { type: 'radio', name: 'conclusion', value: String(i), checked: picked.get(tk.id) === i, onchange: () => picked.set(tk.id, i) }),
        ' ', o))),
    h('button', { class: 'primary', type: 'submit' }, t('brief.conclude')),
    msg);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = picked.get(tk.id);
    if (v === undefined) msg.textContent = t('brief.pickOne');
    else if (v === tk.conclusion!.answer) actions.complete(tk);
    else msg.textContent = t('brief.wrongConclusion');
  });
  return form;
}

/** format: worked (curriculum §5.1): the annotated example the task is paired with; the button loads it into the editor. */
function exampleCard(tk: Ticket, x: TicketText): HTMLElement | null {
  if (!tk.example || !x.example) return null;
  const sql = tk.example.sql;
  return h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-line', 'aria-labelledby': 'example-title' },
    h('h3', { id: 'example-title', class: 'mt-0' }, t('brief.example')),
    h('pre', { class: 'sql' }, sql),
    richText(x.example),
    h('button', { type: 'button', onclick: () => actions.useSql(sql) }, t('brief.useExample')));
}

/** Recap question (curriculum §5.5): pick an option, then the right one and the reason show. */
function reflectCard(tk: Ticket): HTMLElement | null {
  const r = tk.reflect;
  if (!r) return null;
  const lang = getLang();
  const pick = reflected.get(tk.id);
  return h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-line', 'aria-labelledby': 'reflect-title' },
    h('h4', { id: 'reflect-title', class: 'mt-0' }, t('recap.reflect')),
    h('p', {}, r.q[lang]),
    h('div', { class: 'flex flex-col items-start gap-1.5' }, ...r.options.map((o, i) => h('button', {
      type: 'button',
      class: cx('text-left', pick !== undefined && i === r.answer && 'ring-2 ring-emerald-500'),
      'aria-pressed': pick === i ? 'true' : 'false',
      onclick: () => {
        reflected.set(tk.id, i);
        actions.rerender();
      },
    }, o[lang]))),
    pick === undefined
      ? null
      : h('p', { role: 'status', class: pick === r.answer ? 'good' : 'bad' }, `${t(pick === r.answer ? 'recap.reflectRight' : 'recap.reflectWrong')} ${r.why[lang]}`));
}

/** "This week at Cargo Query" (product-design-v2 ★4): the chapter's story, shown on its first ticket only. */
function story(tk: Ticket): HTMLElement | null {
  const c = CHAPTERS.find((x) => x.chapter === tk.chapter);
  if (!c?.story.vi || app.tickets.find((x) => x.chapter === tk.chapter) !== tk) return null;
  return h('section', { class: 'my-3 overflow-hidden rounded-xl bg-panel ring-1 ring-line' },
    h('div', { class: cx('h-1.5', chapterColor(tk.chapter).bar) }),
    h('div', { class: 'p-3' },
      h('h3', { class: 'mt-0' }, t('brief.story')),
      h('p', { class: 'm-0' }, c.story[getLang()])));
}

/** After a correct answer: your reply, then the sender's thank-you (L18 ★1). */
function sentBubbles(tk: Ticket): HTMLElement {
  return h('div', { class: 'my-3 flex flex-col gap-2' },
    h('p', { class: 'm-0 max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-accent-soft px-4 py-2' }, t('chat.sent')),
    h('p', { class: 'm-0 flex max-w-[85%] items-start gap-2 self-start' },
      avatar(tk.from),
      h('span', { class: 'rounded-2xl rounded-tl-sm bg-code px-4 py-2' }, t(deptOf(tk.from.dept).thanks))));
}

/** The SQL that passed the grader; saves from before `graded` existed fall back to the draft. */
const gradedSql = (tk: Ticket, i: number): string => app.save.graded[stepKey(tk.id, i)] ?? app.save.drafts[stepKey(tk.id, i)] ?? '';

/** On a closed ticket: skills learned (or reviewed), your SQL next to the reference, XP, "Next ticket". */
function recap(tk: Ticket, x: TicketText): HTMLElement {
  const lang = getLang();
  const ids = tk.grants.length ? tk.grants : tk.requires;
  const skills = SKILLS.filter((s) => ids.includes(s.id));
  const next = nextTicket(app.tickets, done());
  const hintsUsed = app.save.hintsUsed[tk.id] ?? 0;
  return h('section', { class: 'recap my-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-800' },
    h('h3', { tabindex: '-1', class: 'mt-0 text-emerald-900 dark:text-emerald-200' }, t('recap.title')),
    coach('recap'),
    h('p', {}, t('recap.xp', { n: xpFor(tk, hintsUsed), hints: hintsUsed })),
    h('h4', {}, t(tk.grants.length ? 'recap.learned' : 'recap.review')),
    h('ul', { class: 'space-y-1' }, ...skills.map((s) =>
      h('li', {}, h('b', {}, s.label[lang]), ' ', h('code', {}, s.syntax), h('p', { class: 'muted' }, s.when[lang])))),
    reflectCard(tk),
    ...tk.steps.map((s, i) => h('div', { class: 'my-2 grid gap-2 sm:grid-cols-2' },
      tk.steps.length > 1 ? h('h4', {}, x.steps[i].title) : null,
      h('figure', {}, h('figcaption', { class: 'mb-1 text-sm text-muted' }, t('recap.yours')), h('pre', { class: 'sql' }, gradedSql(tk, i))),
      h('figure', {}, h('figcaption', { class: 'mb-1 text-sm text-muted' }, t('recap.reference')), h('pre', { class: 'sql' }, s.solution)))),
    next
      ? h('button', { type: 'button', class: 'primary', onclick: () => actions.selectTicket(next.id) }, t('recap.next'))
      : h('p', {}, t('recap.allDone')));
}

/** Left pane for `tk` (not necessarily the selected ticket: Plan 1c renders practice tickets here). Replaces host's children. */
export function renderBrief(host: HTMLElement, tk: Ticket, stepIndex: number): void {
  const x = textOf(tk, getLang());
  const isDone = isClosed(tk.id); // Practice replays a done ticket open: shape card, hints and Submit, no Recap
  const boss = tk.steps.length > 1;
  host.replaceChildren(...nodes(
    h('header', { class: 'space-y-2' },
      h('div', { class: 'flex items-center gap-3' },
        avatar(tk.from, 'lg'),
        h('p', { class: 'm-0 min-w-0' },
          h('span', { class: 'flex flex-wrap items-center gap-2 font-semibold' },
            tk.from.name, h('span', { class: cx(DEPT_CHIP, deptColor(tk.from.dept)) }, tk.from.dept)),
          h('span', { class: 'block text-sm text-muted' }, roleLine(tk.from.name, getLang(), unlockedTables())))),
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-sm text-muted' },
        `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`,
        h('span', { class: cx(PILL, chapterColor(tk.chapter).chip) }, t(BEAT[tk.beat])),
        isDone ? `✓ ${t('inbox.done')}` : ''),
      h('h2', { id: 'brief-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, x.title),
      x.fallback ? h('p', { class: 'tag' }, t('brief.untranslated')) : null),
    story(tk),
    coach('brief'),
    h('div', { class: 'rounded-2xl rounded-tl-sm bg-code px-4 leading-relaxed' }, richText(x.body)),
    exampleCard(tk, x),
    x.task ? h('section', { class: 'my-3 rounded-lg border-l-4 border-accent bg-accent-soft p-3' }, h('h3', { class: 'mt-0' }, t('brief.task')), richText(x.task)) : null,
    boss
      ? h('section', { class: 'my-3 rounded-lg p-3 ring-1 ring-line' },
        h('h3', { class: 'mt-0' }, t('brief.step', { i: stepIndex + 1, n: tk.steps.length, title: x.steps[stepIndex].title })),
        richText(x.steps[stepIndex].prompt))
      : null,
    isDone ? null : shapeCard(tk, stepIndex),
    coach('hints'),
    hints(tk, x, isDone),
    app.conclusionFor === tk.id && !isDone && x.conclusion ? conclusion(tk, x) : null,
    isDone ? sentBubbles(tk) : null,
    isDone ? recap(tk, x) : null,
  ));
}
