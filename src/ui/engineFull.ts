import { blocksOf, onPg, SECTIONS, type EngineId, type EngineLesson, type SectionId } from '../engine/content';
import { figureSlot } from '../engine/figureSlot';
import { DEMO_SECS, demoBlocks, demoSetup, errCode, pairOf, pgDemoOut, pgDemoScript, type DemoBlock, type DemoOut } from '../engine/demo';
import type { LabEnv, LabOutput, LabRunner } from '../engine/labs';
import { fullText, type FullKey } from '../i18n/engineFull';
import type { Params } from '../i18n';
import type { IconName } from './icons';
import type { EngineDeps } from './engineView';

/**
 * v30.1 (F01, L480; ux-route-v24 §5): an Engine lesson in the General full-lesson layout (src/ui/lessonPage.ts): the "In this
 * lesson" contents (a sticky column from 1280 px, else a closed card in the body, the same `data-lesson-page` / `data-fl-toc`
 * CSS), sections headed by an icon badge, and the "Ví dụ" / "Lỗi hay gặp" code blocks with Run on the lesson's own runtime
 * (src/engine/demo.ts: PostgreSQL on the lab runtime, MongoDB on mingo, DynamoDB on dynoxide). Runs are display only: 0 XP,
 * nothing saved, outputs live in this module for the session. Lazy chunk `engineFull` (its own budget group, engineui had no
 * room); like every engine chunk it imports only types from main modules and gets main values through EngineDeps.
 */
export interface FullCtx {
  d: EngineDeps;
  l: EngineLesson;
  lang: 'vi' | 'en';
  /** engineView's inline(): code spans, bold, term buttons when `marked`. */
  inline: (text: string, marked?: boolean) => (Node | string)[];
  /** LAB_RUNNERS[l.engine]; undefined = no runner here (the blocks stay read-only). */
  make?: (env: LabEnv) => Promise<LabRunner>;
  /** Engine numbers under a result (engineView's metaView: ScannedCount, documents examined…). */
  meta: (r: LabOutput) => HTMLElement | null;
  /** "k/n" lab steps passed and questions right, for the contents. */
  counts: { lab?: string; quiz?: string };
}

let c: FullCtx;
const ft = (key: FullKey, params?: Params): string => fullText(c.d.getLang(), c.d.locale(), key, params);
/** v38 (R2 E17): rows, documents or items, by the open lesson's engine. R3 (T3-C13-01, L596): EN says 1 row / document / item (VI has no plural). */
const unitOf = (e: EngineId, n: number): string => { const u = ft(`unit.${e}`); return n === 1 && c.d.getLang() === 'en' ? u.replace(/s$/, '') : u; };
const SEC_ICON: Record<SectionId, IconName> = {
  open: 'secOpen', idea: 'kindConcept', syntax: 'secSyntax', example: 'secRun', pitfalls: 'secPitfall', practice: 'secPractice', recap: 'secRecap',
};
const RT: Record<EngineId, string> = { postgres: 'PostgreSQL (PGlite)', design: 'PostgreSQL (PGlite)', stack: 'PostgreSQL (PGlite)', graph: 'PostgreSQL (PGlite)', mongodb: 'mingo', dynamodb: 'dynoxide' };
const TOC_ROW = 'flex min-h-11 w-full items-center gap-2 border-0 border-l-4 px-3 py-1.5 text-left text-body-sm hover:bg-accent-soft';
const TOC_IDLE = 'border-transparent bg-transparent text-ink';
const TOC_NOW = 'border-accent bg-accent-soft font-bold text-accent-ink';
const CHIP = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-body-sm font-bold';

/** Session state: each block's last output, by `<lesson>-x<i>` ('busy' while it runs). */
const outs = new Map<string, DemoOut | 'busy'>();
const runners = new Map<EngineId, Promise<LabRunner>>();
const keyOf = (l: EngineLesson, i: number): string => `${l.id}-x${i}`;
const ranOf = (l: EngineLesson, bs: DemoBlock[]): [number, number] => {
  const ex = bs.flatMap((b, i) => (b.sec === 'example' && b.runs ? [i] : []));
  return [ex.filter((i) => { const o = outs.get(keyOf(l, i)); return o && o !== 'busy'; }).length, ex.length];
};

