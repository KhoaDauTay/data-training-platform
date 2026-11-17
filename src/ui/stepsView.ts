import { t, type Key } from '../i18n';
import { cx } from '../theme';
import type { StepsResult } from '../viz/steps';
import { shownSteps, STEP_LABELS, type StepKey, type StepsFailure } from '../viz/stepText';
import { fmt, h } from './dom';
import { renderResult } from './resultTable';

const STAGES: Key[] = ['steps.stage1', 'steps.stage2', 'steps.stage3', 'steps.stage4'];
/** Stage indexes: Optimize links to the EXPLAIN tab; Execute is the stage this tab shows. */
const OPTIMIZE = 2;
const EXECUTE = 3;
const help = (key: StepKey): Key => `steps.help.${key}`;
const REASON: Record<StepsFailure, Key> = {
  syntax: 'steps.syntax', multi: 'steps.multi', notSelect: 'steps.notSelect', withUnion: 'steps.withUnion', window: 'steps.window',
};
const PILL = 'rounded-full px-2.5 py-0.5';
/** Execute is the stage this tab shows: dark pill (white on --bar ≥ 10:1 in both themes). */
const STAGE_ON = 'bg-[var(--bar)] text-white';
const STAGE_OFF = 'bg-code ring-1 ring-line';
const STEP_BTN = 'flex min-w-24 flex-col items-start';

export function renderSteps(host: HTMLElement, sql: string, result: StepsResult, goExplain: () => void): void {
  const stages = h('div', { class: 'mb-2 flex flex-wrap gap-1.5 text-sm' }, ...STAGES.map((key, i) =>
    i === OPTIMIZE
      ? h('button', { type: 'button', class: PILL, onclick: goExplain, title: t('steps.toExplain') }, `${t(key)} → EXPLAIN`)
      : h('span', { class: cx(PILL, i === EXECUTE ? STAGE_ON : STAGE_OFF), 'aria-current': i === EXECUTE ? 'step' : false }, t(key))));
  if (!result.ok) {
    host.append(stages, h('p', { class: 'muted' }, t(REASON[result.reason], { msg: result.detail ?? '' })));
    if (result.reason === 'withUnion' || result.reason === 'window') {
      host.append(h('button', { type: 'button', onclick: goExplain }, t('steps.seeExplain')));
    }
    return;
  }
  const { ranges } = result;
  const steps = shownSteps(result.steps); // buildSteps keeps unused clauses as `skipped`; tests rely on that
  const live = steps.filter((s) => s.error === undefined);
  let current = steps.indexOf(live[1] ?? live[0] ?? steps[0]);
  let timer: number | undefined;

  const pipe = h('div', { class: 'my-2 flex flex-wrap items-center gap-1.5', role: 'group', 'aria-label': t('steps.pipe') });
  const detail = h('div');
  const playBtn = h('button', { type: 'button' }, t('steps.play'));

  const prevCount = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (steps[j].count !== undefined) return steps[j].count!;
    return undefined;
  };
  const unit = (key: StepKey, n: number) => t(key === 'group' || key === 'having' ? 'steps.groups' : 'viz.rows', { n });

  function highlighted(key: StepKey): HTMLElement {
    const r = ranges[key];
    if (!r) return h('pre', { class: 'sql' }, sql);
    // The rest of the SQL is grey text, not faded (no opacity).
    return h('pre', { class: 'sql' },
      h('span', { class: 'text-muted' }, sql.slice(0, r[0])),
      h('mark', { class: 'rounded-sm bg-accent-soft text-ink' }, sql.slice(r[0], r[1])),
      h('span', { class: 'text-muted' }, sql.slice(r[1])));
  }

  function draw(): void {
    pipe.replaceChildren(...steps.flatMap((s, i) => [
      i ? h('span', { class: 'text-muted', 'aria-hidden': 'true' }, '→') : null,
      h('button', {
        type: 'button',
        class: cx(STEP_BTN, i === current ? 'border-accent bg-accent-soft' : 'bg-code', s.error && 'border-bad'),
        'aria-current': i === current ? 'step' : false,
        onclick: () => { stop(); current = i; draw(); },
      },
        h('b', {}, STEP_LABELS[s.key]),
        s.error ? h('span', {}, t('steps.error'))
          : h('span', { class: 'text-base font-bold tabular-nums' }, unit(s.key, s.count!))),
    ].filter((x): x is HTMLElement => x !== null)));

    const s = steps[current];
    const before = prevCount(current);
    const bar = (label: Key, n: number, width: number) =>
      h('div', { class: 'grid grid-cols-[48px_1fr_80px] items-center gap-2 text-sm' },
        h('span', {}, t(label)), h('i', { class: 'block h-2.5 rounded bg-accent', style: `width:${width}%` }), h('span', { class: 'text-right tabular-nums' }, fmt(n)));
    detail.replaceChildren(
      h('h3', {}, t('steps.title', { i: current + 1, label: STEP_LABELS[s.key] })),
      h('p', {}, t(help(s.key))),
      s.count !== undefined && before !== undefined
        ? h('div', { class: 'my-2 max-w-[520px]' },
            bar('steps.before', before, 100),
            bar('steps.after', s.count, before ? Math.max(1, (s.count / before) * 100) : 100))
        : '',
      highlighted(s.key),
      s.error ? h('pre', { class: 'error' }, s.error) : '',
      s.sample ? h('div', {}, h('p', { class: 'muted' }, t('steps.sample')), renderResult(s.sample)) : '',
      s.sql ? h('details', { class: 'mt-2' }, h('summary', { class: 'cursor-pointer' }, t('steps.sql')), h('pre', { class: 'sql' }, s.sql)) : '',
    );
  }

  function stop(): void {
    clearInterval(timer);
    timer = undefined;
    playBtn.textContent = t('steps.play');
  }
  playBtn.addEventListener('click', () => {
    if (timer) return stop();
    playBtn.textContent = t('steps.pause');
    current = 0;
    draw();
    timer = window.setInterval(() => {
      if (!host.isConnected || current >= steps.length - 1) return stop();
      current++;
      draw();
    }, 1500);
  });

  draw();
  host.append(stages, h('div', { class: 'actions' }, playBtn), pipe, detail);
}
