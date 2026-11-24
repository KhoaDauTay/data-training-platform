import type { LabOutput, LabVerdict } from '../engine/labs';
import type * as I18n from '../i18n';
import type { EngineKey } from '../i18n/engine';
import type { EngineDeps } from './engineView';

/**
 * MongoDB path ("Lộ trình NoSQL", L248): 12 parts of skills on one shared dataset, each a short lesson and 4 drills. Its own
 * lazy chunk since the Engine redesign (L280, budget `engineuiPath`), loaded by engineView on the first path page; it gets
 * the Engine UI's helpers through PathCtx and imports nothing but types from it.
 */
export interface PathCtx {
  d: EngineDeps;
  et(key: EngineKey, params?: I18n.Params): string;
  inline(text: string): (Node | string)[];
  prose(text: string): HTMLElement;
  tick(on: boolean): Node | null;
  verdictLine(x: LabVerdict): string;
  codeBox(key: string, value: string, label: string, sql: boolean, on: { change(v: string): void; run(): void; submit(): void }): HTMLElement;
  done(): Set<string>;
  leadDisc(state: 'done' | 'current' | 'todo', inner: Node | string): HTMLElement;
  rowLink(href: string, text: string, main: boolean): HTMLElement;
}

type PathChunk = typeof import('../engineMongoPath');
type MongoRunnerMod = typeof import('../engine/mongo/runner');
type Drill = PathChunk['path']['drills'][number];
let pathMod: PathChunk | 'loading' | 'failed' | undefined;
let mongo: Promise<ReturnType<MongoRunnerMod['mongoRunner']>> | undefined;
let c: PathCtx;
const PATH_LAB = { setup: 'path', steps: [] };
/** Drill XP on the first pass, like a General drill (L248). */
const PATH_XP = 10;
const slugOf = (skill: string): string => skill.replace(/^mg\./, '').replace(/_/g, '-');
const lang = (): 'vi' | 'en' => c.d.getLang();

function pathChunk(): PathChunk | 'loading' | 'failed' {
  if (pathMod === undefined) {
    pathMod = 'loading';
    import('../engineMongoPath').then((m) => { pathMod = m; }, () => { pathMod = 'failed'; }).finally(() => c.d.rerender());
  }
  return pathMod;
}
const mongoRunner = (): Promise<ReturnType<MongoRunnerMod['mongoRunner']>> =>
  (mongo ??= import('../engine/mongo/runner').then((m) => m.mongoRunner(c.d.lab)).catch((e: unknown) => { mongo = undefined; throw e; }));

/** The h1 of a skill page (main's trail asks; undefined until the path content is in). */
export function skillTitle(slug: string, l: 'vi' | 'en'): string | undefined {
  return pathMod && pathMod !== 'loading' && pathMod !== 'failed' ? pathMod.path.skills.find((x) => slugOf(x.id) === slug)?.label[l] : undefined;
}

/** `#/engine/mongodb/path[/<skill>]`; the drawn page carries `data-drawn` (engineView then names it #engine-page). */
export function pathPage(ctx: PathCtx, slug: string): HTMLElement {
  c = ctx;
  const { d, et } = c;
  const { h } = d;
  const m = pathChunk();
  if (m === 'loading') return h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, d.loader(), d.t('engine.loading'));
  if (m === 'failed') return h('div', { role: 'alert', class: 'flex flex-col gap-2' }, h('p', { class: 'm-0' }, d.t('engine.failed')),
    h('button', { type: 'button', onclick: () => { pathMod = undefined; d.rerender(); } }, d.t('data.retry')));
  const { path } = m;
  const ok = c.done();
  const skill = path.skills.find((x) => slugOf(x.id) === slug);
  const page = skill ? skillPage(m, skill, ok) : h('div', { class: 'flex flex-col gap-8' },
    h('p', { class: 'm-0 text-muted' }, et('path.intro', { n: path.manifest.parts.length })),
    ...path.manifest.parts.map((p) => h('section', { class: 'flex flex-col gap-3', 'aria-labelledby': `part-${p.n}` },
      h('h2', { id: `part-${p.n}`, class: d.ui.GROUP_TITLE }, `${et('path.part', { n: p.n })} · ${p.title[lang()]}`),
      h('ul', { class: d.ui.LIST }, ...path.skills.filter((x) => x.part === p.n).map((x) => {
        const drills = path.drills.filter((dr) => dr.skill === x.id);
        const k = drills.filter((dr) => ok.has(dr.id)).length;
        const all = drills.length > 0 && k === drills.length;
        return d.ui.listRow({
          lead: c.leadDisc(all ? 'done' : 'todo', d.icon('nosqlPath', 'size-5')), title: x.label[lang()], sub: et('path.skillDone', { k, n: drills.length }),
          action: c.rowLink(d.enginePathHash(slugOf(x.id)), et('row.open'), false),
        });
      })))));
  page.dataset.drawn = '';
  return page;
}