/** Runs block `i` (with its WRONG/FIX partner) and redraws. PostgreSQL replays the blocks above it on one fresh database. */
async function run(x: FullCtx, bs: DemoBlock[], i: number): Promise<void> {
  const { l, d, make } = x;
  if (!make) return;
  const idx = pairOf(bs, i);
  const keys = idx.map((j) => keyOf(l, j));
  for (const k of keys) outs.set(k, 'busy');
  d.rerender();
  const setup = demoSetup(l);
  try {
    let r = runners.get(l.engine);
    if (!r) {
      r = make(d.lab);
      runners.set(l.engine, r);
      r.catch(() => runners.delete(l.engine)); // the next click retries
    }
    const rn = await r;
    if (onPg(l.engine)) {
      const { steps, span } = pgDemoScript(bs, idx[idx.length - 1]);
      const res = await rn.demo!(setup, steps);
      idx.forEach((j, n) => outs.set(keys[n], pgDemoOut(res, span[j])));
    } else {
      for (const [n, j] of idx.entries()) {
        try {
          outs.set(keys[n], { result: await rn.run({ setup, steps: [] }, bs[j].run) });
        } catch (error) {
          outs.set(keys[n], { error });
        }
      }
    }
  } catch (error) {
    // the lab runtime's own failures carry no text (src/engine/pglab/client.ts): say what happened
    const e = error as { name?: string; timeoutMs?: number; detail?: string };
    const shown = e?.name === 'LabTimeoutError' ? new Error(ft('run.timeout', { s: (e.timeoutMs ?? 0) / 1000 })) : e?.name === 'LabFailedError' ? new Error(ft('run.failed', { d: e.detail ?? '' })) : error;
    for (const k of keys) outs.set(k, { error: shown });
  }
  const o = outs.get(keyOf(l, i));
  if (o && o !== 'busy') d.announce('result' in o ? ft('run.rows', { n: o.result.rows.length, ms: Math.round(o.result.ms ?? 0), u: unitOf(l.engine, o.result.rows.length) }) : bs[i].error && errCode(o.error) === bs[i].error ? ft('run.expected', { code: bs[i].error!, rt: RT[l.engine] }) : '');
  d.rerender();
}

/** A block's output: rows (≤ 5) and the engine's numbers, the expected error as the teaching point, or the error. */
function outView(b: DemoBlock, o: DemoOut | 'busy' | undefined): (Node | null)[] {
  const d = c.d;
  const { h } = d;
  if (!o) return [];
  if (o === 'busy') return [h('p', { class: 'm-0 flex items-center gap-2 text-body-sm text-muted' }, d.loader(), ft('run.busy'))];
  const line = (ok: boolean, text: string): HTMLElement => h('p', { role: 'status', class: d.cls.cx('m-0 flex items-center gap-1.5 text-body-sm font-semibold', ok ? 'text-good' : 'text-bad') },
    ok ? d.icon('check', 'size-4') : null, text);
  if ('result' in o) {
    const r = o.result;
    // R2 E07 (L578d): a WRONG block that runs is still the wrong way: no green check, the line says so (every engine)
    const rows = { n: r.rows.length, ms: Math.round(r.ms ?? 0), u: unitOf(c.l.engine, r.rows.length) };
    return [b.error ? line(false, ft('run.unexpected', { code: b.error })) : b.mark === 'wrong' ? line(false, ft('run.rowsWrong', rows)) : line(true, ft('run.rows', rows)),
      h('div', { class: 'overflow-x-auto', tabindex: '0' }, d.renderResult(r, undefined, 5, ft('run.caption', rows), c.l.engine === 'stack' ? { empty: false } : undefined)), c.meta(r)];
  }
  const got = errCode(o.error);
  return [b.error && got === b.error ? line(true, ft('run.expected', { code: got, rt: RT[c.l.engine] })) : null,
    h('div', { role: b.error && got === b.error ? false : 'status' }, d.errorView(o.error, false))];
}

