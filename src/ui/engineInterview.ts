import type { EngineId } from '../engine/content';
import { ANSWER_MAX, DRAFT_MAX, dayPlus, dueAgain, IV_KEY, parseIvPrefs, shareOf, type IvLive, type IvPrefs } from '../engine/engineInterviewPrefs';
import {
  BANDS, engineOfId, exhibitScript, parseBank, PASS, SET_MINUTES, setOf, setQuestions, setsOf, type Band, type Bank, type Exhibit, type IvQuestion, type TakeHome,
} from '../engine/interviewBank';
import type { PgLabClient } from '../engine/pglab/client';
import type { StepResult } from '../engine/pglab/script';
import type * as I18n from '../i18n';
import { ivText, type IvKey } from '../i18n/engineInterview';
import type { EngineDeps } from './engineView';
import type { PageSub } from './homeView';

/**
 * v27 (L411, design-v27 §2): the Database Engine interview room, #/engine/interview (engine → bands → 3 sets of 5 + the
 * take-homes), a set run #/engine/interview/<set> (write first, then the model answer beside yours and a rubric you tick),
 * the review run #/engine/interview/again and a take-home #/engine/interview/<id>. A reading page, not a workspace: nothing
 * is graded by a machine, 0 XP, nothing in the Save; results, the run in progress and drafts live in the device pref
 * `cargo-query/engine-interview` (src/engine/engineInterviewPrefs.ts). Timer off by default; it only counts time on the page.
 * Lazy chunk `engineInterview` (budget `engineInterviewUi`), each engine's bank its own chunk (`iv-<engine>`, budget
 * `engineIvBank`); types only from main modules (Plan 6 U3).
 */
let d: EngineDeps;
const it = (key: IvKey, params?: I18n.Params): string => ivText(d.getLang(), d.locale(), key, params);
const lang = (): 'vi' | 'en' => d.getLang();
const NAME: Record<EngineId, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB' };
const ENGINES: EngineId[] = ['postgres', 'mongodb', 'dynamodb'];
const SRC: Record<EngineId, () => Promise<{ default: unknown }>> = {
  postgres: () => import('../../content/engine/iv-postgres.yml'),
  mongodb: () => import('../../content/engine/iv-mongodb.yml'),
  dynamodb: () => import('../../content/engine/iv-dynamodb.yml'),
};

export function initIv(deps: EngineDeps): void {
  d = deps;
}

// ---- banks (one chunk per engine; a failed load is retried by Retry, never in a loop)
const banks = new Map<EngineId, Bank | 'loading' | 'failed'>();
function bankOf(e: EngineId): Bank | 'loading' | 'failed' {
  const have = banks.get(e);
  if (have) return have;
  banks.set(e, 'loading');
  void SRC[e]().then((m) => banks.set(e, parseBank(m.default)), () => banks.set(e, 'failed')).finally(() => d.rerender());
  return 'loading';
}
const questionOf = (id: string): IvQuestion | undefined => {
  const e = engineOfId(id);
  const b = e && banks.get(e);
  return typeof b === 'object' ? b.questions.find((q) => q.id === id) : undefined;
};

// ---- the pref
const prefs = (): IvPrefs => parseIvPrefs(d.prefs.read(IV_KEY));
const save = (p: IvPrefs): void => { d.prefs.write(IV_KEY, p); };
const today = (): string => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

