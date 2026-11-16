import { getLang, t, type Key } from '../i18n';
import { xpFor } from '../progress';
import { compareShape, shapeOf, type Kind, type Shape } from '../shape';
import { actions, app, done, expectedShape, persist, stepKey } from '../state';
import { textOf, type Beat, type Ticket, type TicketText } from '../tickets';
import { h, nodes, richText } from './dom';

const BEAT: Record<Beat, Key> = { teach: 'beat.teach', develop: 'beat.develop', twist: 'beat.twist', rest: 'beat.rest', boss: 'beat.boss' };
const KIND: Record<Kind, Key> = { text: 'shape.text', number: 'shape.number', date: 'shape.date', bool: 'shape.bool' };

/** Conclusion option picked per ticket: survives re-renders and language switches (not saved). */
const picked = new Map<string, number>();

const mark = (ok: boolean): string => (ok ? '✓' : '✗');

/** "Expected result": column count and kinds, row count, ordering, author labels from `columns:`. Never Solution column names. */
function shapeCard(tk: Ticket, stepIndex: number): HTMLElement {
  const step = tk.steps[stepIndex];
  const labels = step.columns ?? [];
  const card = h('section', { class: 'shape', 'aria-label': t('shape.title') });
  const draw = (exp?: Shape) => {
    const n = exp?.kinds.length ?? labels.length;
    const run = app.lastRun?.key === stepKey(tk, stepIndex) ? app.lastRun.result : undefined;
    const cmp = exp && run ? compareShape(exp, shapeOf(run)) : undefined;
    card.replaceChildren(...nodes(
      h('h3', {}, t('shape.title')),
      h('p', {}, [t('shape.cols', { n }), exp ? t('shape.rows', { n: exp.rows }) : '…', t(tk.ordered ? 'shape.ordered' : 'shape.unordered')].join(' · ')),
      h('ul', { class: 'shape-cols' }, ...Array.from({ length: n }, (_, i) =>
        h('li', {}, labels[i] ? h('code', {}, labels[i]) : null, exp ? ` ${t(KIND[exp.kinds[i]])}` : null))),
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
  const shown = app.save.hintsUsed[tk.id] ?? 0;
  const btn = h('button', {
    type: 'button',
    onclick: () => {
      app.save.hintsUsed[tk.id] = shown + 1;
      persist();
      actions.rerender();
    },
  }, t('brief.hint', { i: shown + 1, n: x.hints.length, cost: xpFor(tk, shown) - xpFor(tk, shown + 1) }));
  return h('section', { class: 'hints' },
    shown ? h('ol', {}, ...x.hints.slice(0, shown).map((s) => h('li', {}, richText(s)))) : null,
    isDone || shown >= x.hints.length ? null : btn);
}

function conclusion(tk: Ticket, x: TicketText): HTMLElement {
  const c = x.conclusion!;
  const msg = h('p', { role: 'status', class: 'feedback bad' });
  const form = h('form', { class: 'conclusion' },
    h('h3', {}, t('brief.conclusion')),
    h('p', {}, c.question),
    ...c.options.map((o, i) => h('label', {},
      h('input', { type: 'radio', name: 'conclusion', value: String(i), checked: picked.get(tk.id) === i, onchange: () => picked.set(tk.id, i) }),
      ' ', o)),
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

/** Left pane for `tk` (not necessarily the selected ticket: Plan 1c renders practice tickets here). Replaces host's children. */
export function renderBrief(host: HTMLElement, tk: Ticket, stepIndex: number): void {
  const x = textOf(tk, getLang());
  const isDone = done().has(tk.id);
  const boss = tk.steps.length > 1;
  host.replaceChildren(...nodes(
    h('header', {},
      h('h2', { id: 'brief-title', tabindex: '-1' }, x.title),
      h('p', { class: 'meta' },
        h('span', { class: 'dept' }, tk.from.dept),
        ` ${tk.from.name} · ${t('brief.chapter', { n: tk.chapter })} · ${t(BEAT[tk.beat])} · ${'★'.repeat(tk.difficulty)}`,
        isDone ? ` · ✓ ${t('inbox.done')}` : ''),
      x.fallback ? h('p', { class: 'tag' }, t('brief.untranslated')) : null),
    richText(x.body),
    x.task ? h('section', { class: 'task' }, h('h3', {}, t('brief.task')), richText(x.task)) : null,
    boss
      ? h('section', { class: 'step' },
        h('h3', {}, t('brief.step', { i: stepIndex + 1, n: tk.steps.length, title: x.steps[stepIndex].title })),
        richText(x.steps[stepIndex].prompt))
      : null,
    isDone ? null : shapeCard(tk, stepIndex),
    hints(tk, x, isDone),
    app.conclusionFor === tk.id && !isDone && x.conclusion ? conclusion(tk, x) : null,
  ));
}