/** A runnable block: its marker chip, Run, the code as written, then its output. */
function demoView(bs: DemoBlock[], i: number): HTMLElement {
  const { h, cls } = c.d;
  const b = bs[i];
  const x = c;
  const o = outs.get(keyOf(c.l, i));
  const chip = b.mark === 'error' ? h('span', { class: cls.cx(CHIP, 'bg-bad-soft text-bad') }, ft('run.chipError', { code: b.error ?? '' }))
    : b.mark === 'wrong' ? h('span', { class: cls.cx(CHIP, 'bg-bad-soft text-bad') }, ft('run.chipWrong'))
      : b.mark === 'fix' ? h('span', { class: cls.cx(CHIP, 'bg-good-soft text-good') }, ft('run.chipFix')) : null;
  return h('div', { class: cls.cx(cls.CARD, 'flex min-w-0 flex-col gap-2 p-3'), 'data-demo': String(i) },
    h('div', { class: 'flex flex-wrap items-center gap-2' }, chip,
      !b.runs ? h('span', { class: 'ml-auto text-body-sm text-muted' }, ft('run.shownOnly')) : c.make ? h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'ml-auto inline-flex min-h-6 items-center gap-1 px-3 py-1'), 'data-ek': `${keyOf(c.l, i)}-run`,
        'aria-disabled': o === 'busy' ? 'true' : false, onclick: () => { if (outs.get(keyOf(x.l, i)) !== 'busy') void run(x, bs, i); } }, c.d.icon('run', 'size-4'), ft(b.mark === 'wrong' ? 'run.wrong' : b.mark === 'fix' ? 'run.fix' : 'run.run')) : null),
    h('pre', { tabindex: '0', class: 'sql m-0 overflow-x-auto', lang: 'en' }, b.code),
    ...outView(b, o).filter((n): n is Node => !!n));
}

const head = (id: string, icon: IconName, name: string, aside?: Node | null): HTMLElement => c.d.h('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
  c.d.h('h2', { id, class: 'm-0 flex items-center gap-2 text-title font-bold', tabindex: '-1' },
    c.d.h('span', { class: 'grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent', 'aria-hidden': 'true' }, c.d.icon(icon, 'size-5')), name), aside ?? null);

/** The body sections `keep` selects, in file order, each with its icon heading; example/pitfall code blocks get Run. */
export function sections(x: FullCtx, keep: (id: SectionId) => boolean): HTMLElement[] {
  c = x;
  const { h } = c.d;
  const l = c.l;
  const bs = demoBlocks(l, c.lang);
  const start: Partial<Record<SectionId, number>> = {};
  let k = 0;
  for (const s of l.sections) if (DEMO_SECS.includes(s.id)) { start[s.id] = k; k += blocksOf(s.text[c.lang]).filter((b) => b.kind === 'code').length; }
  const [ran, n] = ranOf(l, bs);
  return l.sections.filter((s) => keep(s.id)).map((s) => {
    let j = start[s.id] ?? 0;
    const live = !!c.make && DEMO_SECS.includes(s.id);
    return h('section', { id: `ek-${s.id}`, 'data-sec': s.id, class: 'flex scroll-mt-4 flex-col gap-3', 'aria-labelledby': `ek-${s.id}-h` },
      head(`ek-${s.id}-h`, SEC_ICON[s.id], SECTIONS[s.id][c.lang === 'vi' ? 0 : 1],
        s.id === 'example' && n && c.make ? h('span', { class: 'text-body-sm text-muted tabular-nums' }, ft('run.ran', { k: ran, n })) : null),
      s.id === 'example' && n && c.make ? h('p', { class: 'm-0 text-body-sm text-muted' }, ft('run.note', { rt: RT[l.engine] })) : null,
      ...blocksOf(s.text[c.lang]).map((b) => b.kind === 'p' ? h('p', { class: 'm-0' }, ...c.inline(b.text, true))
        : b.kind === 'ul' ? h('ul', { class: 'm-0 list-disc space-y-1 pl-5' }, ...b.items.map((t) => h('li', {}, ...c.inline(t, true))))
          // v38 (R2 E10): a marked block that cannot run here (```text) still gets its Sai/Sửa card, without Run
          : live && (bs[j]?.runs || bs[j]?.mark) ? demoView(bs, j++) : (live && j++, h('pre', { tabindex: '0', class: 'sql m-0 overflow-x-auto', lang: 'en' }, b.code))),
      // v39 (P4, L605): the lesson's figures for this section, at its end
      ...(l.figures ?? []).filter((f) => f.at === s.id).map((f) => figureSlot(`${l.id}|${f.name}|${f.at}`, f, c.d.viz, FIG_ENGINE[l.engine])));
  });
}
const FIG_ENGINE: Record<EngineId, string> = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy', design: 'ds', stack: 'st', graph: 'gr' };