// ---- small pieces
/** `code` spans and **bold**; nothing else is interpreted. */
function rich(text: string): (Node | string)[] {
  return text.split(/(`[^`\n]+`)/).filter(Boolean).flatMap((p) => (p.length > 1 && p.startsWith('`') && p.endsWith('`') ? [d.h('code', {}, p.slice(1, -1))]
    : p.split(/(\*\*[^*\n]+\*\*)/).filter(Boolean).map((q) => (q.length > 4 && q.startsWith('**') && q.endsWith('**') ? d.h('strong', {}, q.slice(2, -2)) : q))));
}
const chip = (text: string, cls = 'bg-code text-ink'): HTMLElement => d.h('span', { class: d.cls.cx(d.cls.PILL, cls) }, text);
const ext = (href: string, text: string): HTMLElement => d.h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: 'inline-flex items-center gap-1.5' },
  d.icon('external', 'size-4 shrink-0'), text, d.h('span', { class: 'sr-only' }, ` (${it('newTab')})`));
const bandName = (b: Band): string => it(`band.${b}`);
export const setName = (set: string): string => {
  if (set === 'again') return it('again.title');
  const s = setOf(set);
  return s ? it('set.name', { engine: NAME[s.engine], band: bandName(s.band), n: s.n }) : set;
};
const mmss = (ms: number): string => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const card = (...c: (Node | string | null)[]): HTMLElement => d.h('section', { class: d.cls.cx(d.cls.CARD, 'flex flex-col gap-4 p-5 max-sm:p-4') }, ...c);
const loading = (): HTMLElement => d.h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, d.loader(), d.t('engine.loading'));
const failed = (e: EngineId): HTMLElement => d.h('div', { role: 'alert', class: 'flex flex-col gap-2' }, d.h('p', { class: 'm-0' }, d.t('engine.failed')),
  d.h('button', { type: 'button', onclick: () => { banks.delete(e); d.rerender(); } }, d.t('data.retry')));

export function subOf(r: { set?: string; th?: string }): PageSub {
  const top = { href: d.hashOf('engine'), text: d.t('nav.engine') };
  if (!r.set && !r.th) return { title: it('title'), trail: [top] };
  const room = { href: d.engineInterviewHash(), text: it('title') };
  if (r.set) return { title: setName(r.set), trail: [top, room] };
  const e = engineOfId(r.th!)!;
  const b = banks.get(e);
  const th = typeof b === 'object' ? b.takeHomes.find((x) => x.id === r.th) : undefined;
  return { title: th ? th.title[lang()] : it('th'), trail: [top, room] };
}

export function ivPage(r: { set?: string; th?: string }): HTMLElement {
  if (r.th) return takeHomePage(r.th);
  if (r.set) return setPage(r.set);
  return room();
}

// ---- the room

let picked: EngineId = 'postgres';
function room(): HTMLElement {
  const { h, cls } = d;
  const p = prefs();
  const due = dueAgain(p, today());
  const b = bankOf(picked);
  return h('div', { class: 'flex flex-col gap-8' },
    h('p', { class: 'm-0 text-muted' }, it('intro')),
    due.length ? card(h('h2', { class: 'm-0 text-title font-bold' }, it('again.card', { n: due.length })), h('p', { class: 'm-0 text-body-sm text-muted' }, it('again.line')),
      h('div', {}, h('a', { href: d.engineInterviewHash('again'), class: cls.cx(cls.BTN_GO, 'inline-flex px-4 py-2 no-underline') }, it('again.go')))) : null,
    h('div', { role: 'group', 'aria-label': it('pick'), class: 'flex flex-wrap gap-2' }, ...ENGINES.map((e) => h('button', {
      type: 'button', 'aria-pressed': String(e === picked), 'data-ek': `iv-pick-${e}`,
      class: cls.cx(e === picked ? cls.BTN_SECONDARY : cls.BTN_GHOST, 'px-4 py-1.5 aria-[pressed=true]:ring-2 aria-[pressed=true]:ring-accent'),
      onclick: () => { picked = e; d.rerender(); },
    }, NAME[e]))),
    b === 'loading' ? loading() : b === 'failed' ? failed(picked) : h('div', { class: 'flex flex-col gap-8' }, ...BANDS.map((band) => bandSection(b, picked, band, p))));
}

function bandSection(b: Bank, e: EngineId, band: Band, p: IvPrefs): HTMLElement {
  const { h } = d;
  const ths = b.takeHomes.filter((x) => x.band === band);
  return h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': `iv-${band}` },
    h('h2', { id: `iv-${band}`, class: d.ui.GROUP_TITLE }, `${NAME[e]} · ${bandName(band)}`),
    h('ul', { class: d.ui.LIST }, ...setsOf(e, band).map((set, i) => {
      const qs = setQuestions(b, set);
      const res = p.results[set];
      const live = p.live[set];
      const kinds = (['concept', 'diagnose', 'design'] as const).map((k) => [k, qs.filter((q) => q.kind === k).length] as const).filter(([, n]) => n);
      const runs = qs.filter((q) => q.exhibits.some((x) => x.source === 'pglite-0.5.16')).length;
      const sub = [it('set.meta', { n: qs.length, m: SET_MINUTES[band] }), kinds.map(([k, n]) => it(`kindN.${k}`, { n })).join(' · '),
        runs ? it('set.runs', { n: runs }) : '', res ? it('set.last', { k: res.score, n: res.total }) : ''].filter(Boolean).join(' · ');
      return d.ui.listRow({
        lead: h('span', { class: d.cls.cx('grid size-10 place-items-center rounded-full font-bold', res ? 'bg-good text-on-accent' : 'bg-code text-ink') }, res ? d.icon('check', 'size-5') : String(i + 1)),
        title: setName(set), sub,
        action: h('a', { href: d.engineInterviewHash(set), class: d.cls.cx(live ? d.cls.BTN_SECONDARY : d.cls.BTN_GHOST, 'shrink-0 px-4 py-1.5 whitespace-nowrap no-underline') },
          it(live ? 'set.resume' : res ? 'set.redo' : 'set.start')),
      });
    }), ...ths.map((th) => d.ui.listRow({
      lead: h('span', { class: 'grid size-10 place-items-center rounded-full bg-accent-soft text-accent' }, d.icon('secPractice', 'size-5')),
      title: th.title[lang()], sub: `${it('th')} · ${p.th[th.id]?.at ? it('th.done') : it('th.self')}`,
      action: h('a', { href: d.engineInterviewHash(th.id), class: d.cls.cx(d.cls.BTN_GHOST, 'shrink-0 px-4 py-1.5 whitespace-nowrap no-underline') }, it('th.open')),
    }))));
}

// ---- a set run

let timerPick = false;
let lastDone: { set: string; score: number; total: number; ms: number; weak: string[] } | undefined;

/** One clock for the open run: counts only while its page is shown and the tab visible (time in the room, L147). */
let clock: { set: string; id: ReturnType<typeof setInterval>; at: number } | undefined;
function startClock(set: string): void {
  if (clock?.set === set) return;
  stopClock();
  clock = { set, at: Date.now(), id: setInterval(() => tickClock(), 1000) };
}
function stopClock(): void {
  if (clock) clearInterval(clock.id);
  clock = undefined;
}
function tickClock(): void {
  if (!clock) return;
  const now = Date.now();
  const dt = Math.min(now - clock.at, 2000);
  clock.at = now;
  const here = d.engineInterviewOf(location.hash)?.set === clock.set;
  if (!here) { stopClock(); return; }
  if (document.visibilityState !== 'visible') return;
  const p = prefs();
  const live = p.live[clock.set];
  if (!live) { stopClock(); return; }
  live.ms += dt;
  const limit = limitOf(clock.set, live);
  const node = document.querySelector('[data-iv-timer]');
  if (node && live.timer) node.textContent = live.ms < limit ? it('timer.left', { t: mmss(limit - live.ms) }) : it('timer.over');
  const runId = `${clock.set}@${live.qs.join(',')}`;
  if (live.timer && live.ms >= limit && !p.noted.includes(runId)) {
    p.noted.push(runId);
    const note = document.querySelector('[data-iv-note]');
    if (note) note.textContent = it('timer.note');
  }
  save(p);
}
const limitOf = (set: string, live: IvLive): number => (setOf(set) ? SET_MINUTES[setOf(set)!.band] : 4 * live.qs.length) * 60_000;

function setPage(set: string): HTMLElement {
  const { h, cls } = d;
  const p = prefs();
  const live = p.live[set];
  const info = setOf(set);
  // the banks the run needs: its engine's, or for a review run every engine its questions come from
  const ids = live?.qs ?? (set === 'again' ? dueAgain(p, today()) : []);
  const need = info ? [info.engine] : [...new Set(ids.map(engineOfId).filter((e): e is EngineId => !!e))];
  for (const e of need) {
    const b = bankOf(e);
    if (b === 'loading') return loading();
    if (b === 'failed') return failed(e);
  }
  if (live) {
    startClock(set);
    return runView(set, live, p);
  }
  stopClock();
  const back = h('a', { href: d.engineInterviewHash(), class: cls.cx(cls.BTN_GHOST, 'inline-flex px-4 py-2 no-underline') }, it('back'));
  if (lastDone?.set === set) {
    const x = lastDone;
    return h('div', { class: 'flex flex-col gap-6' }, card(
      h('h2', { class: 'm-0 text-title font-bold' }, it('done.title')),
      h('p', { class: 'm-0 text-heading font-bold tabular-nums', role: 'status' }, it('done.score', { k: x.score, n: x.total })),
      h('p', { class: 'm-0 text-body-sm text-muted' }, it('done.time', { t: mmss(x.ms) })),
      h('p', { class: 'm-0 text-body-sm text-muted' }, it('done.honest')),
      x.weak.length ? h('div', { class: 'flex flex-col gap-2' }, h('h3', { class: 'm-0 text-body font-bold' }, it('done.weak', { n: x.weak.length })),
        h('ul', { class: 'm-0 list-disc space-y-1 pl-5 text-body-sm' }, ...x.weak.map((id) => h('li', {}, ...rich(questionOf(id)?.q[lang()] ?? id))))) : null,
      h('div', { class: 'flex flex-wrap gap-2' }, set === 'again' ? null : h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-2'), onclick: () => { lastDone = undefined; d.rerender(); } }, it('set.redo')), back)));
  }
  const qs = info ? setQuestions(banks.get(info.engine) as Bank, set).map((q) => q.id) : ids;
  if (!qs.length) return h('div', { class: 'flex flex-col items-start gap-4' }, h('p', { class: 'm-0' }, it('again.none')), back);
  const res = p.results[set];
  return h('div', { class: 'flex flex-col gap-6' }, card(
    h('p', { class: 'm-0 text-body-sm text-muted' }, it('start.meta', { n: qs.length, m: info ? SET_MINUTES[info.band] : 4 * qs.length })),
    h('p', { class: 'm-0' }, it('start.how')),
    res ? h('p', { class: 'm-0 text-body-sm' }, it('set.last', { k: res.score, n: res.total })) : null,
    h('label', { class: 'inline-flex min-h-6 cursor-pointer items-center gap-2 text-body-sm' },
      h('input', { type: 'checkbox', checked: timerPick, 'data-ek': 'iv-timer', onchange: (e: Event) => { timerPick = (e.target as HTMLInputElement).checked; } }), it('start.timer')),
    h('div', { class: 'flex flex-wrap gap-2' }, h('button', {
      type: 'button', class: cls.cx(cls.BTN_GO, 'px-5 py-2'), 'data-ek': 'iv-start',
      onclick: () => {
        const q = prefs();
        q.live[set] = { qs, i: 0, answers: qs.map(() => ''), ticks: qs.map(() => []), skipped: qs.map(() => false), shown: qs.map(() => false), ms: 0, timer: timerPick };
        save(q);
        d.rerender();
      },
    }, it('set.start')), back)));
}

function runView(set: string, live: IvLive, p: IvPrefs): HTMLElement {
  const { h, cls } = d;
  const i = Math.min(live.i, live.qs.length - 1);
  const q = questionOf(live.qs[i]);
  const n = live.qs.length;
  const update = (f: (l: IvLive) => void, redraw = true): void => {
    const x = prefs();
    const l = x.live[set];
    if (!l) return;
    f(l);
    save(x);
    if (redraw) d.rerender();
  };
  const limit = limitOf(set, live);
  const top = h('div', { class: 'flex flex-wrap items-center gap-x-4 gap-y-2' },
    h('p', { class: 'm-0 font-bold' }, it('run.n', { i: i + 1, n })),
    h('ol', { class: 'm-0 flex list-none gap-1.5 p-0', 'aria-hidden': 'true' }, ...live.qs.map((_, k) => h('li', { class: cls.cx('size-2.5 rounded-full', k < i || live.shown[k] ? 'bg-accent' : k === i ? 'bg-accent-soft ring-2 ring-accent' : 'bg-code ring-1 ring-line') }))),
    live.timer ? h('p', { class: 'm-0 ml-auto text-body-sm tabular-nums', role: 'timer', 'data-iv-timer': '' }, live.ms < limit ? it('timer.left', { t: mmss(limit - live.ms) }) : it('timer.over')) : null);
  const note = h('p', { class: 'm-0 text-body-sm warn', role: 'status', 'data-iv-note': '' }, live.timer && live.ms >= limit && p.noted.includes(`${set}@${live.qs.join(',')}`) ? it('timer.note') : '');
  if (!q) return h('div', { class: 'flex flex-col gap-4' }, top, h('p', { class: 'm-0' }, it('run.missing')));
  const shown = live.shown[i];
  const total = q.rubric.length;
  const ticked = new Set(live.ticks[i]);
  const answerBox = (): HTMLElement => {
    const go = h('button', { type: 'button', class: cls.cx(cls.BTN_GO, 'px-5 py-2'), 'data-ek': 'iv-reveal', disabled: !live.answers[i].trim(), onclick: () => update((l) => { l.shown[i] = true; }) }, it('run.reveal'));
    return h('div', { class: 'flex flex-col gap-2' },
      h('label', { for: `iv-a-${q.id}`, class: 'font-bold' }, it('run.yours')),
      h('textarea', {
        id: `iv-a-${q.id}`, rows: '7', maxlength: String(ANSWER_MAX), 'data-ek': 'iv-answer', class: 'w-full rounded-(--r-ctl) bg-panel p-3 ring-1 ring-line-strong',
        oninput: (e: Event) => { const v = (e.target as HTMLTextAreaElement).value; go.toggleAttribute('disabled', !v.trim()); update((l) => { l.answers[i] = v.slice(0, ANSWER_MAX); }, false); },
      }, live.answers[i]),
      h('p', { class: 'm-0 text-caption text-muted' }, it('run.writeFirst')),
      h('div', { class: 'flex flex-wrap gap-2' }, go,
        h('button', { type: 'button', class: cls.cx(cls.BTN_GHOST, 'px-4 py-2'), 'data-ek': 'iv-skip', onclick: () => update((l) => { l.shown[i] = true; l.skipped[i] = true; }) }, it('run.skip'))));
  };
  const reveal = (): HTMLElement => h('div', { class: 'flex flex-col gap-4' },
    h('div', { class: 'grid gap-4 lg:grid-cols-2' },
      h('div', { class: 'flex flex-col gap-2' }, h('h3', { class: 'm-0 text-body font-bold' }, it('run.yours')),
        live.skipped[i] && !live.answers[i].trim() ? h('p', { class: 'm-0 text-muted' }, it('run.skipped'))
          : h('p', { class: 'm-0 whitespace-pre-wrap rounded-(--r-inset) bg-panel p-3 ring-1 ring-line' }, live.answers[i])),
      h('div', { class: 'flex flex-col gap-2 rounded-(--r-inset) bg-surface-2 p-3' }, h('h3', { class: 'm-0 text-body font-bold' }, it('run.model')),
        h('p', { class: 'm-0' }, ...rich(q.answer[lang()])),
        q.tradeoffs.length ? h('div', {}, h('h4', { class: 'm-0 text-body-sm font-bold' }, it('run.tradeoffs')),
          h('ul', { class: 'm-0 mt-1 list-disc space-y-1 pl-5 text-body-sm' }, ...q.tradeoffs.map((x) => h('li', {}, ...rich(x[lang()]))))) : null,
        q.doc ? h('p', { class: 'm-0 text-body-sm' }, ext(q.doc, it('docs'))) : null)),
    h('fieldset', { class: 'm-0 flex flex-col gap-2 rounded-(--r-inset) p-3 ring-1 ring-line' },
      h('legend', { class: 'px-1 font-bold' }, it('run.rubric')),
      ...q.rubric.map((r, k) => h('label', { class: 'flex min-h-6 cursor-pointer items-start gap-2' },
        h('input', { type: 'checkbox', class: 'mt-1', checked: ticked.has(k), 'data-ek': `iv-tick-${k}`, onchange: (e: Event) => update((l) => {
          const on = (e.target as HTMLInputElement).checked;
          l.ticks[i] = on ? [...new Set([...l.ticks[i], k])] : l.ticks[i].filter((x) => x !== k);
        }) }), h('span', {}, r[lang()]))),
      h('p', { class: 'm-0 text-body-sm font-semibold', role: 'status' }, it('run.score', { k: ticked.size, n: total }))),
    h('div', { class: 'flex flex-wrap justify-end gap-2' }, h('button', {
      type: 'button', class: cls.cx(cls.BTN_GO, 'px-5 py-2'), 'data-ek': 'iv-next',
      onclick: () => (i + 1 < n ? update((l) => { l.i = i + 1; }) : finish(set)),
    }, it(i + 1 < n ? 'run.next' : 'run.finish'))));
  return h('div', { class: 'flex flex-col gap-4', 'data-iv-run': set },
    top, note,
    h('article', { class: cls.cx(cls.CARD, 'flex flex-col gap-4 p-5 max-sm:p-4'), 'aria-labelledby': 'iv-q' },
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm' }, chip(it(`kind.${q.kind}`)), set === 'again' ? chip(NAME[q.engine]) : null),
      h('h2', { id: 'iv-q', class: 'm-0 text-title font-bold' }, ...rich(q.q[lang()])),
      ...q.exhibits.map((x, k) => exhibitView(q, x, k, live.timer)),
      shown ? reveal() : answerBox()));
}

function finish(set: string): void {
  const p = prefs();
  const live = p.live[set];
  if (!live) return;
  let score = 0;
  let total = 0;
  const weak: string[] = [];
  live.qs.forEach((id, k) => {
    const q = questionOf(id);
    if (!q) return;
    const t = new Set(live.ticks[k]).size;
    score += t;
    total += q.rubric.length;
    if (shareOf(live.ticks[k], q.rubric.length) < PASS) {
      weak.push(id);
      p.again[id] = dayPlus(today(), set === 'again' ? 3 : 1); // design-v27 Q9: tomorrow, then 3 days
    } else delete p.again[id];
  });
  const skipped = live.skipped.filter(Boolean).length;
  if (set !== 'again') p.results[set] = { at: new Date().toISOString(), score, total, ms: Math.round(live.ms), skipped };
  delete p.live[set];
  save(p);
  stopClock();
  lastDone = { set, score, total, ms: live.ms, weak };
  d.announce(it('done.score', { k: score, n: total }));
  d.rerender();
}

// ---- exhibits (design-v27 §2.3: a source chip that says how true the text is)

const reruns = new Map<string, 'busy' | { text: string } | { error: string }>();
let lab: PgLabClient | undefined;
async function rerun(bank: Bank, x: Exhibit, key: string): Promise<void> {
  const s = exhibitScript(bank, x);
  if (!s) return;
  reruns.set(key, 'busy');
  d.rerender();
  try {
    const { PgLabClient } = await import('../engine/pglab/client');
    lab ??= new PgLabClient();
    const r = await lab.run({ setup: s.setup, steps: [s.sql], timeoutMs: 30_000 });
    const st: StepResult | undefined = r.steps[0];
    reruns.set(key, r.setupError ? { error: r.setupError.message } : st && st.status === 'ok' ? { text: st.rows.map((row) => String(row[0])).join('\n') } : { error: st?.error?.message ?? '?' });
  } catch (e) {
    reruns.set(key, { error: e instanceof Error ? e.name : String(e) });
  }
  d.rerender();
}

function exhibitView(q: IvQuestion, x: Exhibit, k: number, timed: boolean): HTMLElement {
  const { h, cls } = d;
  const key = `${q.id}-${k}`;
  const bank = banks.get(q.engine) as Bank;
  const runnable = !!exhibitScript(bank, x);
  const state = reruns.get(key);
  const chipOf = x.source === 'pglite-0.5.16' ? chip(it('src.pglite'), 'bg-good-soft text-ink') : x.source === 'mongodb-docs' ? chip(it('src.docs'), 'bg-info-soft text-ink')
    : x.source === 'aws-rules' ? chip(it('src.aws'), 'bg-info-soft text-ink') : chip(it('src.illus'), 'bg-warn-soft text-ink');
  return h('figure', { class: 'm-0 flex flex-col gap-2' },
    h('figcaption', { class: 'flex flex-wrap items-center gap-2 text-body-sm font-bold' }, h('span', {}, ...rich(x.label[lang()])), chipOf),
    h('pre', { class: 'sql m-0 overflow-x-auto' }, x.shown),
    x.source === 'mongodb-docs' && x.url ? h('p', { class: 'm-0 text-body-sm' }, ext(x.url, it('src.docsLink'))) : null,
    x.calc?.length ? h('table', { class: 'w-fit text-body-sm' }, h('caption', { class: 'text-left font-bold' }, it('calc.title')),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col', class: 'pr-4 text-left' }, it('calc.expr')), h('th', { scope: 'col', class: 'text-left' }, it('calc.result')))),
      h('tbody', {}, ...x.calc.map((c) => h('tr', {}, h('td', { class: 'pr-4' }, h('code', {}, c.expr)), h('td', { class: 'tabular-nums' }, String(c.expect)))))) : null,
    runnable && !timed ? h('div', { class: 'flex flex-col gap-2' },
      h('div', {}, h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), disabled: state === 'busy', 'data-ek': `iv-rerun-${k}`, onclick: () => void rerun(bank, x, key) },
        state === 'busy' ? it('rerun.busy') : it('rerun'))),
      state && state !== 'busy' ? ('text' in state
        ? h('div', { class: 'flex flex-col gap-1', role: 'status' }, h('p', { class: cls.cx('m-0 text-body-sm font-semibold', state.text.trim() === x.shown.trim() ? 'good' : 'warn') },
          state.text.trim() === x.shown.trim() ? it('rerun.same') : it('rerun.diff')),
        state.text.trim() === x.shown.trim() ? null : h('pre', { class: 'sql m-0 overflow-x-auto' }, state.text))
        : h('p', { class: 'm-0 text-body-sm bad', role: 'status' }, it('rerun.failed', { e: state.error }))) : null) : null);
}

// ---- a take-home (design-v27 §2.4): drafts per deliverable, then the model answer and a rubric you tick

const thRuns = new Map<string, 'busy' | StepResult | { error: string }>();
async function runQuery(bank: Bank, th: TakeHome, k: number): Promise<void> {
  const key = `${th.id}-${k}`;
  thRuns.set(key, 'busy');
  d.rerender();
  try {
    const { PgLabClient } = await import('../engine/pglab/client');
    lab ??= new PgLabClient();
    const r = await lab.run({ setup: bank.fixtures[th.fixture!], steps: [th.queries[k]], timeoutMs: 30_000 });
    thRuns.set(key, r.setupError ? { error: r.setupError.message } : r.steps[0] ?? { error: '?' });
  } catch (e) {
    thRuns.set(key, { error: e instanceof Error ? e.name : String(e) });
  }
  d.rerender();
}

function takeHomePage(id: string): HTMLElement {
  const { h, cls } = d;
  const e = engineOfId(id)!;
  const b = bankOf(e);
  if (b === 'loading') return loading();
  if (b === 'failed') return failed(e);
  stopClock();
  const th = b.takeHomes.find((x) => x.id === id);
  const back = h('a', { href: d.engineInterviewHash(), class: cls.cx(cls.BTN_GHOST, 'inline-flex px-4 py-2 no-underline') }, it('back'));
  if (!th) return h('div', { class: 'flex flex-col items-start gap-4' }, h('p', { class: 'm-0' }, it('th.missing')), back);
  const p = prefs();
  const mine = p.th[id] ?? { drafts: [] };
  const write = (f: (x: typeof mine) => void, redraw: boolean): void => {
    const q = prefs();
    const x = q.th[id] ?? { drafts: [] };
    f(x);
    q.th[id] = x;
    save(q);
    if (redraw) d.rerender();
  };
  const submit = h('button', {
    type: 'button', class: cls.cx(cls.BTN_GO, 'px-5 py-2'), 'data-ek': 'iv-th-submit', disabled: !mine.drafts.some((x) => x.trim()),
    onclick: () => write((x) => { x.at = new Date().toISOString(); x.ticks ??= []; }, true),
  }, it('th.submit'));
  return h('div', { class: 'flex flex-col gap-6' },
    h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm' }, chip(it('th')), chip(bandName(th.band)), chip(NAME[th.engine])),
    card(h('h2', { class: 'm-0 text-title font-bold' }, it('th.brief')), h('p', { class: 'm-0' }, ...rich(th.brief[lang()])), th.doc ? h('p', { class: 'm-0 text-body-sm' }, ext(th.doc, it('docs'))) : null),
    th.fixture && th.queries.length ? card(h('h2', { class: 'm-0 text-title font-bold' }, it('th.data')),
      h('p', { class: 'm-0 text-body-sm text-muted' }, it('th.dataLine', { f: th.fixture })),
      ...th.queries.map((sql, k) => {
        const st = thRuns.get(`${th.id}-${k}`);
        return h('div', { class: 'flex flex-col gap-2' }, h('pre', { class: 'sql m-0 overflow-x-auto' }, sql),
          h('div', {}, h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), disabled: st === 'busy', 'data-ek': `iv-th-run-${k}`, onclick: () => void runQuery(b, th, k) }, st === 'busy' ? it('rerun.busy') : it('th.run'))),
          st && st !== 'busy' ? ('error' in st && !('rows' in st) ? h('p', { class: 'm-0 text-body-sm bad', role: 'status' }, it('rerun.failed', { e: st.error }))
            : (st as StepResult).status === 'ok' ? d.renderResult(st as StepResult) : h('p', { class: 'm-0 text-body-sm bad', role: 'status' }, it('rerun.failed', { e: (st as StepResult).error?.message ?? '?' }))) : null);
      }),
      h('p', { class: 'm-0 text-caption text-muted' }, it('th.dataNote'))) : null,
    card(h('h2', { class: 'm-0 text-title font-bold' }, it('th.deliver')),
      ...th.deliverables.map((x, k) => h('div', { class: 'flex flex-col gap-1' },
        h('label', { for: `iv-th-${k}`, class: 'font-semibold' }, `${k + 1}. `, ...rich(x[lang()])),
        h('textarea', {
          id: `iv-th-${k}`, rows: '6', maxlength: String(DRAFT_MAX), 'data-ek': `iv-th-${k}`, class: 'w-full rounded-(--r-ctl) bg-panel p-3 ring-1 ring-line-strong',
          oninput: (ev: Event) => {
            const v = (ev.target as HTMLTextAreaElement).value.slice(0, DRAFT_MAX);
            write((y) => { while (y.drafts.length < th.deliverables.length) y.drafts.push(''); y.drafts[k] = v; }, false);
            submit.toggleAttribute('disabled', !prefs().th[id]?.drafts.some((z) => z.trim()));
          },
        }, mine.drafts[k] ?? ''))),
      mine.at ? null : h('div', {}, submit)),
    mine.at ? card(h('h2', { class: 'm-0 text-title font-bold' }, it('th.model')),
      h('p', { class: 'm-0 rounded-(--r-inset) bg-surface-2 p-3' }, ...rich(th.model[lang()])),
      h('fieldset', { class: 'm-0 flex flex-col gap-2 rounded-(--r-inset) p-3 ring-1 ring-line' }, h('legend', { class: 'px-1 font-bold' }, it('run.rubric')),
        ...th.rubric.map((r, k) => h('label', { class: 'flex min-h-6 cursor-pointer items-start gap-2' },
          h('input', { type: 'checkbox', class: 'mt-1', checked: !!mine.ticks?.includes(k), 'data-ek': `iv-th-tick-${k}`, onchange: (ev: Event) => write((y) => {
            const on = (ev.target as HTMLInputElement).checked;
            y.ticks = on ? [...new Set([...(y.ticks ?? []), k])] : (y.ticks ?? []).filter((z) => z !== k);
          }, true) }), h('span', {}, r[lang()]))),
        h('p', { class: 'm-0 text-body-sm font-semibold', role: 'status' }, it('run.score', { k: new Set(mine.ticks).size, n: th.rubric.length }))),
      h('p', { class: 'm-0 text-body-sm text-muted' }, it('done.honest'))) : null,
    h('div', {}, back));
}
