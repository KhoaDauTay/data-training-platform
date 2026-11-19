import { loadedGsap, loadGsap } from '../art/load';
import { getLang, t, type Key } from '../i18n';
import { cx } from '../theme';
import type { StepRun, StepsResult } from '../viz/steps';
import { shownSteps, STEP_LABELS, type StepKey, type StepsFailure } from '../viz/stepText';
import { fmt, h, reducedMotion } from './dom';
import { renderResult } from './resultTable';
import { s as svg } from './svg';

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

type Motion = typeof import('../art/sqlMotion');
let motion: Promise<Motion> | undefined;
let motionReady: Motion | undefined;
/** v10 L154: the teaching motion (lazy chunk `sqlMotion`), fetched when this tab first draws; a failed load is dropped so the next draw retries. */
function loadMotion(): Promise<Motion> {
  motion ??= import('../art/sqlMotion').then((m) => {
    m.init({ h, s: svg, fmt, getLang, loadedGsap, loadGsap, reducedMotion });
    return (motionReady = m);
  }, (e: unknown) => {
    motion = undefined;
    throw e;
  });
  return motion;
}

const labelOf = (s: StepRun): string => s.label ?? STEP_LABELS[s.key];
/** GROUP BY and HAVING count groups, not rows. */
const isGroups = (key: StepKey): boolean => key === 'group' || key === 'having';

/**
 * The Execution order tab. Everything is drawn in its end state; motion (v10 A1–A3, N5) only starts from a click: Play
 * runs the film once (≤ 3 s), a click on a JOIN or GROUP BY step plays its picture once, a guess runs the film. Without
 * the sqlMotion/gsap chunks or under reduced motion, Play steps through the clauses as before and pictures stay still.
 */