interface Item { key: string; icon: IconName; name: string; target: string; count?: string }
function itemsOf(): Item[] {
  const { l } = c;
  const li = c.lang === 'vi' ? 0 : 1;
  const has = (id: SectionId): boolean => l.sections.some((s) => s.id === id);
  const [ran, n] = ranOf(l, demoBlocks(l, c.lang));
  const sec = (id: SectionId): Item => ({ key: id, icon: SEC_ICON[id], name: SECTIONS[id][li], target: `ek-${id}-h`,
    count: id === 'example' && n && c.make ? `${ran}/${n}` : id === 'practice' ? c.counts.lab : undefined });
  return [
    ...l.sections.filter((s) => s.id !== 'recap').map((s) => sec(s.id)),
    ...(l.predict ? [{ key: 'predict', icon: 'kindPredict' as const, name: ft('toc.predict'), target: `${l.id}-pred` }] : []),
    ...(l.lab && !has('practice') ? [{ key: 'lab', icon: 'secPractice' as const, name: ft('toc.lab'), target: `${l.id}-lab`, count: c.counts.lab }] : []),
    ...(l.quiz?.length ? [{ key: 'quiz', icon: 'kindQuiz' as const, name: ft('toc.quiz'), target: `${l.id}-quiz`, count: c.counts.quiz }] : []),
    ...(has('recap') ? [sec('recap')] : []),
  ];
}

let current: { id: string; key: string } | undefined;
let observer: IntersectionObserver | undefined;
function setCurrent(key: string): void {
  if (current) current.key = key;
  for (const b of document.querySelectorAll<HTMLElement>('[data-lesson-page] [data-toc]')) {
    const on = b.dataset.toc === key;
    if (on) b.setAttribute('aria-current', 'location');
    else b.removeAttribute('aria-current');
    for (const x of TOC_NOW.split(' ')) b.classList.toggle(x, on);
    for (const x of TOC_IDLE.split(' ')) b.classList.toggle(x, !on);
  }
}
function tocList(items: Item[]): HTMLElement {
  const { h, cls } = c.d;
  const reduced = c.d.reducedMotion();
  return h('ul', { class: 'm-0 flex list-none flex-col p-0' }, ...items.map((it) => h('li', {},
    h('button', { type: 'button', 'data-toc': it.key, 'aria-current': it.key === current?.key ? 'location' : false, class: cls.cx(TOC_ROW, it.key === current?.key ? TOC_NOW : TOC_IDLE),
      onclick: () => {
        const el = document.getElementById(it.target);
        el?.closest('section')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        if (el && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el?.focus({ preventScroll: true });
      } },
    c.d.icon(it.icon, 'size-4 shrink-0 text-muted'), h('span', { class: 'flex-1' }, it.name),
    it.count ? h('span', { class: 'text-caption text-muted tabular-nums' }, it.count) : null))));
}

/**
 * The page: the article (its header first) gains the in-body contents card; beside it the sticky contents column. The
 * wrapper carries `data-lesson` (engineView makes it #engine-page) and `data-lesson-page` (the full-lesson grid CSS).
 */
export function wrap(x: FullCtx, article: HTMLElement): HTMLElement {
  c = x;
  const { h, cls } = c.d;
  const items = itemsOf();
  if (current?.id !== c.l.id) current = { id: c.l.id, key: items[0]?.key ?? '' };
  article.firstElementChild?.after(h('details', { class: cls.CARD, 'data-fl-toc': '' },
    h('summary', { class: 'flex min-h-11 cursor-pointer items-center gap-2 px-4 font-semibold' }, c.d.icon('toc', 'size-5 text-accent'), ft('toc.count', { n: items.length })),
    h('nav', { class: 'py-2', 'aria-label': ft('toc.body') }, tocList(items))));
  const aside = h('aside', { class: 'hidden' },
    h('nav', { class: 'sticky top-0 flex flex-col gap-2 pt-4', 'aria-label': ft('toc.title') },
      h('p', { class: 'm-0 flex items-center gap-2 px-3 text-caption font-bold tracking-wider text-muted uppercase' }, c.d.icon('toc', 'size-4'), ft('toc.title')),
      tocList(items)));
  const page = h('div', { class: 'grid gap-8', 'data-lesson': c.l.id, 'data-lesson-page': c.l.id }, article, aside);
  requestAnimationFrame(() => {
    if (!page.isConnected) return;
    observer?.disconnect();
    if (typeof IntersectionObserver !== 'function') return;
    const byEl = new Map<Element, string>();
    for (const it of items) { const s = document.getElementById(it.target)?.closest('section'); if (s) byEl.set(s, it.key); }
    observer = new IntersectionObserver((es) => {
      const top = es.find((e) => e.isIntersecting);
      if (top) setCurrent(byEl.get(top.target)!);
    }, { rootMargin: '0px 0px -75% 0px' });
    for (const el of byEl.keys()) observer.observe(el);
  });
  return page;
}