function skillPage(m: PathChunk, skill: PathChunk['path']['skills'][number], ok: Set<string>): HTMLElement {
  const { d, et, prose } = c;
  const { h, cls } = d;
  const lesson = m.path.lessons.find((x) => x.id === skill.id);
  const drills = m.path.drills.filter((x) => x.skill === skill.id);
  const code = (s: string | undefined): HTMLElement | null => (s ? h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en' }, s) : null);
  const block = (title: EngineKey, ...kids: (Node | null)[]): HTMLElement =>
    h('section', { class: cls.cx(cls.CARD, 'flex flex-col gap-3 p-5 max-sm:p-4') }, h('h2', { class: 'm-0 text-title font-bold' }, et(title)), ...kids);
  return h('article', { class: 'flex flex-col gap-6', 'aria-labelledby': 'home-title', 'data-skill': skill.id },
    h('p', { class: 'm-0 text-body-sm text-muted' }, et('path.part', { n: skill.part })),
    lesson?.concept ? block('path.concept', prose(lesson.concept[lang()])) : null,
    lesson?.example ? block('path.example', code(lesson.example), lesson.explain ? prose(lesson.explain[lang()]) : null) : null,
    lesson?.mistake?.query ? block('path.mistake', code(lesson.mistake.query), lesson.mistake[lang()] ? prose(lesson.mistake[lang()]!) : null) : null,
    h('section', { class: 'flex flex-col gap-4', 'aria-labelledby': 'path-drills' },
      h('h2', { id: 'path-drills', class: 'm-0 flex items-center gap-2 text-title font-bold' }, d.icon('kindLab', 'size-5 text-accent'), et('path.drills')),
      h('ol', { class: 'm-0 list-none space-y-4 p-0' }, ...drills.map((dr, i) => drillCard(m, dr, i, ok)))));
}

interface DrillVisit { code?: string; pick?: number; out?: { result: LabOutput } | { error: unknown }; msg?: { ok: boolean; text: string }; busy?: boolean }
const drillVisits = new Map<string, DrillVisit>();
const drillVisit = (id: string): DrillVisit => {
  let v = drillVisits.get(id);
  if (!v) drillVisits.set(id, (v = {}));
  return v;
};

function drillCard(m: PathChunk, dr: Drill, i: number, ok: Set<string>): HTMLElement {
  const { d, et, inline } = c;
  const { h, cls } = d;
  const v = drillVisit(dr.id);
  const kind = (['faded', 'open', 'trap', 'review'] as const).find((k) => k === dr.kind);
  v.code ??= dr.starter ?? '';
  const status = h('p', { role: 'status', 'data-ek': `${dr.id}-status`, class: cls.cx('m-0 text-body-sm', v.msg ? (v.msg.ok ? 'good' : 'bad') : '') }, ...inline(v.msg?.text ?? ''));
  const choice = dr.format === 'choice';
  return h('li', { class: cls.cx(cls.CARD, 'flex flex-col gap-3 p-4 max-sm:p-3'), 'data-drill': dr.id },
    h('div', { class: 'flex items-start gap-3' }, c.leadDisc(ok.has(dr.id) ? 'done' : 'todo', String(i + 1)),
      h('div', { class: 'min-w-0 flex-1 flex flex-col gap-1' },
        h('h3', { class: 'm-0 text-caption font-bold tracking-wider text-muted uppercase' }, et('path.drill', { i: i + 1, kind: kind ? et(`path.kind.${kind}`) : dr.kind })),
        h('p', { class: 'm-0' }, ...inline(dr.task[lang()])))),
    dr.grade === 'esr' && dr.query ? h('div', { class: 'flex flex-col gap-1' }, h('p', { class: 'm-0 text-body-sm text-muted' }, ...inline(et('path.esr'))), h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en' }, dr.query)) : null,
    choice && dr.shown ? h('div', { class: 'flex flex-col gap-1' }, h('p', { class: 'm-0 text-body-sm text-muted' }, et('path.shown')), h('pre', { class: 'sql m-0 overflow-x-auto', lang: 'en' }, dr.shown)) : null,
    choice ? h('fieldset', { class: 'm-0 space-y-2 border-0 p-0' }, h('legend', { class: 'mb-1 p-0 text-body-sm font-semibold' }, et('path.choice')),
      ...(dr.options ?? []).map((o, j) => h('label', { class: 'flex min-h-11 cursor-pointer items-center gap-2 rounded-(--r-ctl) px-3 py-1 ring-1 ring-line hover:bg-accent-soft has-[:checked]:bg-accent-soft has-[:checked]:ring-2 has-[:checked]:ring-accent' },
        h('input', { type: 'radio', name: dr.id, value: String(j), checked: v.pick === j, 'data-ek': `${dr.id}-${j}`, onchange: () => { v.pick = j; } }),
        h('span', {}, ...inline(o[lang()])))))
      : c.codeBox(`${dr.id}-code`, v.code, et('lab.code', { i: i + 1 }), false, {
        change: (x) => { v.code = x; }, run: () => void drillAction(m, dr, false), submit: () => void drillAction(m, dr, true),
      }),
    h('div', { class: 'flex flex-wrap items-center gap-2' },
      choice || dr.grade === 'esr' ? null : h('button', { type: 'button', class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5'), 'data-ek': `${dr.id}-run`, disabled: !!v.busy, onclick: () => void drillAction(m, dr, false) }, et('lab.run')),
      h('button', { type: 'button', class: cls.cx(cls.BTN_GO, 'px-4 py-1.5 disabled:bg-code disabled:text-disabled disabled:shadow-none'), 'data-ek': `${dr.id}-submit`, disabled: !!v.busy, onclick: () => void drillAction(m, dr, true) }, choice ? et('check') : et('lab.submit')),
      v.busy ? h('span', { class: 'flex items-center gap-2 text-body-sm text-muted' }, d.loader(), et('lab.preparing')) : null),
    h('details', {}, h('summary', { class: 'cursor-pointer text-body-sm font-semibold text-accent' }, et('lab.hint')), h('p', { class: 'mt-2 mb-0 text-body-sm' }, ...inline(dr.hint[lang()]))),
    status,
    choice && v.msg?.ok && dr.why ? h('p', { class: 'm-0 rounded-(--r-inset) bg-surface-2 p-3 text-body-sm' }, ...inline(dr.why[lang()])) : null,
    v.out ? h('div', { class: 'overflow-x-auto' }, 'result' in v.out ? d.renderResult(v.out.result) : d.errorView(v.out.error)) : null);
}

/** Grades one path drill: a choice by its index, an ESR drill by the key order, the rest by result (+ the covered rule). */
async function drillVerdict(m: PathChunk, dr: Drill, code: string, v: DrillVisit): Promise<{ ok: boolean; text: string }> {
  const { et } = c;
  const tip = (w?: { vi: string; en: string }) => (w ? et('path.wrongTip', { tip: w[lang()] }) : undefined);
  if (dr.format === 'choice') {
    if (v.pick === undefined) return { ok: false, text: et('pick') };
    if (v.pick === dr.answer) return { ok: true, text: et('right') };
    return { ok: false, text: tip(dr.wrong?.find((w) => w.option === v.pick)) ?? et('wrong') };
  }
  if (dr.grade === 'esr') {
    if (m.followsEsr(dr.query!, code)) return { ok: true, text: et('lab.passed') };
    const flat = (x: string) => x.replace(/\s+/g, '');
    return { ok: false, text: tip(dr.wrong?.find((w) => w.query && flat(w.query) === flat(code))) ?? et('path.notEsr') };
  }
  const r = await mongoRunner();
  const step = { solution: dr.solution!, check: 'doc' as const, ordered: !!dr.ordered, task: dr.task, hint: dr.hint };
  const g = await r.check(PATH_LAB, step, code, { strictId: dr.grade === 'covered' });
  if (g.ok) {
    if (dr.grade === 'covered' && dr.index && !m.isCovered(code, dr.index)) return { ok: false, text: et('path.notCovered') };
    return { ok: true, text: c.verdictLine(g) };
  }
  if (g.reason === 'wrong') {
    for (const w of dr.wrong ?? []) {
      if (!w.query) continue;
      const same = await r.check(PATH_LAB, { ...step, solution: w.query }, code, { strictId: true }).catch(() => ({ ok: false }));
      if (same.ok) return { ok: false, text: tip(w)! };
    }
  }
  return { ok: false, text: c.verdictLine(g) };
}

async function drillAction(m: PathChunk, dr: Drill, submit: boolean): Promise<void> {
  const { d, et } = c;
  const v = drillVisit(dr.id);
  if (v.busy) return; // Mod-Enter in the editor while a run is going
  const code = (v.code ?? '').trim();
  if (dr.format !== 'choice' && !code) {
    v.msg = { ok: false, text: et('lab.empty') };
    d.rerender();
    return;
  }
  v.busy = true;
  v.msg = undefined;
  d.rerender();
  try {
    if (dr.format !== 'choice' && dr.grade !== 'esr') {
      try {
        v.out = { result: await (await mongoRunner()).run(PATH_LAB, code) };
      } catch (error) {
        v.out = { error };
      }
    }
    if (submit) {
      v.msg = await drillVerdict(m, dr, code, v);
      d.announce(v.msg.text);
      if (v.msg.ok && !c.done().has(dr.id)) {
        d.app.save.completed.push(dr.id);
        d.app.save.xp += PATH_XP;
        d.persist(true);
        d.announce(et('complete.xp', { xp: PATH_XP }));
      }
    }
  } catch (error) {
    v.out = { error };
  } finally {
    v.busy = false;
    d.rerender();
  }
}