export function renderSteps(host: HTMLElement, sql: string, result: StepsResult, goExplain: () => void): void {
  const stages = h('div', { class: 'mb-2 flex flex-wrap gap-1.5 text-body-sm' }, ...STAGES.map((key, i) =>
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
  let film: ReturnType<Motion['film']> | undefined;
  let playing = false;

  const pipe = h('div', { class: 'my-2 flex flex-wrap items-center gap-1.5', role: 'group', 'aria-label': t('steps.pipe') });
  const detail = h('div');
  const filmSlot = h('div');
  const guessSlot = h('div');
  const playBtn = h('button', { type: 'button' }, t('steps.play'));

  const prevCount = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (steps[j].count !== undefined) return steps[j].count!;
    return undefined;
  };
  const unit = (key: StepKey, n: number) => t(isGroups(key) ? 'steps.groups' : 'viz.rows', { n });

  function highlighted(r: [number, number] | undefined): HTMLElement {
    if (!r) return h('pre', { class: 'sql' }, sql);
    // The rest of the SQL is grey text, not faded (no opacity).
    return h('pre', { class: 'sql' },
      h('span', { class: 'text-muted' }, sql.slice(0, r[0])),
      h('mark', { class: 'rounded-sm bg-accent-soft text-ink' }, sql.slice(r[0], r[1])),
      h('span', { class: 'text-muted' }, sql.slice(r[1])));
  }

  /** `how`: 'still' (any redraw), 'film' (the film reached this step: count and bar move), 'click' (the player opened it: its picture plays). */
  function draw(how: 'still' | 'film' | 'click' = 'still'): void {
    const m = motionReady;
    let counter: HTMLElement | undefined;
    pipe.replaceChildren(...steps.flatMap((s, i) => {
      const n = s.error ? undefined : h('span', { class: 'text-body font-bold tabular-nums' }, unit(s.key, s.count!));
      if (i === current) counter = n;
      return [
        i ? h('span', { class: 'text-muted', 'aria-hidden': 'true' }, '→') : null,
        h('button', {
          type: 'button',
          class: cx(STEP_BTN, i === current ? 'border-accent bg-accent-soft' : 'bg-code', s.error && 'border-bad'),
          'aria-current': i === current ? 'step' : false,
          onclick: () => { stop(); current = i; draw('click'); },
        }, h('b', {}, labelOf(s)), n ?? h('span', {}, t('steps.error'))),
      ].filter((x): x is HTMLElement => x !== null);
    }));

    const s = steps[current];
    const before = prevCount(current);
    let after: HTMLElement | undefined;
    const bar = (label: Key, n: number, width: number) => {
      const fill = h('i', { class: 'block h-2.5 rounded bg-accent', style: `width:${width}%` });
      after = fill;
      return h('div', { class: 'grid grid-cols-[48px_1fr_80px] items-center gap-2 text-body-sm' },
        h('span', {}, t(label)), fill, h('span', { class: 'text-right tabular-nums' }, fmt(n)));
    };
    // v10 A2/A3: the GROUP BY fold and the JOIN key pairs, drawn still; they play only when the player opens the step.
    const pic = !m ? undefined : s.groups?.length ? m.fold(s.groups) : s.match ? m.joinPairs(s.match, labelOf(s)) : undefined;
    detail.replaceChildren(
      h('h3', {}, t('steps.title', { i: current + 1, label: labelOf(s) })),
      h('p', {}, t(help(s.key))),
      s.count !== undefined && before !== undefined
        ? h('div', { class: 'my-2 max-w-[520px]' },
            bar('steps.before', before, 100),
            bar('steps.after', s.count, before ? Math.max(1, (s.count / before) * 100) : 100))
        : '',
      pic?.el ?? '',
      highlighted(s.range ?? ranges[s.key]),
      s.error ? h('pre', { class: 'error' }, s.error) : '',
      s.sample ? h('div', {}, h('p', { class: 'muted' }, t('steps.sample')), renderResult(s.sample)) : '',
      s.sql ? h('details', { class: 'mt-2' }, h('summary', { class: 'cursor-pointer' }, t('steps.sql')), h('pre', { class: 'sql' }, s.sql)) : '',
    );
    if (how === 'click') pic?.play();
    if (how === 'film' && m && before !== undefined && s.count !== undefined) {
      const shown = counter;
      if (shown) m.countTo((n) => { shown.textContent = unit(s.key, n); }, before, s.count, 300);
      if (after) m.shrink(after, 100, 300);
    }
  }

  function stop(): void {
    clearInterval(timer);
    timer = undefined;
    film?.stop();
    playing = false;
    playBtn.textContent = t('steps.play');
  }
  /** Runs the film once (or, without motion, steps through the clauses every 1.5 s as before); resolves at its end. */
  function play(): Promise<void> {
    stop();
    playing = true;
    playBtn.textContent = t('steps.pause');
    if (film && motionReady?.canPlay()) {
      return film.play((i) => { current = i; draw('film'); }).then(() => {
        playing = false;
        playBtn.textContent = t('steps.play');
      });
    }
    current = 0;
    draw();
    timer = window.setInterval(() => {
      if (!host.isConnected || current >= steps.length - 1) return stop();
      current++;
      draw();
    }, 1500);
    return Promise.resolve();
  }
  playBtn.addEventListener('click', () => void (playing ? stop() : play()));

  function mount(m: Motion): void {
    film = m.film(steps.map((s) => ({ label: labelOf(s), count: s.error ? undefined : s.count, groups: isGroups(s.key) })));
    filmSlot.replaceChildren(film.el);
    // v10 N5: guess what WHERE keeps before watching (0 XP, never saved).
    const w = steps.findIndex((s) => s.key === 'where' && s.count !== undefined);
    const before = w > 0 ? prevCount(w) : undefined;
    if (before) guessSlot.replaceChildren(m.guessBox(before, steps[w].count!, (then) => void play().then(then)));
    draw();
  }
  draw();
  host.append(stages, guessSlot, h('div', { class: 'actions' }, playBtn), filmSlot, pipe, detail);
  if (motionReady) mount(motionReady);
  else loadMotion().then((m) => { if (host.isConnected) mount(m); }, () => {});
}
